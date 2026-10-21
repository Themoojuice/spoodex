// The SPOODEX server: a Cloudflare Worker with Workers KV. Jobs:
//   Spooding now (v2.8)   who in a crew is out spooding, and until when                    /out
//   Visits (v2.14)        how many people opened someone's SPOODEX, by week                /visit, inside /page
//   Guestbook (v2.14)     stamps and short messages on a profile or a card, with moderation /gb, /gb/mod, inside /page
//   Exhibition (v2.14)    the owner's bio, picks and guestbook setting                      /prof, inside /page
//   Verification (v2.14)  "this is my iNaturalist account": a code put in the iNat bio     /claim, /claim/check, /me, /logout
// Stored: out:<login>, v:<login>, gb:<login>, prof:<login>, claim:<login>, tok:<sha256 of a token>, rl:<kind>:<hashed address>.
// No locations, no raw IP addresses (only a salted hash, kept 10 minutes to 1 hour for rate limits), no email, no passwords.
// Deploy steps: server/README.md. Local test: `node server/dev.mjs` (the same code with an in-memory store).
const ORIGINS = [/^https:\/\/themoojuice\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1|[\w-]+\.localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/];
const LOGIN = /^[a-z0-9][a-z0-9_-]{0,39}$/;   // iNaturalist logins, lowercased as the app sends them
const MAX_H = 4, MAX_LOGINS = 8;
const INAT_USER = 'https://api.inaturalist.org/v2/users/';   // ?fields=login,description,spam,suspended (checked 2026-10-21; v1 has no description)

// Guestbook rules
const STAMPS = { sign:'✍️', nice:'🕷', photo:'📸', jealous:'😤', never:'👀', hunt:'🎯', note:'💬' };
const TARGET = /^(p|g\d{1,9})$/;          // p = the profile, g<taxon id> = one genus card
const GB_KEEP = 400, GB_SHOW = 200, MSG_MAX = 280, NICK_MAX = 24, BIO_MAX = 160, PICKS_MAX = 9;
const GB_MODES = ['open', 'approve', 'off'];
const TOKEN_DAYS = 365, CLAIM_TTL = 3600;
const LIMITS = { post:[8, 600], claim:[10, 3600], visit:[60, 600] };   // [requests, seconds] per hashed address

// Text that can't go in a guestbook or bio: links, email addresses, coordinates, long digit runs (phone numbers)
const LINKY = /(https?:|www\.|\b[\w-]+\.(com|net|org|io|ru|xyz|info|biz|au|uk|co|me|app|link|ly)\b|@[\w-]+\.\w)/i;
const COORDS = /-?\d{1,3}\.\d{3,}\s*[,;/ ]\s*-?\d{1,3}\.\d{3,}|\d{1,3}\s*°\s*\d{1,2}/;
const longNumber = s => (s.match(/\d[\d\s().-]{7,}\d/g) || []).some(m => m.replace(/\D/g, '').length >= 9);   // phone numbers, not "2024 - 2025"
function cleanText(s, max) {
  s = String(s ?? '').normalize('NFC').replace(/[\u0000-\u0008\u000b-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '')
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (s.length > max) return { error:`Keep it under ${max} characters.` };
  if (LINKY.test(s)) return { error:'Links and email addresses can’t be posted.' };
  if (COORDS.test(s)) return { error:'Coordinates can’t be posted. Keep spots private.' };
  if (longNumber(s)) return { error:'Phone numbers can’t be posted.' };
  return { s };
}
const NICK = /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u;

// ISO week, UTC: "2026-W43"
function isoWeek(t = Date.now()) {
  const d = new Date(t); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + 3 - (d.getUTCDay() + 6) % 7);
  const y = d.getUTCFullYear(), w1 = new Date(Date.UTC(y, 0, 4));
  return `${y}-W${String(1 + Math.round(((d - w1) / 864e5 - 3 + (w1.getUTCDay() + 6) % 7) / 7)).padStart(2, '0')}`;
}
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const b64u = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const newToken = () => b64u(crypto.getRandomValues(new Uint8Array(24)));
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => 'spoodex-' + [...crypto.getRandomValues(new Uint8Array(6))].map(b => CODE_ABC[b % CODE_ABC.length]).join('');
const newId = () => Date.now().toString(36) + [...crypto.getRandomValues(new Uint8Array(3))].map(b => (b % 36).toString(36)).join('');

