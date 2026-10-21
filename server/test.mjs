// Tests for worker.js with an in-memory store and a fake iNaturalist. `node server/test.mjs`
import worker from './worker.js';
import assert from 'node:assert/strict';

const mem = new Map();
const KV = {
  async get(k, type) { const e = mem.get(k); if (!e || e.exp < Date.now()) { mem.delete(k); return null; } return type === 'json' ? JSON.parse(e.v) : e.v; },
  async put(k, v, o = {}) { mem.set(k, { v, exp:o.expirationTtl ? Date.now() + o.expirationTtl * 1000 : Infinity }); },
  async delete(k) { mem.delete(k); },
};
const env = { OUT:KV, ADMINS:'themoojuice', SALT:'test' };
const bios = {};   // login -> iNat bio
globalThis.fetch = async url => {
  const m = String(url).match(/\/v2\/users\/([^?]+)/);
  if (!m) throw new Error('unexpected fetch ' + url);
  const u = decodeURIComponent(m[1]);
  if (!(u in bios)) return new Response('{}', { status:404 });
  return new Response(JSON.stringify({ results:[{ login:u, description:bios[u], spam:u === 'spammer', suspended:false }] }));
};
let ip = 1;
async function call(method, path, body, { token, origin = 'https://themoojuice.github.io', addr } = {}) {
  const headers = { origin, 'cf-connecting-ip':addr || '10.0.0.' + ip };
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = 'Bearer ' + token;
  const r = await worker.fetch(new Request('https://srv.test' + path, { method, headers, body:body ? JSON.stringify(body) : undefined }), env);
  return { status:r.status, j:r.status === 204 ? null : await r.json(), h:r.headers };
}
let n = 0; const ok = (name) => { n++; console.log('ok', n, name); };

// origin and CORS
assert.equal((await call('GET', '/page?u=laz', null, { origin:'https://evil.example' })).status, 403); ok('foreign origin refused');
const pre = await worker.fetch(new Request('https://srv.test/gb', { method:'OPTIONS', headers:{ origin:'http://localhost:8765' } }), env);
assert.equal(pre.status, 204); assert.match(pre.headers.get('access-control-allow-headers'), /authorization/); ok('preflight allows authorization');

// empty page
let r = await call('GET', '/page?u=laz');
assert.equal(r.status, 200); assert.deepEqual(r.j.visits, { week:0, last:0, total:0 }); assert.equal(r.j.prof.verified, false); assert.equal(r.j.gb.entries.length, 0); ok('empty page');
assert.equal((await call('GET', '/page?u=BAD LOGIN')).status, 400); ok('bad login');

// visits
r = await call('POST', '/visit', { u:'laz' }); assert.equal(r.j.visits.week, 1); assert.equal(r.j.counted, true);
await call('POST', '/visit', { u:'laz' }); r = await call('GET', '/page?u=laz'); assert.equal(r.j.visits.week, 2); assert.equal(r.j.visits.total, 2); ok('visits count');

// stamps from anyone, words only once the owner is verified
r = await call('POST', '/gb', { u:'laz', t:'p', k:'sign', nick:'Bob' }); assert.equal(r.status, 200); assert.equal(r.j.entry.nick, 'Bob'); assert.equal(r.j.entry.st, 'ok'); ok('anonymous stamp');
r = await call('POST', '/gb', { u:'laz', t:'g53600', k:'nice', m:'lovely' }); assert.equal(r.status, 403); assert.match(r.j.error, /verifies/); ok('anonymous words refused on unverified book');
r = await call('POST', '/gb', { u:'laz', t:'x1' , k:'nice' }); assert.equal(r.status, 400); ok('bad target');
r = await call('POST', '/gb', { u:'laz', t:'p', k:'boom' }); assert.equal(r.status, 400); ok('bad stamp');
r = await call('POST', '/gb', { u:'laz', t:'p' }); assert.equal(r.status, 400); ok('empty post');
r = await call('POST', '/gb', { u:'laz', t:'p', k:'sign', nick:'<script>' }); assert.equal(r.status, 400); ok('nick characters');

