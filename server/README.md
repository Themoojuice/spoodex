# SPOODEX server

A Cloudflare Worker with Workers KV. Until it's deployed and its address is in `SERVER` (spoodex.html), the app hides every part
that needs it, and the rest works as before.

| Job | Since | Endpoints | Stored |
|---|---|---|---|
| **Spooding now** (Crew tab): who in a crew is out spooding, and until when | v2.8 | `GET /out?u=a,b`, `POST /out {u, h}`, `DELETE /out?u=` | `out:<login>` → `{at, until}`, expires by itself (≤ 4 h) |
| **Visits**: how many people opened someone's SPOODEX, by week | v2.14 | `POST /visit {u}` (the app sends one a day per browser per SPOODEX, never your own) | `v:<login>` → `{w:{"2026-W43":n…} (last 12 weeks), t:total}` |
| **Guestbook**: stamps and short messages on a profile (`t:'p'`) or a genus card (`t:'g<id>'`) | v2.14 | `POST /gb {u, t, k, m, nick}`, `POST /gb/mod {u, id, a:show\|hide\|delete}` | `gb:<login>` → `{e:[entries, newest first, ≤ 400]}` |
| **Exhibition settings**: the owner's bio, picks and guestbook mode | v2.14 | `PUT /prof {bio, picks, gb}` | `prof:<login>` → `{v, bio, picks, gb:open\|approve\|off}` |
| **Verification**: "this is my iNaturalist account", no passwords | v2.14 | `POST /claim {u}` → a code; `POST /claim/check {u}` → a token; `GET /me`; `POST /logout` | `claim:<login>` (1 h), `tok:<sha256 of token>` → `{u}` (1 year) |
| **One read for a visited SPOODEX** | v2.14 | `GET /page?u=` → `{prof, visits, gb:{entries, counts, mod}, me}` | |

No locations, no email, no passwords, no raw IP addresses. Rate limits use `rl:<kind>:<salted hash of the address>`, kept 10 minutes
to an hour.

### How verification works
The app asks `/claim` for a one-off code (`spoodex-XXXXXX`, valid an hour). The person pastes it anywhere in their iNaturalist bio
(https://www.inaturalist.org/users/edit) and presses Check; `/claim/check` reads `https://api.inaturalist.org/v2/users/<login>?fields=login,description,spam,suspended`
(v1 has no `description`; checked 2026-10-21) and, if the code is there, returns a random token. The app keeps it in localStorage
(`auth`) and sends it as `Authorization: Bearer …`. The code can be removed from the bio afterwards. Spam or suspended accounts are refused.

### Guestbook rules (`worker.js`)
- Stamps: `sign` (profile only in the app), `nice`, `photo`, `jealous`, `never`, `hunt`; `note` = words only.
- **Anyone** can leave a stamp, with an optional nickname (≤ 24 characters, letters, numbers, spaces and `. _ ' -`). Unverified names are
  shown plainly; verified authors show as **✓ login**, linked to their SPOODEX, and their nickname is ignored.
- **Words** (≤ 280 characters): verified authors anywhere; unverified visitors only on books whose owner has verified (someone is there
  to moderate). If the owner chose **Approve messages first**, unverified words wait (`st:'pending'`) until the owner approves.
- Refused in words, nicknames and bios: links and email addresses, coordinates, phone numbers (9+ digits); control and bidi characters
  are stripped.
- The owner (verified) can approve, hide, show and delete; a verified author can delete their own; anyone in `ADMINS` (verified) can
  moderate every book. **Closed** books take no new entries.
- 8 posts per 10 minutes and 10 verification tries per hour per address.

## Test locally

```bash
node server/test.mjs        # 50 checks against an in-memory store and a fake iNaturalist
node server/dev.mjs         # the server on http://localhost:8787 with an in-memory store
DEV_CLAIMS=1 node server/dev.mjs   # …pretending every iNaturalist bio holds its code, so "Verify it's you" works offline
```

Open the app on `http://localhost:8765/spoodex.html` (it looks for port 8787 on localhost and LAN addresses by itself).

## Deploy (once, about 10 minutes, free plan)

1. Make a free Cloudflare account at https://dash.cloudflare.com/sign-up (you do this yourself).
2. In this folder, sign in and create the store:
   ```bash
   cd server
   npx wrangler login
   npx wrangler kv namespace create OUT
   ```
   Paste the `id` it prints into `wrangler.toml` in place of `PASTE_THE_KV_NAMESPACE_ID_HERE`.
3. Set the salt for rate limits (any long random text; it never needs to be typed again):
   ```bash
   npx wrangler secret put SALT
   ```
4. Deploy:
   ```bash
   npx wrangler deploy
   ```
   It prints the address, something like `https://spoodex.<your-subdomain>.workers.dev`.
5. Put that address in `spoodex.html`: `const SERVER = 'https://spoodex.<your-subdomain>.workers.dev';`, then ship the app as usual.
   Then open your own SPOODEX, Profile → 🏛 Your exhibition → **Verify it's you**, so you can moderate (you're in `ADMINS`).

Free-plan limits: 100,000 requests and 1,000 KV writes a day. Writes: a visit is 2 (the count and its rate limit), a guestbook post 2,
a verification about 4, an exhibition save 1. That's a few hundred visitors a day before the free plan runs out; past that, Workers Paid
($5 US a month) raises KV writes to a million a month.

## Allowed sites

`worker.js` answers only pages from `https://themoojuice.github.io` and local test addresses (`ORIGINS`). Add a new address there if the
app moves.

## Known limits

- **Spooding now** still trusts the username it's sent (no token), so someone could mark another player as "out". It shows nothing but
  "out until <time>". It could now require the verification token if that ever matters.
- KV is eventually consistent and read-modify-write: two guestbook posts in the same second can lose one, and counts can be off by a few.
  At this scale that's fine; a Durable Object would fix it if the guestbooks get busy.
