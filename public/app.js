(() => {
  'use strict';

  const Core = window.MutualCore;
  const MAX_FILE_BYTES = 50 * 1024 * 1024;
  const nf = new Intl.NumberFormat('id-ID');
  const $ = (id) => document.getElementById(id);

  const TABS = [
    { key: 'mutual', slug: 'mutual', label: 'Mutual', desc: 'Akun yang Anda follow dan juga follow Anda.' },
    { key: 'notFollowingBack', slug: 'tidak-follow-balik', label: 'Tidak follow balik', desc: 'Akun yang Anda follow, tetapi tidak follow Anda.' },
    { key: 'fans', slug: 'penggemar', label: 'Penggemar', desc: 'Akun yang follow Anda, tetapi tidak Anda follow.' },
  ];

  const sources = {
    followers: { names: [], set: new Set() },
    following: { names: [], set: new Set() },
  };
  let result = null;
  let activeTab = 'mutual';
  let flashTimer = null;

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function setMsg(text, kind) {
    const m = $('msg');
    m.textContent = text || '';
    m.className = kind ? `msg ${kind}` : 'msg';
  }

  function flash(text) {
    const f = $('flash');
    f.textContent = text;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { f.textContent = ''; }, 2500);
  }

  function hasData(kind) {
    return sources[kind].set.size > 0 || $('paste-' + kind).value.trim().length > 0;
  }

  function refreshAnalyzeButton() {
    $('analyze').disabled = !(hasData('followers') && hasData('following'));
  }

  function renderStatus(kind) {
    const src = sources[kind];
    $('status-' + kind).textContent = src.set.size
      ? `${nf.format(src.set.size)} username dari ${src.names.length} file`
      : 'Belum ada file';
    $('drop-' + kind).classList.toggle('filled', src.set.size > 0);
  }

  async function readFiles(kind, fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const src = sources[kind];
    const problems = [];

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        problems.push(`${file.name}: terlalu besar (maksimal 50 MB).`);
        continue;
      }
      try {
        const found = Core.parseContent(file.name, await file.text());
        if (!found.size) {
          problems.push(`${file.name}: tidak ada username yang terbaca.`);
          continue;
        }
        found.forEach((u) => src.set.add(u));
        src.names.push(file.name);
      } catch (err) {
        problems.push(err.message || `${file.name}: gagal dibaca.`);
      }
    }
    renderStatus(kind);
    refreshAnalyzeButton();
    setMsg(problems.join(' '), problems.length ? 'error' : '');
  }

  function collect(kind) {
    const all = new Set(sources[kind].set);
    const pasted = $('paste-' + kind).value;
    if (pasted.trim()) Core.parseContent('tempel.txt', pasted).forEach((u) => all.add(u));
    return all;
  }

  function renderStats() {
    const wrap = $('stats');
    wrap.replaceChildren();
    const items = [
      ['Followers', result.totals.followers],
      ['Following', result.totals.following],
      ['Mutual', result.mutual.length],
      ['Tidak follow balik', result.notFollowingBack.length],
      ['Penggemar', result.fans.length],
    ];
    for (const [label, value] of items) {
      const box = el('div', 'stat');
      box.append(el('span', 'stat-value', nf.format(value)), el('span', 'stat-label', label));
      wrap.append(box);
    }
  }

  function renderTabs() {
    const wrap = $('tabs');
    wrap.replaceChildren();
    for (const tab of TABS) {
      const btn = el('button', 'tab');
      btn.type = 'button';
      btn.id = 'tab-' + tab.key;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', 'panel');
      btn.setAttribute('aria-selected', String(tab.key === activeTab));
      btn.append(el('span', '', tab.label), el('span', 'badge', nf.format(result[tab.key].length)));
      btn.addEventListener('click', () => {
        activeTab = tab.key;
        renderTabs();
        renderList();
      });
      wrap.append(btn);
    }
    $('tab-desc').textContent = TABS.find((t) => t.key === activeTab).desc;
  }

  function currentList() {
    const q = $('search').value.trim().toLowerCase().replace(/^@/, '');
    const all = result[activeTab];
    return q ? all.filter((u) => u.includes(q)) : all;
  }

  function renderList() {
    const list = currentList();
    const total = result[activeTab].length;
    const ul = $('list');
    ul.replaceChildren();

    const frag = document.createDocumentFragment();
    for (const u of list) {
      const li = el('li');
      const a = el('a', 'user', '@' + u);
      a.href = 'https://www.threads.com/@' + u;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      li.append(a);
      frag.append(li);
    }
    ul.append(frag);

    $('count').textContent = list.length === total
      ? `${nf.format(total)} akun`
      : `${nf.format(list.length)} dari ${nf.format(total)} akun`;

    const empty = $('empty');
    empty.hidden = list.length > 0;
    empty.textContent = total === 0 ? 'Tidak ada akun di kategori ini.' : 'Tidak ada hasil untuk pencarian itu.';

    $('copy').disabled = list.length === 0;
    $('csv').disabled = list.length === 0;
  }

  function renderResults() {
    renderStats();
    renderTabs();
    renderList();
  }

  function analyze() {
    let followers;
    let following;
    try {
      followers = collect('followers');
      following = collect('following');
    } catch (err) {
      setMsg(err.message, 'error');
      return;
    }
    if (!followers.size || !following.size) {
      setMsg('Isi kedua daftar (followers dan following) dengan username yang valid.', 'error');
      return;
    }

    result = Core.compare(followers, following);
    result.totals = { followers: followers.size, following: following.size };
    activeTab = 'mutual';
    $('search').value = '';
    renderResults();
    $('results').hidden = false;
    $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });

    const identical = followers.size === following.size && result.mutual.length === followers.size;
    setMsg(
      identical ? 'Catatan: kedua daftar identik. Pastikan file followers dan following tidak tertukar atau sama.' : '',
      ''
    );
  }

  async function copyList() {
    const text = currentList().map((u) => '@' + u).join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    flash('Tersalin!');
  }

  function download(name, mime, content) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function reset() {
    for (const kind of ['followers', 'following']) {
      sources[kind].names = [];
      sources[kind].set = new Set();
      $('file-' + kind).value = '';
      $('paste-' + kind).value = '';
      renderStatus(kind);
    }
    result = null;
    $('results').hidden = true;
    setMsg('', '');
    refreshAnalyzeButton();
  }

  for (const kind of ['followers', 'following']) {
    const drop = $('drop-' + kind);
    const input = $('file-' + kind);

    input.addEventListener('change', async () => {
      await readFiles(kind, input.files);
      input.value = '';
    });
    for (const type of ['dragenter', 'dragover']) {
      drop.addEventListener(type, (e) => { e.preventDefault(); drop.classList.add('over'); });
    }
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('over');
      readFiles(kind, e.dataTransfer && e.dataTransfer.files);
    });
    $('paste-' + kind).addEventListener('input', refreshAnalyzeButton);
  }

  $('analyze').addEventListener('click', analyze);
  $('reset').addEventListener('click', reset);
  $('search').addEventListener('input', () => result && renderList());
  $('copy').addEventListener('click', copyList);
  $('csv').addEventListener('click', () => {
    const tab = TABS.find((t) => t.key === activeTab);
    download(`threads-${tab.slug}.csv`, 'text/csv;charset=utf-8', Core.toCsv(currentList()));
  });
  $('json').addEventListener('click', () => {
    const { mutual, notFollowingBack, fans } = result;
    download('threads-mutual.json', 'application/json', JSON.stringify({ mutual, notFollowingBack, fans }, null, 2));
  });

  refreshAnalyzeButton();
})();
