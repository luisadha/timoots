/*!
 * Inti parsing & perbandingan daftar followers/following.
 * Dipakai di browser (window.MutualCore) dan di Node (require) untuk pengujian.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MutualCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const USERNAME_RE = /^[a-z0-9._]{1,30}$/;
  // Mendukung threads.net/@user, threads.com/@user, instagram.com/user dan instagram.com/_u/user
  const URL_RE = /(?:threads\.(?:net|com)|instagram\.com)\/(?:_u\/)?@?([A-Za-z0-9._]+)/i;

  function fromUrl(url) {
    const m = String(url == null ? '' : url).match(URL_RE);
    return m ? m[1] : null;
  }

  function normalize(raw) {
    return String(raw == null ? '' : raw)
      .trim()
      .replace(/^@/, '')
      .replace(/[/?#].*$/, '')
      .toLowerCase();
  }

  function addFirstValid(out, candidates) {
    for (const c of candidates) {
      const name = normalize(c);
      if (USERNAME_RE.test(name)) {
        out.add(name);
        return;
      }
    }
  }

  function fromJson(node, out) {
    if (Array.isArray(node)) {
      node.forEach((n) => fromJson(n, out));
      return;
    }
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node.string_list_data)) {
      for (const item of node.string_list_data) {
        addFirstValid(out, [item && item.value, item && fromUrl(item.href), node.title]);
      }
      return;
    }
    if (typeof node.username === 'string') addFirstValid(out, [node.username]);
    for (const v of Object.values(node)) {
      if (v && typeof v === 'object') fromJson(v, out);
    }
  }

  function fromHtml(text, out) {
    const re = /href\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(text))) addFirstValid(out, [fromUrl(m[1])]);
  }

  function fromText(text, out) {
    text.split(/\r?\n/).forEach((line, i) => {
      const token = line.trim().split(/[\s,;]+/)[0];
      if (!token) return;
      if (i === 0 && /^usernames?$/i.test(token)) return; // header CSV
      addFirstValid(out, [fromUrl(token), token]);
    });
  }

  /** Mengembalikan Set username (huruf kecil) dari isi file. */
  function parseContent(fileName, rawText) {
    const out = new Set();
    const text = String(rawText || '').replace(/^﻿/, '');
    const trimmed = text.trim();
    const ext = ((String(fileName || '').match(/\.([a-z0-9]+)$/i) || [])[1] || '').toLowerCase();

    if (ext === 'json' || /^[[{]/.test(trimmed)) {
      try {
        fromJson(JSON.parse(trimmed), out);
        return out;
      } catch (err) {
        if (ext === 'json') throw new Error(`${fileName}: file JSON tidak valid.`);
      }
    }
    if (ext === 'html' || ext === 'htm' || /<a\s/i.test(trimmed)) {
      fromHtml(text, out);
      return out;
    }
    fromText(text, out);
    return out;
  }

  function compare(followers, following) {
    const mutual = [];
    const notFollowingBack = [];
    const fans = [];
    for (const u of following) (followers.has(u) ? mutual : notFollowingBack).push(u);
    for (const u of followers) if (!following.has(u)) fans.push(u);
    return { mutual: mutual.sort(), notFollowingBack: notFollowingBack.sort(), fans: fans.sort() };
  }

  function toCsv(list) {
    return 'username\n' + list.join('\n') + (list.length ? '\n' : '');
  }

  return { parseContent, compare, toCsv, normalize };
});
