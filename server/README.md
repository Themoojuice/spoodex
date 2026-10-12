# SPOODEX server

A Cloudflare Worker with one job so far: **Spooding now** (Crew tab), which shows who in a crew is out spooding and until when. It stores
only `{login: {at, until}}` in Workers KV, each entry expiring by itself after at most 4 hours. No locations, no IP addresses.

The app finds it through `SERVER` in `spoodex.html` (rewards & routines section). While `SERVER` is empty, the live site hides the panel.
On localhost it looks for this server on port 8787 instead.

## Test locally

```bash
node server/dev.mjs
```

That runs `worker.js` with an in-memory store on http://localhost:8787. Open the app on `http://localhost:8765/spoodex.html?u=<login>`
with at least one crew member, then go to Mates › Crew.

## Deploy (once, about 10 minutes, free plan)

1. Make a free Cloudflare account at https://dash.cloudflare.com/sign-up (you do this yourself).
2. In this folder, sign in and create the store:
   ```bash
   cd server
   npx wrangler login
   npx wrangler kv namespace create OUT
   ```
   Paste the `id` it prints into `wrangler.toml` in place of `PASTE_THE_KV_NAMESPACE_ID_HERE`.
3. Deploy:
   ```bash
   npx wrangler deploy
   ```
   It prints the address, something like `https://spoodex.<your-subdomain>.workers.dev`.
4. Put that address in `spoodex.html`: `const SERVER = 'https://spoodex.<your-subdomain>.workers.dev';`, then ship the app as usual.

Free-plan limits: 100,000 requests a day and 1,000 KV writes a day (one write each time someone says they're heading out or back).
Each open Crew tab asks every 3 minutes at most.

## Allowed sites

`worker.js` answers only pages from `https://themoojuice.github.io` and local test addresses (`ORIGINS`). Add a new address there if the
app moves.

## Known limit

There are no logins: the server trusts the username the app sends, so someone could mark another player as "out". It shows nothing but
"out until <time>", so the harm is small. If it matters later, add iNaturalist sign-in (OAuth) here.
