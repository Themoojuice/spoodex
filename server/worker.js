// The SPOODEX server: a Cloudflare Worker. One job so far, "Spooding now": who in a crew is out spooding, and until when.
// It keeps only {login: {at, until}} in Workers KV, each entry expiring by itself. No locations, no IP addresses, nothing else.
// Deploy steps: server/README.md. Local test: `node server/dev.mjs` (the same code with an in-memory store).
const ORIGINS = [/^https:\/\/themoojuice\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1|[\w-]+\.localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/];
const LOGIN = /^[a-z0-9][a-z0-9_-]{0,39}$/;   // iNaturalist logins, lowercased as the app sends them
const MAX_H = 4, MAX_LOGINS = 8;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '', allowed = ORIGINS.some(r => r.test(origin));
    const cors = allowed ? { 'access-control-allow-origin':origin, 'access-control-allow-methods':'GET, POST, DELETE, OPTIONS',
      'access-control-allow-headers':'content-type', 'access-control-max-age':'86400', vary:'origin' } : {};
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers:{ 'content-type':'application/json', 'cache-control':'no-store', ...cors } });
    if (req.method === 'OPTIONS') return new Response(null, { status:allowed ? 204 : 403, headers:cors });
    const url = new URL(req.url);
    if (url.pathname === '/') return json({ ok:true, service:'spoodex' });
    if (!allowed) return json({ error:'origin not allowed' }, 403);
    if (url.pathname !== '/out') return json({ error:'not found' }, 404);

    if (req.method === 'GET') {   // ?u=a,b,c → who of them is out now
      const us = [...new Set((url.searchParams.get('u') || '').toLowerCase().split(','))].filter(u => LOGIN.test(u)).slice(0, MAX_LOGINS);
      const now = Date.now(), out = [];
      for (const u of us) { const v = await env.OUT.get('out:' + u, 'json'); if (v && v.until > now) out.push({ u, at:v.at, until:v.until }); }
      return json({ out });
    }
    if (req.method === 'POST') {  // {u, h} → out for h hours (1–4)
      let b; try { b = await req.json(); } catch { return json({ error:'bad body' }, 400); }
      const u = String(b?.u || '').toLowerCase(), h = Math.min(MAX_H, Math.max(1, Math.round(+b?.h || 2)));
      if (!LOGIN.test(u)) return json({ error:'bad login' }, 400);
      const at = Date.now(), until = at + h * 3600e3;
      await env.OUT.put('out:' + u, JSON.stringify({ at, until }), { expirationTtl:h * 3600 + 60 });
      return json({ u, at, until });
    }
    if (req.method === 'DELETE') { // ?u=login → back home
      const u = (url.searchParams.get('u') || '').toLowerCase();
      if (!LOGIN.test(u)) return json({ error:'bad login' }, 400);
      await env.OUT.delete('out:' + u);
      return json({ ok:true });
    }
    return json({ error:'method not allowed' }, 405);
  },
};