// verification
r = await call('POST', '/claim', { u:'laz' }); const code = r.j.code; assert.match(code, /^spoodex-[A-Z2-9]{6}$/); ok('claim code');
assert.equal((await call('POST', '/claim', { u:'laz' })).j.code, code); ok('same code on asking again');
bios.laz = 'Spiders and more';
r = await call('POST', '/claim/check', { u:'laz' }); assert.equal(r.status, 409); ok('code missing from bio');
bios.laz = `Spiders and more ${code.toLowerCase()}`;
r = await call('POST', '/claim/check', { u:'laz' }); assert.equal(r.status, 200); const lazTok = r.j.token; assert.ok(lazTok.length > 20); ok('verified (case-insensitive code)');
assert.equal((await call('POST', '/claim/check', { u:'laz' })).status, 410); ok('code used up');
assert.equal((await call('POST', '/claim/check', { u:'nobody' })).status, 410); ok('no code asked');
await call('POST', '/claim', { u:'ghost' }); assert.equal((await call('POST', '/claim/check', { u:'ghost' })).status, 404); ok('unknown iNat user');
const sc = (await call('POST', '/claim', { u:'spammer' })).j.code; bios.spammer = sc; assert.equal((await call('POST', '/claim/check', { u:'spammer' })).status, 403); ok('spam account refused');
r = await call('GET', '/me', null, { token:lazTok }); assert.deepEqual(r.j.me, { u:'laz', admin:false }); ok('/me');
r = await call('GET', '/me', null, { token:'x'.repeat(30) }); assert.equal(r.j.me, null); ok('bad token is nobody');

// now anonymous words are allowed, and the content rules apply
r = await call('POST', '/gb', { u:'laz', t:'g53600', k:'nice', m:'What a find!', nick:'Bob' }); assert.equal(r.status, 200); assert.equal(r.j.entry.st, 'ok'); ok('anonymous words on verified book');
for (const [m, why] of [['see https://x.y', 'link'], ['www.spam.com', 'link'], ['mail me a@b.co', 'email'], ['it was at -16.9234, 145.7712', 'coords'],
  ['call 0412 345 678', 'phone'], ['x'.repeat(281), 'length']]) { r = await call('POST', '/gb', { u:'laz', t:'p', m }, { addr:'10.9.9.' + (ip++) }); assert.equal(r.status, 400, why); }
ok('links, emails, coordinates, phone numbers and long text refused');
r = await call('POST', '/gb', { u:'laz', t:'p', m:'Seen them 2024 - 2025, love it' }, { addr:'10.9.8.1' }); assert.equal(r.status, 200); ok('year ranges allowed');
r = await call('POST', '/gb', { u:'laz', t:'p', m:'a‮b  c\n\n\n\nd' }, { addr:'10.9.8.2' }); assert.equal(r.j.entry.m, 'ab c\n\nd'); ok('control characters and spacing cleaned');

// verified author
const rob = (await call('POST', '/claim', { u:'rob' })).j.code; bios.rob = rob; const robTok = (await call('POST', '/claim/check', { u:'rob' })).j.token;
r = await call('POST', '/gb', { u:'laz', t:'p', k:'jealous', m:'Mate!', nick:'Imposter' }, { token:robTok }); assert.equal(r.j.entry.by, 'rob'); assert.equal(r.j.entry.nick, null); ok('verified author, nick ignored');
const robEntry = r.j.entry.id;

