'use strict';

const assert = require('assert');
const { parseContent, compare, toCsv } = require('../public/core.js');

const list = (s) => Array.from(s).sort();

// JSON followers (gaya ekspor Meta: username di "value")
const followersJson = JSON.stringify([
  { string_list_data: [{ href: 'https://www.threads.com/@andi', value: 'Andi', timestamp: 1 }] },
  { string_list_data: [{ href: 'https://www.threads.com/@budi', value: 'budi' }] },
  { string_list_data: [{ value: 'dewi.s' }] },
]);
assert.deepStrictEqual(list(parseContent('followers_1.json', followersJson)), ['andi', 'budi', 'dewi.s']);

// JSON following (username di "title", tautan memakai /_u/)
const followingJson = JSON.stringify({
  relationships_following: [
    { title: 'andi', string_list_data: [{ href: 'https://www.instagram.com/_u/andi' }] },
    { string_list_data: [{ href: 'https://www.instagram.com/_u/cici' }] },
  ],
});
assert.deepStrictEqual(list(parseContent('following.json', followingJson)), ['andi', 'cici']);

// HTML
const html =
  '<a target="_blank" href="https://www.instagram.com/_u/dewi.s">dewi.s</a>' +
  '<a href="https://www.threads.com/@eko/post/123">post</a>';
assert.deepStrictEqual(list(parseContent('followers.html', html)), ['dewi.s', 'eko']);

// Teks / CSV
const txt = 'username\n@Andi\nhttps://www.threads.com/@budi\ncici,Cici Display\n\n';
assert.deepStrictEqual(list(parseContent('list.csv', txt)), ['andi', 'budi', 'cici']);

// JSON tidak valid
assert.throws(() => parseContent('rusak.json', '{oops'), /tidak valid/);

// Perbandingan
const followers = parseContent('f.json', followersJson);
const following = parseContent('g.json', followingJson);
const r = compare(followers, following);
assert.deepStrictEqual(r.mutual, ['andi']);
assert.deepStrictEqual(r.notFollowingBack, ['cici']);
assert.deepStrictEqual(r.fans, ['budi', 'dewi.s']);

// CSV
assert.strictEqual(toCsv(['a', 'b']), 'username\na\nb\n');

console.log('Semua tes lolos.');
