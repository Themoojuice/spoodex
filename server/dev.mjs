// Runs worker.js locally on port 8787 with an in-memory store standing in for Workers KV, so the app on localhost can be tested
// without a Cloudflare account. `node server/dev.mjs`. Listens on every interface, so a phone on the same Wi-Fi can reach it.
import http from 'node:http';
import worker from './worker.js';

const mem = new Map();
const OUT = {
  async get(k, type) { const e = mem.get(k); if (!e || e.exp < Date.now()) { mem.delete(k); return null; } return type === 'json' ? JSON.parse(e.v) : e.v; },
  async put(k, v, o = {}) { mem.set(k, { v, exp:o.expirationTtl ? Date.now() + o.expirationTtl * 1000 : Infinity }); },
  async delete(k) { mem.delete(k); },
};
const PORT = +process.env.PORT || 8787;
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : Buffer.concat(chunks);
  const headers = Object.entries(req.headers).filter(([, v]) => typeof v === 'string');
  try {
    const r = await worker.fetch(new Request(`http://${req.headers.host || 'localhost'}${req.url}`, { method:req.method, headers, body }), { OUT });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
    console.log(req.method, req.url, r.status);
  } catch (e) { console.error(e); res.writeHead(500); res.end(); }
}).listen(PORT, () => console.log(`SPOODEX server (dev) on http://localhost:${PORT}`));