// approve-first mode
assert.equal((await call('PUT', '/prof', { gb:'approve' })).status, 401); ok('prof needs a token');
assert.equal((await call('PUT', '/prof', { u:'laz', gb:'approve' }, { token:robTok })).status, 403); ok('not your prof');
r = await call('PUT', '/prof', { gb:'approve', bio:'Cairns, mostly at night', picks:[53600, '51934', -1, 53600, 1.5] }, { token:lazTok });
assert.equal(r.status, 200); assert.deepEqual(r.j.prof.picks, [53600, 51934]); assert.equal(r.j.prof.bio, 'Cairns, mostly at night'); ok('prof saved, picks cleaned');
assert.equal((await call('PUT', '/prof', { bio:'find me at www.x.com' }, { token:lazTok })).status, 400); ok('bio rules');
r = await call('POST', '/gb', { u:'laz', t:'p', m:'Hold this one', nick:'Ann' }, { addr:'10.7.7.7' }); assert.equal(r.j.entry.st, 'pending'); const pend = r.j.entry.id; ok('anonymous words held');
r = await call('POST', '/gb', { u:'laz', t:'p', k:'nice', nick:'Ann' }, { addr:'10.7.7.8' }); assert.equal(r.j.entry.st, 'ok'); ok('stamps still instant');
r = await call('GET', '/page?u=laz'); assert.ok(!r.j.gb.entries.some(e => e.id === pend)); assert.equal(r.j.gb.mod, false); ok('pending hidden from the public');
r = await call('GET', '/page?u=laz', null, { token:lazTok }); assert.ok(r.j.gb.entries.some(e => e.id === pend && e.st === 'pending')); assert.equal(r.j.gb.mod, true); ok('owner sees pending');
r = await call('GET', '/page?u=laz', null, { token:(await (async () => { const c = (await call('POST', '/claim', { u:'themoojuice' })).j.code; bios.themoojuice = c; return (await call('POST', '/claim/check', { u:'themoojuice' })).j.token; })()) });
assert.equal(r.j.gb.mod, true); assert.equal(r.j.me.admin, true); ok('admin sees pending on any book');

// moderation
assert.equal((await call('POST', '/gb/mod', { u:'laz', id:pend, a:'show' })).status, 401); ok('mod needs a token');
assert.equal((await call('POST', '/gb/mod', { u:'laz', id:pend, a:'show' }, { token:robTok })).status, 403); ok('others can’t approve');
r = await call('POST', '/gb/mod', { u:'laz', id:pend, a:'show' }, { token:lazTok }); assert.equal(r.status, 200);
assert.ok((await call('GET', '/page?u=laz')).j.gb.entries.some(e => e.id === pend)); ok('approved shows');
await call('POST', '/gb/mod', { u:'laz', id:pend, a:'hide' }, { token:lazTok }); assert.ok(!(await call('GET', '/page?u=laz')).j.gb.entries.some(e => e.id === pend)); ok('hidden');
assert.equal((await call('POST', '/gb/mod', { u:'laz', id:robEntry, a:'delete' }, { token:robTok })).status, 200); ok('author deletes own');
assert.ok(!(await call('GET', '/page?u=laz', null, { token:lazTok })).j.gb.entries.some(e => e.id === robEntry)); ok('deleted is gone');
r = await call('GET', '/page?u=laz'); assert.equal(r.j.gb.counts.g53600, 1); assert.ok(r.j.gb.counts.p >= 3); ok('counts per target');

// closed book; owner visits don't count
await call('PUT', '/prof', { gb:'off' }, { token:lazTok });
assert.equal((await call('POST', '/gb', { u:'laz', t:'p', k:'nice' }, { addr:'10.6.6.6' })).status, 403); ok('closed book');
r = await call('POST', '/visit', { u:'laz' }, { token:lazTok }); assert.equal(r.j.counted, false); ok('own visit not counted');

// rate limits
let last; for (let i = 0; i < 9; i++) last = await call('POST', '/gb', { u:'rob', t:'p', k:'nice' }, { addr:'10.5.5.5' });
assert.equal(last.status, 429); ok('post rate limit');
for (let i = 0; i < 11; i++) last = await call('POST', '/claim', { u:'rob' }, { addr:'10.4.4.4' });
assert.equal(last.status, 429); ok('claim rate limit');

// logout; nothing stores raw addresses
await call('POST', '/logout', null, { token:robTok }); assert.equal((await call('GET', '/me', null, { token:robTok })).j.me, null); ok('logout');
assert.ok(![...mem.keys(), ...[...mem.values()].map(e => e.v)].some(s => /10\.\d+\.\d+\.\d+/.test(s))); ok('no raw addresses stored');

// spooding now still works
r = await call('POST', '/out', { u:'laz', h:2 }); assert.equal(r.j.u, 'laz'); assert.equal((await call('GET', '/out?u=laz,rob')).j.out.length, 1); ok('spooding now');

// helpers
const { isoWeek } = worker._test;
assert.equal(isoWeek(Date.UTC(2026, 9, 21)), '2026-W43'); assert.equal(isoWeek(Date.UTC(2027, 0, 1)), '2026-W53'); assert.equal(isoWeek(Date.UTC(2026, 0, 1)), '2026-W01'); ok('ISO weeks');
console.log(`\nall ${n} passed`);
