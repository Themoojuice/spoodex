# SPOODEX — handover

**As of 2026-09-28 · v1.13 · live at https://themoojuice.github.io/spoodex/?u=themoojuice**

This is the single source of truth for anyone (human or Claude) picking up the project. Read §0 first; it's enough
to start safely. The rest is reference. When you change something, update this file in the same commit.

---

## 0. Start here (the two-minute version)

- **What**: a "living Pokédex" of jumping spiders (Salticidae) built from someone's public iNaturalist records.
  Level = number of genera recorded. One self-contained file, `spoodex.html`, no build step, no backend.
- **Owner**: Brendan (iNat `themoojuice`, Cairns, Qld). An experienced spider naturalist: be taxonomically careful,
  and treat any hand-picked taxon list as something to *propose* to him, not assert.
- **Run it**: from the repo root, `python -m http.server 8765`, then open
  `http://localhost:8765/spoodex.html?u=themoojuice` (add `&vs=laz` to test Compare). Never test via `file://`.
- **Golden rules** (details in §9):
  1. Keep it one self-contained HTML file. Every iNat request goes through the throttled `api()` helper.
  2. `esc()` every interpolated string that came from iNat or a user.
  3. Naturalist look (kraft paper → herbarium → museum cabinet). Never a terminal/"matrix" look.
  4. Honest labels without disclaimers: call rarity "few iNat records" (never conservation status), say "on iNat" not "endemic".
     **No filler captions**: no quips, caveats or reassurances that don't help the user do something (owner's explicit request).
  5. Privacy: ~25 km squares at finest, no exact coordinates, nothing location-based in share links.
  6. After every edit, syntax-check (§10). Before shipping, run the smoke test (§10).
- **Ship**: `cp index.html spoodex.html site/` → `git commit` → `git push`. GitHub Pages updates in ~30 s.
  Commit and push only when the owner asks, or as part of a task he asked you to build.
- **Two invariants that bite silently**:
  - If `trimObs` starts reading a new observation field, add it to `OBS_FIELDS` (the v2 import only fetches listed fields).
  - If you add a persisted `S.x = store.get('x', …)` at module level, add `'x'` to `PERSISTED` (in the boot section),
    or it will always start empty (IndexedDB opens after module code runs).

---

## 1. The project and the people

A "living Pokédex" of jumping spiders built from a person's **real iNaturalist records**. Enter an iNat username; the
app pulls their public salticid observations, collapses them to **genus** (the collectible unit) and builds a
collection, lineage tree, scanner, quests, social comparisons, sets and more. The owner's core principle:
*the game should make you close it and go spooding.* ("Spood" is affectionate slang for a jumping spider.)

- **Owner**: Brendan, iNat login `themoojuice`: ~1,538 salticid obs, 54 genera, 87 species, home base Cairns, Qld.
- **Live site**: https://themoojuice.github.io/spoodex/ (GitHub Pages from `main`, repo root).
  `?u=<login>` opens someone's SPOODEX; `&vs=<login>` opens Compare; `&crew=a,b` opens Crew.
- **Repo**: https://github.com/Themoojuice/spoodex (public).
- **Audience**: the owner, his friends, and soon Reddit and other spider enthusiasts, most of them on phones.

## 2. Getting set up from anywhere

```bash
git clone https://github.com/Themoojuice/spoodex.git
cd spoodex
python -m http.server 8765        # any static server works
# open http://localhost:8765/spoodex.html?u=themoojuice
```

- **Claude desktop app**: the preview server is defined in `.claude/launch.json`, which is **git-ignored**, so a fresh clone
  won't have it. Recreate it if missing:
  ```json
  { "version": "0.0.1", "configurations": [
    { "name": "spoodex", "runtimeExecutable": "python", "runtimeArgs": ["-m", "http.server", "8765"], "port": 8765 } ] }
  ```
  Then `preview_start {name:"spoodex"}` and navigate to `/spoodex.html?u=themoojuice`.
- **Cloud / headless sessions**: no browser needed to work on the code. Syntax-check with Node (§10); check iNat
  behaviour with `curl` against `https://api.inaturalist.org/v1|v2/...`. You can't see the UI without a browser, so say so.
- **Pushing**: the owner's machine caches GitHub credentials in Git Credential Manager (he signs in with Google himself).
  Never ask for, look up, or enter credentials. From elsewhere, open a PR or hand back a patch.
- **Local-only copies**: `site/` (git-ignored) holds `index.html` + `spoodex.html` for drag-and-drop hosting (e.g. Netlify Drop).

## 3. Files