export default {
  _test:{ cleanText, isoWeek, STAMPS },   // for server/test.mjs
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '', allowed = ORIGINS.some(r => r.test(origin));
    const cors = allowed ? { 'access-control-allow-origin':origin, 'access-control-allow-methods':'GET, POST, PUT, DELETE, OPTIONS',
      'access-control-allow-headers':'content-type, authorization', 'access-control-max-age':'86400', vary:'origin' } : {};
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers:{ 'content-type':'application/json', 'cache-control':'no-store', ...cors } });
    if (req.method === 'OPTIONS') return new Response(null, { status:allowed ? 204 : 403, headers:cors });
    const url = new URL(req.url), path = url.pathname, KV = env.OUT;
    if (path === '/') return json({ ok:true, service:'spoodex' });
    if (!allowed) return json({ error:'origin not allowed' }, 403);
    const fail = (error, status = 400) => json({ error }, status);
    const body = async () => { try { const t = await req.text(); return t.length > 4000 ? null : JSON.parse(t || '{}'); } catch { return null; } };
    const admins = new Set(String(env.ADMINS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean));

    // who is asking: a bearer token from /claim/check, or nobody
    let me = null;
    const auth = (req.headers.get('authorization') || '').match(/^Bearer ([\w-]{20,64})$/);
    if (auth) { const t = await KV.get('tok:' + await sha(auth[1]), 'json'); if (t?.u) me = { u:t.u, admin:admins.has(t.u), hash:await sha(auth[1]) }; }
    const canMod = u => me && (me.u === u || me.admin);

    // rate limits on a salted hash of the address, kept only as long as the window
    const limited = async kind => {
      const [n, secs] = LIMITS[kind];
      const k = `rl:${kind}:${(await sha((env.SALT || 'spoodex') + (req.headers.get('cf-connecting-ip') || 'local'))).slice(0, 20)}`;
      const c = +(await KV.get(k)) || 0;
      if (c >= n) return true;
      await KV.put(k, String(c + 1), { expirationTtl:secs });
      return false;
    };
    const loginParam = () => { const u = (url.searchParams.get('u') || '').toLowerCase(); return LOGIN.test(u) ? u : null; };

    // ---------- Spooding now ----------
    if (path === '/out') {
      if (req.method === 'GET') {   // ?u=a,b,c → who of them is out now
        const us = [...new Set((url.searchParams.get('u') || '').toLowerCase().split(','))].filter(u => LOGIN.test(u)).slice(0, MAX_LOGINS);
        const now = Date.now(), out = [];
        for (const u of us) { const v = await KV.get('out:' + u, 'json'); if (v && v.until > now) out.push({ u, at:v.at, until:v.until }); }
        return json({ out });
      }
      if (req.method === 'POST') {  // {u, h} → out for h hours (1–4)
        const b = await body(); if (!b) return fail('bad body');
        const u = String(b.u || '').toLowerCase(), h = Math.min(MAX_H, Math.max(1, Math.round(+b.h || 2)));
        if (!LOGIN.test(u)) return fail('bad login');
        const at = Date.now(), until = at + h * 3600e3;
        await KV.put('out:' + u, JSON.stringify({ at, until }), { expirationTtl:h * 3600 + 60 });
        return json({ u, at, until });
      }
      if (req.method === 'DELETE') { // ?u=login → back home
        const u = loginParam(); if (!u) return fail('bad login');
        await KV.delete('out:' + u);
        return json({ ok:true });
      }
      return fail('method not allowed', 405);
    }

    // ---------- one call for a visited SPOODEX: exhibition settings, visits, guestbook ----------
    const visitsOf = v => { const w = isoWeek(), p = isoWeek(Date.now() - 7 * 864e5); return { week:v?.w?.[w] || 0, last:v?.w?.[p] || 0, total:v?.t || 0 }; };
    const profOf = p => p ? { verified:!!p.v, bio:p.bio || '', picks:p.picks || [], gb:p.gb || 'open' } : { verified:false, bio:'', picks:[], gb:'open' };
    const gbView = (book, u) => {
      const mod = canMod(u), all = book?.e || [];
      const seen = all.filter(e => e.st === 'ok' || mod || (me && e.by === me.u)).slice(0, GB_SHOW);
      const counts = {}; for (const e of all) if (e.st === 'ok') counts[e.t] = (counts[e.t] || 0) + 1;
      return { entries:seen, counts, mod:!!mod };
    };
    if (path === '/page' && req.method === 'GET') {
      const u = loginParam(); if (!u) return fail('bad login');
      const [prof, v, book] = await Promise.all([KV.get('prof:' + u, 'json'), KV.get('v:' + u, 'json'), KV.get('gb:' + u, 'json')]);
      return json({ u, prof:profOf(prof), visits:visitsOf(v), gb:gbView(book, u), me:me ? { u:me.u, admin:me.admin } : null });
    }

    // ---------- visits: the app sends one a day per browser per SPOODEX, never for your own ----------
    if (path === '/visit' && req.method === 'POST') {
      const b = await body(); const u = String(b?.u || '').toLowerCase();
      if (!LOGIN.test(u)) return fail('bad login');
      if (me?.u === u) return json({ visits:visitsOf(await KV.get('v:' + u, 'json')), counted:false });
      if (await limited('visit')) return fail('slow down', 429);
      const v = (await KV.get('v:' + u, 'json')) || { w:{}, t:0 }, wk = isoWeek();
      v.w[wk] = (v.w[wk] || 0) + 1; v.t = (v.t || 0) + 1;
      for (const k of Object.keys(v.w).sort().slice(0, -12)) delete v.w[k];   // the last 12 weeks
      await KV.put('v:' + u, JSON.stringify(v));
      return json({ visits:visitsOf(v), counted:true });
    }

    // ---------- guestbook ----------
    if (path === '/gb' && req.method === 'POST') {
      const b = await body(); if (!b) return fail('bad body');
      const u = String(b.u || '').toLowerCase(), t = String(b.t || 'p'), k = String(b.k || '');
      if (!LOGIN.test(u)) return fail('bad login');
      if (!TARGET.test(t)) return fail('bad target');
      if (k && !STAMPS[k]) return fail('bad stamp');
      const prof = await KV.get('prof:' + u, 'json'), mode = prof?.gb || 'open';
      if (mode === 'off' && !canMod(u)) return fail('This guestbook is closed.', 403);
      const m = cleanText(b.m, MSG_MAX); if (m.error) return fail(m.error);
      let nick = null;
      if (!me) {
        const n = cleanText(b.nick, NICK_MAX); if (n.error) return fail(n.error);
        if (n.s && !NICK.test(n.s)) return fail('Names can use letters, numbers, spaces and . _ \' -');
        nick = n.s || null;
        // an unverified visitor can write words only where the owner is verified and can moderate
        if (m.s && !prof?.v) return fail(`Messages open once ${u} verifies their SPOODEX. Stamps work now.`, 403);
      }
      if (!m.s && !k) return fail('Pick a stamp or write something.');
      if (await limited('post')) return fail('That’s a lot of posts. Try again in a few minutes.', 429);
      const st = !me && m.s && mode === 'approve' ? 'pending' : 'ok';
      const e = { id:newId(), at:Date.now(), t, k:k || 'note', m:m.s || '', by:me?.u || null, nick:me ? null : nick, st };
      const book = (await KV.get('gb:' + u, 'json')) || { e:[] };
      book.e = [e, ...book.e].slice(0, GB_KEEP);
      await KV.put('gb:' + u, JSON.stringify(book));
      return json({ entry:e, gb:gbView(book, u) });
    }
    if (path === '/gb/mod' && req.method === 'POST') {   // {u, id, a: show|hide|delete}: the owner, an admin, or a verified author deleting their own
      const b = await body(); if (!b) return fail('bad body');
      const u = String(b.u || '').toLowerCase(), a = String(b.a || '');
      if (!LOGIN.test(u) || !['show', 'hide', 'delete'].includes(a)) return fail('bad request');
      if (!me) return fail('Verify it’s you first.', 401);
      const book = (await KV.get('gb:' + u, 'json')) || { e:[] }, e = book.e.find(x => x.id === b.id);
      if (!e) return fail('not found', 404);
      if (!canMod(u) && !(a === 'delete' && e.by === me.u)) return fail('Only the owner can do that.', 403);
      if (a === 'delete') book.e = book.e.filter(x => x !== e); else e.st = a === 'show' ? 'ok' : 'hidden';
      await KV.put('gb:' + u, JSON.stringify(book));
      return json({ gb:gbView(book, u) });
    }

    // ---------- exhibition settings (owner only) ----------
    if (path === '/prof' && req.method === 'PUT') {
      if (!me) return fail('Verify it’s you first.', 401);
      const b = await body(); if (!b) return fail('bad body');
      const u = String(b.u || me.u).toLowerCase();
      if (!canMod(u)) return fail('Only the owner can do that.', 403);
      const p = (await KV.get('prof:' + u, 'json')) || { v:1 };
      if (b.bio != null) { const c = cleanText(b.bio, BIO_MAX); if (c.error) return fail(c.error); p.bio = c.s; }
      if (b.picks != null) p.picks = [...new Set((Array.isArray(b.picks) ? b.picks : []).map(Number).filter(n => Number.isInteger(n) && n > 0 && n < 1e9))].slice(0, PICKS_MAX);
      if (b.gb != null) { if (!GB_MODES.includes(b.gb)) return fail('bad guestbook setting'); p.gb = b.gb; }
      p.at = Date.now();
      await KV.put('prof:' + u, JSON.stringify(p));
      return json({ prof:profOf(p) });
    }

    // ---------- verification: put a one-off code in your iNaturalist bio ----------
    if (path === '/claim' && req.method === 'POST') {
      const b = await body(); const u = String(b?.u || '').toLowerCase();
      if (!LOGIN.test(u)) return fail('bad login');
      if (await limited('claim')) return fail('Too many tries. Wait an hour.', 429);
      const old = await KV.get('claim:' + u, 'json'), code = old?.code || newCode();   // asking again keeps the same code
      if (!old) await KV.put('claim:' + u, JSON.stringify({ code, at:Date.now() }), { expirationTtl:CLAIM_TTL });
      return json({ u, code, expires:(old?.at || Date.now()) + CLAIM_TTL * 1000 });
    }
    if (path === '/claim/check' && req.method === 'POST') {
      const b = await body(); const u = String(b?.u || '').toLowerCase();
      if (!LOGIN.test(u)) return fail('bad login');
      if (await limited('claim')) return fail('Too many tries. Wait an hour.', 429);
      const c = await KV.get('claim:' + u, 'json');
      if (!c) return fail('That code has expired. Ask for a new one.', 410);
      let r;
      try { r = await fetch(`${INAT_USER}${encodeURIComponent(u)}?fields=login,description,spam,suspended`, { headers:{ 'user-agent':'SPOODEX server (https://themoojuice.github.io/spoodex/)' } }); }
      catch { return fail('Couldn’t reach iNaturalist. Try again.', 502); }
      if (r.status === 404) return fail(`No iNaturalist user called ${u}.`, 404);
      if (!r.ok) return fail('iNaturalist didn’t answer. Try again in a minute.', 502);
      const user = (await r.json())?.results?.[0];
      if (!user || String(user.login).toLowerCase() !== u) return fail(`No iNaturalist user called ${u}.`, 404);
      if (user.spam || user.suspended) return fail('That account can’t be verified.', 403);
      if (!String(user.description || '').toUpperCase().includes(c.code.toUpperCase())) return fail(`The code isn’t in ${u}'s iNaturalist bio yet. iNaturalist can take a minute to update.`, 409);
      const token = newToken();
      await KV.put('tok:' + await sha(token), JSON.stringify({ u, at:Date.now() }), { expirationTtl:TOKEN_DAYS * 86400 });
      await KV.delete('claim:' + u);
      const p = (await KV.get('prof:' + u, 'json')) || {};
      if (!p.v) { p.v = 1; p.gb = p.gb || 'open'; p.at = Date.now(); await KV.put('prof:' + u, JSON.stringify(p)); }
      return json({ u, token, admin:admins.has(u) });
    }
    if (path === '/me' && req.method === 'GET') return json({ me:me ? { u:me.u, admin:me.admin } : null });
    if (path === '/logout' && req.method === 'POST') { if (me) await KV.delete('tok:' + me.hash); return json({ ok:true }); }

    return fail('not found', 404);
  },
};