| File | What it is |
|---|---|
| `spoodex.html` | **The entire app**: HTML + CSS + JS (~3,300 lines). Script sections are marked `/* ---------------- <name>` |
| `index.html` | Redirects to `spoodex.html`, keeping `?query`, so `/spoodex/?u=x` works |
| `HANDOVER.md` | This file |
| `CLAUDE.md` | Short rules Claude Code loads automatically; points here |
| `README.md` | Public blurb |
| `ARCHITECTURE.md` | The original v1 design doc. Historical: its tier table and roadmap are stale |
| (linked, not copied) | The **Identification aid** (owner's interactive key to Australian salticid genera) lives in its own repo, https://github.com/Themoojuice/Identification-aid, and its own Pages site, https://themoojuice.github.io/Identification-aid/ (React/Vite, deployed by that repo's Actions workflow). SPOODEX only links to it via the `ID_AID` constant and `idAidBtn()`. Don't copy its build in here: it has its own service worker and offline package tied to `/Identification-aid/`, and a copy would go stale |
| `.gitignore` | Ignores `.claude/` and `site/` |

External dependencies (CDN): Leaflet 1.9.4 (cdnjs), Google Fonts (Special Elite, Fraunces, IBM Plex Mono, Caveat).
Map tiles: **Esri World_Topo_Map + World_Imagery (keyless)**. OSM's tile servers blocked us (tile usage policy) and
CARTO now needs a key, so don't switch back.

## 4. What the app does, tab by tab

| Tab (key) | What the user sees |
|---|---|
| **Profile** (`profile`) | "Since your last visit" panel (after 3+ h away); level, title, stats incl. sets complete; chassis/tier progress; regions; favourite lineages; field style; rarest finds; share of the record; pioneer badges; new genera per year. Title card 🪪 and Wrapped 🎁 buttons |
| **SPOODEX** (`dex`) | Four views (`S.prefs.layer`): **Genera** (cards, scope country/state/world, filters) · **Species** (side collection) · **Sets** (themed sets, sets computed from records, complete-the-lineage, every-species-in-a-genus) · **🔎 Needs ID** (one photo tile per observation stuck above genus → iNat, filter chips, "open these on iNaturalist" and 🔑 Identification aid) |
| **Lineage tree** (`tree`, tier 2) | iNat classification tree, lit where you have genera |
| **Map & scanner** (`map`) | 25 km squares you've recorded in; click anywhere to scan 25 km for genera you're missing; "active in the last 30 days"; home base (geolocate, search, or click the map) |
| **This week** (`report`) | The Spood Report: masthead, then **picks of the week (photos first, at the owner's request)**, then headlines, weekly mini-ladder and genera recorded |
| **Bounty board** (`wanted`) | Two views (`S.prefs.wantedView`): **🔎 Bounties** (default: Needs ID records within 50 km, for genera you're missing and for "unnamed spoods", with a helper tally, ranks and 🔑 Identification aid) · **🗞 Wanted posters** (this month's forecast of missing genera, posters, year calendar, case files with a map) |
| **Trip planner** (`trip`) | Search any destination → its wanted list for a chosen month, "what this trip could add", map + list of record squares, posters, calendar, case files |
| **Compare** (`compare`) | You vs one rival, built to provoke envy |
| **Ladder** (`ladder`) | Top observers of your state/country re-ranked by genera recorded there |
| **Crew** (`crew`) | You + ≤5 friends, genus matrix and a feed |
| **Quests** (`quests`) | Generated from real gaps; fixed-height tiles (`.questgrid`) |

## 5. Code map (`spoodex.html` script, by section marker)

Search for `/* ---------------- <name>` to jump. Line numbers drift; names don't.

| Section | Key functions | Notes |
|---|---|---|
| constants | `SALTICIDAE=48139`, `API`, `API2`, `ANN`, `BEH_RX`, `TIERS`, `CRITERIA`, `MASTERY_AT=7` | |
| utils | `$`, `esc`, `photoSize(url,size)`, `cellKey`, `cellLabel`, `store` | `store` = IndexedDB behind a synchronous in-memory cache (§6) |
| api | `api(path, params, base = API)` | Global throttle ≈1 request / 1.1 s (iNat asks ~1/s, ≤10k/day). On 429/5xx **or a network error** it pushes back the whole queue (iNat's 429s carry no CORS header, so they reach the browser as network errors). Pass `API2` for v2. **All iNat calls go through `api()`** |
| state | `S`, `ukey`, `saveUser`, `saveShared`, `savePrefs`, `addNode` | |
| sync | `trimObs`, `OBS_FIELDS`/`TAXON_FIELDS`, `importRecords(login, save, {full,log})`, `sync`, `loadRefs`, `placesNear(lat,lng)`, `resolveBasePlaces`, `setBase`, `geolocate`, `ensureRef(scope)` → `ensureRefPlace(pid)`, `ensureInfo(ids)`, `fetchPlaces` | Import uses **v2** `/observations` + `fields=OBS_FIELDS`: ~29 KB gzipped per 200 records vs ~470 KB on v1, verified byte-identical after `trimObs` (1,538/1,538). Incremental via `updated_since`; full resync every 14 days |
| model | `buildModel(obsMap, base)` → `M`; `genusOf`, `speciesOf`, `genusOfNode`, `lineage`, `lineageText`, `pointFor` | Pure derivation, no network |
| scope helpers | `scopeGenera`, `taxonomicOrder`, `refFor`, `refCount`, `rarityTier`, `starsFor`, `prestige`, `moduleOn` | `kind` is `'g'` or `'s'` |
| field style & titles | `fieldStyle`, `favouriteLineages`, `generatedTitle` | |
| quests | `buildQuests(M)`, `questDone(q,M)` | Derived fresh each time; completion detected on sync by diffing the pre-sync list. Kinds: `hunt` (any target genus found), `lineage`, `resolve`, `master`, `beh`, `month`, `explore`, `first`, `scan`, `base`, `info`. Includes "Complete the Set" (`nearestSet`) |
| views | `TABS`, `render`, `softRender`, `viewProfile`, `cardHtml`, `viewDex`, `viewTree`, map (`initMap`, `showCell`, `scanCell`, `fetchScan`, `showScan`, `baseWidget`), `viewQuests` | `render()` swaps `#view` innerHTML and triggers lazy loads per tab. `softRender()` debounces 400 ms and skips the map tab |
| species layer | `speciesInScope`, `speciesCard`, `viewDexSpecies`, `leadsUrl`, `viewNeedsId`, `layerSwitch`, `speciesSection(gid)` | Needs ID also lives here |
| active now | `scanActive(k)`, `activeHtml(k)` | 25 km, last 30 days |
| best months | `phenoKey(gid,pid)`, `ensurePheno(ids,pid)`, `peakInfo(gid,pid,month)`, `phenoHtml`, `phenoTag`, `phenoChart(gid,pid,month)`, `phenoUpdated` | Month-of-year histograms for any place. `[data-pheno]`/`[data-phenochart]` placeholders update in place |
| mastery fix-it | `fixIt(g, criterionKey)` | Links to the exact records that could tick a box |
| genus page | `openGenus(id)` | Modal in `#modalRoot` |
| reveal ceremony | `revealQueue(genera)` | |
| compare | `viewCompare`, `lineageRows`, `loadCompare(login)` | Most recent rival cached as `cmp` |
| regional ladder | `loadLadder`, `ladderRows`, `viewLadder`, `myStanding`, `starsIn`, `idPrestige` | One `observers` call + one in-place `taxonomy` call per person; streams; 24 h cache |
| crew mode | `setCrew`, `loadCrew`, `crewMembers`, `viewCrew`, `crewFeedHtml`, `crewUnseen` | One all-time `taxonomy` call (`captive=false`) each; 6 h refresh; feed = diff vs previous snapshot |
| share of the record | `recordShare`, `shareHtml`, `shareLine`, `inPlace`, `pctTxt` | No extra calls |
| pioneer badges | `pioneerTargets`, `drainPioneer`, `myPioneers`, `pioneerHtml` | Earliest verifiable record per (genus, place). ~180 calls for the owner, 30-day cache, drains while Profile is open |
| spood report | `loadReport`, `viewReport` | State, 7 days (`d1`), 6 h cache |
| most wanted | `homeCtx`, `wantedList(ctx)`, `sharpenWanted(ctx, redraw)`, `loadWanted`, `wView`, `wantedSwitch`, `viewWanted` → `viewBounty` / `viewWantedPosters`, `posterHtml`, `calendarHtml`, `ensureHaunts(gid,ctx)`, `hauntSummary`, `openCase(gid,ctx)`, `drawCaseMap`, `kmBetween`, `bearingTxt`, `agoTxt` | Everything takes a **ctx** `{kind, pid, centre, km, month, at, atLong, near, recent, stale, posters}` so home and trips share one ranking. Score = (1 + 1.5·log(1+nearby records) + 2 if recent) × log(10 + state records) × (0.25 + season this month) × reach, where reach = 1/(1+(km to nearest record square/100)²). Haunts: v2 `fields=id,observed_on,obscured,geojson`, 150 km radius, falls back to the region; obscured records skipped |
| trip planner | `S.trip {cur, recent}`, `tripCtx`, `setTrip`, `loadTrip`, `tripSpots`, `viewTrip`/`viewTripPlan`, `mountTripMap` | Countries, states and places with `bbox_area > 4` are planned as a whole region; anything else by what's within 50 km. Streamed updates only redraw `#tripPlan` (so the search box isn't wiped); the Leaflet element is moved between renders, not rebuilt. ≈55 calls for a fresh destination |
| sets | `THEMES`, `taxonByName`, `themeMembers`, `themeIds`, `themeGot`, `bothSexes`, `squaresOf`, `lineageSets`, `genusSpeciesSets`, `setStats(ref)`, `nearestSet(ref)`, `loadSetRefs`, `viewSets` | See §8 |
| bounty board | `bountyWhere`, `loadBounties`, `trimBounty`, `viewBounty`, `bountyRank`, `BOUNTY_RANKS` | Two v2 queries within 50 km of home (or the state): Needs ID ranked family→subtribe (`hrank`/`lrank`), and Needs ID records of genera you're missing in your state. Own records dropped client-side. "Helped" = bounty records where you have an identification, accumulated in `S.u.bounty.helped`. 1 h cache |
| since your last visit | `markVisit`, `loadNews`, `newsHtml`, `sinceTxt` | A new visit starts after 3 h away. After each sync: `taxonomy` with `created_d1=<previous visit, full ISO datetime>` within 25 km and for the state, plus a `per_page=0` count of new unnamed spoods. Dismissible until the next visit |
| analytics | `GOATCOUNTER`, `track(path, event=true)` | Anonymous counts on https://themoojuice.goatcounter.com (owner's dashboard). **Deliberately not GoatCounter's `count.js`**: it always sends `location.search`, which holds `?u=`/`?vs=`/`?crew=` usernames. `track` sends only `p` (path or event name), `t`, `s` (screen width), `r` (referrer with query stripped, page views only), `e`, `rnd`, via `sendBeacon` or an image. Skips localhost/`.test`/`file:`. Page view in `boot()`; events: `new-spoodex` (first import), `guest-mode`, `trip-planned`, `compare`, `card-download`, `card-share`. Settings says so. **Never add usernames, places or coordinates to a tracked path** |
| cards | `cardKit`, `cardPhotos`, `mountCard`, `cardBlob`, `cardExport`, `rarestFirst` | 1080×1350 canvas kit; see §11 on photo CORS |
| title card / wrapped | `drawTitleCard`, `openTitleCard` / `wrappedData`, `wrappedExtras`, `openWrapped`, `showWrapped`, `drawWrappedCard` | |
| boot / flows | `loadUser`, `updateUrl`, `copyLink`, `doSync`, `onboard`, `enterApp`, `startGuest`, `toast`, `settings`, event handlers, `PERSISTED`, `boot()` | `boot()` awaits `store.init()`, re-reads `PERSISTED`, then opens a cached user (and syncs quietly) or onboards `?u=` |

**UI event wiring**: one delegated `click` listener on `document` dispatches on data attributes, checked in this order:
`data-genus` (genus modal) · `data-close` · `data-tab` · `data-filter` · `data-layer` · `data-scan` · `data-base` (`lat|lng|label`) ·
`data-trip` (`lat|lng|area|label`) · `data-act` with its argument in `data-v`. Current actions:
`bountyGo bountyRefresh card cardPng cardShare clearBase crewAdd crewDel crewRefresh full geo guest ladderRefresh leadFilter lscope
lsort needsid newsDismiss peek reportRefresh sample sets share switch tripCase tripClear tripRefresh tripRetry vs wanted wantedRetry
wipe wrNext wrPrev wrYear wrapped wview`. Because `data-tab` is checked before `data-layer`, a link that must switch tab **and**
view needs its own `data-act` (see `sets`, `needsid`, `bountyGo`).
Forms: `data-form` = `compare | crew | placeSearch | tripSearch` (delegated `submit`). Prefs: `data-pref` on `change`; the trip
month select uses `data-tripm`. **Exception**: Leaflet popups stop click propagation, so popup buttons get direct `onclick`s.

## 6. State and storage

`S` (global): `login`, `u` (per-user save), `nodes` (taxon id → `{n,r,l,p}`), `places` (id → `{n,l}` admin level),
`info` (taxon id → `{p photo, s summary, w wiki, a attribution, c count}`), `ref` (`'p<place>'` or `'world'` →
`{ts, g:{genusId:count}, s:{speciesId:count}, t:familyTotal}`), `observers`, `pheno` (`'gid:place'` → `{ts, m:[12]}`),
`prefs`, `tab`, `M` (model), `cmp`, `ladder`, `crew`, `pioneer`, `report`, `haunts`, `trip`, `pendingVs`, `pendingCrew`.

`S.prefs`: `scope` (country|state|world), `reveal`, `peek`, `chassis`, `filter`, `layer` (genus|species|sets|needsid),
`ladderScope`, `ladderSort`, `wantedView` (bounty|posters; default bounty), `leadFilter` (taxon id or null).

Per-user save `S.u` (key `u:<login lowercased>`): `obs` (id → trimmed obs), `meta {lastSync, lastFull}`, `seen` (revealed genus ids),
`scans` (point key → `{ts, g:[{id,c}]}`), `active` (same, last 30 days, with `d1`), `completed` (quests), `base` (optional home base
`{lat, lng, label, places{country,state}, near}`), `visit {last, prev}`, `news {since, ts, dismissed, near, nearT, st, stT, unk}`,
`bounty {helped:[obs ids], data{ts, k, unk[], unkN, conf[], confN}}`.

Trimmed obs: `{id, d date, q quality_grade, cap captive, t{id,n,r,l}, anc ancestor ids (incl. self), ct community-taxon ancestry|null,
lat, lng, ob obscured, pg place_guess, pl place_ids, ph [≤3 photo urls], ann ["attr|value", net-positive votes only], beh [keyword hits]}`.

Model `M`: `obs, G (Map genusId → g), genera, S (Map speciesId → sp), species, leads ([{id, name, rank, obs[]}] stuck above genus),
xp, cells25, cellsAll01, fieldDays, dayDisc, streak, bestStreak, home{country,state}, homeCell, behObs, monthsAll, newThisYear, tier`.
A genus `g`: `obs, first, last, sp, species, c01, months, years, f (criteria flags), level 0–10, state DISCOVERED|SUPPORTED|MASTERED, xp, photos, cover, places`.

**Storage engine (since v1.7)**: everything except `prefs` and `lastLogin` lives in IndexedDB (database `spoodex`, store `kv`) as
JSON strings, so `store.get` returns a fresh copy just like localStorage did. `store.init()` (awaited in `boot`) loads every key into
`store.mem`; `store.get/set/del` are synchronous against memory; writes batch to IndexedDB after 300 ms and flush on
`pagehide`/hidden (`store.flush()` returns a promise, e.g. `wipe` awaits it before navigating). The first run moved old `spoodex:*`
localStorage saves across and deleted them only once written. With no IndexedDB (some private modes) it falls back to localStorage.
Settings shows usage via `navigator.storage.estimate()`. Other keys: `nodes places info ref observers pheno cmp ladder crew pioneer
haunts report trip`. The owner's save is ~1 MB of JSON.

Scan-point keys: a 0.25° cell `"lat:lng"` (integers) or an arbitrary point `"pt:lat,lng"`. Resolve with `pointFor(k)`.

## 7. iNaturalist facts we rely on (all verified against the live API)

- Salticidae = taxon **48139**. Australia place **6744**, Queensland **7308**. Taxon `ancestor_ids` include the taxon itself on v1 and
  on v2 `taxon`, but **not** on v2 `identifications[].taxon` (`trimObs` handles both).
- `GET /v1/observations/taxonomy?taxon_id=48139&…` returns a whole tree (`rank`, `parent_id`, `descendant_obs_count`) for any
  `user_login`, `place_id`, or `lat/lng/radius`, with `d1` (observed) or `created_d1` (uploaded) windows. **`created_d1` accepts a full
  ISO datetime.** One call gives genus + species counts. The worldwide tree (`verifiable=true`) is ~2,700 nodes / ~60 KB gzipped.
- v2 `GET /v2/observations?fields=…` returns only the requested fields. Nested fields use RISON, e.g.
  `(id:!t,taxon:(id:!t,name:!t),photos:(url:!t))`. v2 honours `id_above`, `updated_since`, `hrank`/`lrank`, `quality_grade`,
  `created_d1`, lat/lng/radius, and `per_page=0` for a bare count.
- `GET /v1/observations/histogram?taxon_id=G&place_id=P&interval=month_of_year&verifiable=true` → `results.month_of_year`.
- `GET /v1/observations/observers?taxon_id=…&place_id=…` → top observers.
- `GET /v1/places/autocomplete?q=` → `location "lat,lng"`, `admin_level` (0 country, 10 state, 20 county/LGA, null for parks etc.),
  `bbox_area` (deg²). `GET /v1/places/{ids}`.
- `GET /v1/taxa/{≤30 ids}` → `default_photo`, `wikipedia_summary`.
- Annotations: **Sex = 9** (Female 10, **Male 11**), **Life stage = 1** (Adult 2, Nymph 5, Juvenile 8), **Evidence = 22** (Egg 30, Molt 28, Construction 35).
- Pagination: `per_page=200&order_by=id&order=asc&id_above=<last>` avoids the 10k page cap.
- Needs ID stuck above genus: `taxon_id=48139&hrank=family&lrank=subtribe`; exactly one taxon: `taxon_id=X&rank=<X's rank>`
  (owner: 305 and 105 for Salticinae, matching the app with `captive=false`).
- **Rate limits**: iNat asks for ~1 req/s and ≤10k/day per client, and returns 429s with no CORS header. Bursts from `curl` plus the
  app sharing an IP get empty responses: wait a minute. Rough call costs: fresh import ≈ 1 per 200 obs + 3; ladder ≈ 26; pioneer ≈ 180;
  wanted posters ≈ 40; a trip ≈ 55; bounties 3; news 3; sets 1–2 (world tree).
- **The iNat website is behind a Cloudflare bot check.** Automated browsers get "Just a moment…". Don't try to bypass it; verify
  web-link filters by running the same parameters against the API.
- Test accounts: `themoojuice` (owner), `laz` (Qld, 38 genera, 60 species; the standard compare test, 1,180 obs), `natashataylor`,
  `rattyexplores`, `scottwgavins`.

## 8. Game rules

- **Level = number of genera.** Species are a side collection and never drive level (owner's explicit choice). Sets are side goals too.
- States: Unknown (greyed photo, `???` unless "reveal names") → Glimpsed/Needs ID (stuck above genus) → Discovered →
  Supported (community taxon within the genus; **not** Research Grade) → Mastered (7 of 10 `CRITERIA`).
- Tiers/chassis: 0 Mk 0 · 5 Field Notebook · 15 Mk II (lineage tree) · 30 Mk III (rarity) · 50 Naturalist Cabinet · 75 Arachnologist Rig ·
  100 Research Station. Skins `notebook` / `kit` / `cabinet`. ⚙ → "peek" unlocks everything.
- Rarity ★1–3 = tertile of iNat record count within scope; absent from scope = ★★★. Prestige ✦ = Σ genera 10×★ + Σ species 3×★.
- Streaks count consecutive **field days** with a new genus.
- **Sets** (`THEMES` + automatic):
  - Curated (taxon names at any rank; starter content for the owner to edit): 🦚 Peacock spiders (*Maratus* species),
    🐜 Ant mimics (hand-picked genera; the tribe Myrmarachnini wasn't used because it also holds *Judalana*, *Damoetas* etc.),
    🕸 Portia & the spartaeines (Spartaeinae), 🌿 Beyond Salticinae (every other subfamily), ⭐ Celebrities (11 famous species, worldwide).
  - Computed: 🏡 Local specialties (≥90% of a genus's verifiable iNat records are in scope, ≥5 worldwide), 👻 Ghost list (≤25 records
    in scope), 💞 Couples (your species with both Male and Female annotations), 🧭 Wanderers (your genera in ≥5 different 25 km squares).
  - Automatic: complete-the-lineage (each tribe, or subfamily without tribes, with ≥2 genera in scope) and every-species-in-a-genus
    (each genus you have with ≥2 species in scope).
  - "Complete the Set" quest = the started genus set (not Couples/Wanderers) with the fewest left, ≤3.
- Bounty ranks: 1 Deputy · 5 Bounty hunter · 15 Marshal · 40 Sheriff · 100 Legend of the ID frontier.

## 9. Owner preferences and guardrails (don't regress these)

- **Aesthetic**: natural-history. The owner rejected a green-on-black terminal look. Keep kraft → herbarium → cabinet. On the dark
  cabinet skin, headings sitting directly on the wood need the light colour rule (`[data-chassis="cabinet"] #view > h2`; extend it
  if you nest content in a wrapper like `#tripPlan`).
- **Honest labelling**: rarity = record frequency, never conservation status. Classification follows iNat. Say "on iNat" rather
  than "endemic". Get this right through the wording itself, not by adding disclaimers.
- **No filler text** (owner, v1.12): he called lines like "Nature does not owe you a spider every Tuesday", "A record-frequency
  measure, not conservation status" and "It's about iNat's record, not who discovered it" AI slop, and ~50 were removed. Don't add
  short qualifying statements, jokes, pep talks ("Cheeky.", "Be the first!", "Keep it that way") or reassurances that give the user
  nothing to act on. Captions should explain what a number means or what to do next, and nothing else. Kept deliberately: the
  location privacy note by the home-base controls, the GoatCounter disclosure in Settings, photo attribution, and the chassis tier
  names and subtitles (game flavour).
- **Taxonomic care**: propose curated taxon lists to the owner; don't present them as settled. Check names against the live iNat tree.
- **Privacy**: ≥25 km squares only, no exact coordinates (bounty distances rounded to 5 km), home base rounded to ~0.01° and kept in
  the browser, trips kept in the browser. Share links carry only `?u=`, `?vs=`, `?crew=` (usernames).
- **No backend** yet; public read-only iNat data; no OAuth. The only third party is GoatCounter (anonymous counts, §5). Single file until it clearly outgrows that (then Vite + TS).
- **Mobile matters**: most visitors will be on phones. No horizontal page scroll at 375 px.
- Never help find or enter the owner's credentials.
- Tone: plain and useful. Playfulness lives in names (tiers, quests, sets, bounty ranks), not in extra sentences.

## 10. How to work on it

**Editing** (the file is big):
- Small edits: the Edit tool, or Python `str.replace` with `assert s.count(old) == 1`.
- Big changes: write new code to a scratch file and splice it in with a Python patch script (replace between two section markers).
  Inline heredocs over ~30 KB fail on Windows (ENAMETOOLONG).
- Style: terse template-literal views; `esc()` on **every** interpolated iNat/user string (quest `title`/`text` are escaped when
  rendered); 2-space indent; comments only for non-obvious "why"; match surrounding idiom.

**Syntax check after every edit** (from the repo root):
```bash
python -c "s=open('spoodex.html',encoding='utf-8').read();open('_c.js','w',encoding='utf-8').write(s[s.index('<script>\n')+9:s.rindex('</script>')])" && node --check _c.js; rm -f _c.js
```

**Drive the app from the browser console**: `S`, `S.M`, `render()`, `S.tab='quests'; render()`, `openGenus(id)`, `openCase(id)`,
`loadCompare('laz')`, `store.mem` (all saved keys). To test as a new visitor: `store.del('lastLogin'); await store.flush()` then load
without `?u`. To simulate "since your last visit": `S.u.visit.prev = Date.now() - 3*864e5; delete S.u.news; loadNews()`.

**Smoke test before shipping** (paste into the console on `?u=themoojuice`; expect no THROW and an empty `errs`):
```js
window.__errs=[]; addEventListener('error',e=>__errs.push(e.message));
const out=[], run=(n,f)=>{try{f();out.push([n,'ok'])}catch(e){out.push([n,'THROW '+e.message])}};
for (const t of TABS) run(t.k, ()=>{S.tab=t.k; render();});
for (const l of ['genus','species','sets','needsid']) run('dex:'+l, ()=>{S.tab='dex'; S.prefs.layer=l; render();});
for (const w of ['bounty','posters']) run('wanted:'+w, ()=>{S.tab='wanted'; S.prefs.wantedView=w; render();});
for (const [n,f] of [['genus',()=>openGenus(S.M.genera[0].id)],['case',()=>openCase(wantedList()[0].id)],['settings',settings],['card',openTitleCard],['wrapped',()=>openWrapped()]]) { run('modal:'+n,f); $('#modalRoot').innerHTML=''; }
S.prefs.layer='genus'; S.prefs.wantedView='bounty'; savePrefs(); ({out, errs:__errs})
```
Then repeat the tab loop at phone width (375 px) and check `document.documentElement.scrollWidth === innerWidth`, and try guest mode
("Explore near me") on a fresh load. In the Claude desktop browser pane, screenshots sometimes time out or show a stale frame when the
pane is in the background: rely on DOM checks (`read_page`, `javascript_tool`) and retry, or toggle `resize_window` mobile → desktop.

**Ship**: `cp index.html spoodex.html site/` → `git commit` (message ends with the attribution line from the session's system
reminder) → `git push`. Confirm it's live: `curl -s "https://themoojuice.github.io/spoodex/spoodex.html?nc=$RANDOM" | grep -c <new identifier>`.

## 11. Known issues and caveats

- Incremental sync uses `updated_since`; unconfirmed whether adding an annotation bumps `updated_at`. The genus page suggests
  ⚙ → Full resync if a mastery box doesn't tick. (Full resync also runs every 14 days.)
- Web links (fix-it, Needs ID) use Explore params the API honours; the website itself can't be checked by automation (Cloudflare).
  If the owner reports a wrong link, switch to explicit `id=` lists.
- **Photo CORS**: `static.inaturalist.org` (all-rights-reserved photos, most of them, including all of the owner's) sends no
  `Access-Control-Allow-Origin`, so they taint a canvas. `inaturalist-open-data.s3.amazonaws.com` (CC photos) sends `*`. Card PNG
  downloads therefore use name plates for all-rights-reserved photos. A fix needs a tiny image proxy (e.g. a Cloudflare Worker),
  which would be the first backend. Don't cache-bust S3 URLs with `?cors=` (S3 returns its CORS config); the card uses `?spoodex=card`.
- `ensureInfo` has one `infoBusy` flag; concurrent requests are dropped, not queued (they're retried on the next render).
- Behaviour detection is keyword-based (`BEH_RX`) and heuristic.
- Ladder = top 25 observers **by record count**, re-ranked by genera; ladder counts verifiable in-place records, crew counts all
  non-captive records (so they differ by design).
- iNat taxonomy quirks show through (e.g. a genus with no tribe shows "· Salticinae"; a stray *Lyssomanes* record in Queensland is
  almost certainly a misidentification). That's data, not a bug.
- Only tested in depth with Australian accounts. Other countries should work (all queries are place-based), but check with a US and
  a European account before promoting widely.
- The tab bar has 11 tabs and scrolls sideways on phones.

## 12. Backlog and ideas (owner-approved or discussed; not built)

**Before posting publicly (discussed 2026-09-28)**:
- **Usage analytics**: DONE in v1.11 (GoatCounter, see §5 "analytics"). Stats: https://themoojuice.goatcounter.com (owner signs in).
- **Mobile navigation**: group the 11 tabs into ~4 sections (e.g. Collection / Explore / Social / Quests).
- **Test outside Australia**; consider showing progress as a % of the regional total for low-diversity regions (e.g. the UK has ~20 genera).
- **Full-photo share cards** via an image proxy (see §11).

**Sets not built yet** (the owner chose others first): House guests (cosmopolitan synanthropes: *Hasarius adansoni*, *Plexippus
paykulli*, *Menemerus bivittatus*, *Salticus scenicus*), Ant-eaters (e.g. *Zenodorus*), Masters of disguise (beetle/bird-dropping/bark
mimics; owner to choose genera), Heavyweights & tiny ones (owner's call), Seasonal sets (winter/wet-season spoods from pheno data),
Caught in the act (feeding/courtship/silk across 5+ genera).

**Other ideas**: "often confused with" per genus (`/identifications/similar_species`) plus owner-written field notes; an identifier
track (IDs you've made for others); pick your own cover photo per genus; a VS share card; shareable trip links (place id only, never
coordinates); multi-stop trips; ladder envy hooks ("you'd pass X with 2 more genera"), a ladder quest and `&ladder=` links; rendering
cards progressively during a first import; generalising beyond jumping spiders (big growth lever, but dilutes the identity; hold unless asked).

## 13. Version history

| Version | What shipped |
|---|---|
| v1.0–1.3 | Core collection, lineage tree, scanner, quests, compare, species layer, active now, best months, mastery fix-it links |
| v1.4 | Regional ladder, crew mode, title cards |
| v1.5 | Pioneer badges, share of the record, Spood Report (This week), Wrapped, crew feed |
| v1.6 | Most Wanted: forecast, wanted posters, hotspot case files |
| v1.7 | IndexedDB storage (with migration), v2 imports with `fields=` (~6% of the download), Trip planner |
| v1.8 | Sets (themed + complete-the-lineage), Bounty board, "since your last visit" |
| v1.9 | Most Wanted tab renamed Bounty board (bounties first), SPOODEX › Needs ID layer, fixed-height quest tiles |
| v1.13 | 🔑 Identification aid button (Needs ID view, Bounty board) opens the owner's genus key in one reused popup window |
| v1.12 | Removed ~50 filler captions, disclaimers and quips across the app |
| v1.11 | GoatCounter analytics (hand-rolled beacon, no usernames); Spood Report leads with picks of the week |
| v1.10 | Sets: Local specialties, Ghost list, Every species in a genus, Couples, Wanderers, Celebrities; Needs ID "open these on iNaturalist" links (follow the filter); weekly ladder table fits phones; guest wording on Needs ID; this handover rewrite |
