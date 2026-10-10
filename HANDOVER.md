# SPOODEX — handover

**As of 2026-10-11 · v2.3 "Simplify", live at https://themoojuice.github.io/spoodex/?u=themoojuice (tags `v1.20.0`, `v2.0.0`)**

This is the single source of truth for anyone (human or Claude) picking up the project. Read §0 first; it's enough
to start safely. The rest is reference. When you change something, update this file in the same commit.

---

## 0. Start here (the two-minute version)

- **What**: a "living Pokédex" of jumping spiders (Salticidae) built from someone's public iNaturalist records.
  Level = number of genera recorded. One self-contained file, `spoodex.html`, no build step, no backend. Since v1.15 it is also an
  installable, offline-capable app via two sidecars, `sw.js` and `manifest.webmanifest`, plus two icons.
- **Owner**: Brendan (iNat `themoojuice`, Cairns, Qld). An experienced spider naturalist: be taxonomically careful,
  and treat any hand-picked taxon list as something to *propose* to him, not assert.
- **Run it**: from the repo root, `python -m http.server 8765`, then open
  `http://localhost:8765/spoodex.html?u=themoojuice` (add `&vs=laz` to test Compare). Never test via `file://`.
- **Golden rules** (details in §9):
  1. Keep the app in one self-contained HTML file. The only sidecars (owner-approved, v1.15) are `sw.js`, `manifest.webmanifest`
     and `icon-192.png`/`icon-512.png`: put nothing in the service worker that can live in `spoodex.html`. Every iNat request goes
     through the throttled `api()` helper.
  2. `esc()` every interpolated string that came from iNat or a user.
  3. Naturalist look (kraft paper → herbarium → museum cabinet). Never a terminal/"matrix" look.
  4. Honest labels without disclaimers: call rarity "few iNat records" (never conservation status), say "on iNat" not "endemic".
     **No filler captions**: no quips, caveats or reassurances that don't help the user do something (owner's explicit request).
  5. Privacy: ~25 km squares at finest, no exact coordinates. Share links carry usernames; event links (`?ev=`) may also carry
     dates, taxon ids and iNat **place ids** (owner-approved, v1.16), never coordinates (§9).
  6. After every edit, syntax-check (§10). Before shipping, run the smoke test (§10).
  7. Other people's photos only under CC0, CC BY or CC BY-NC, always credited and linked; the owner's own photos first (§9, v1.20).
  8. **Nothing invented** (v2.0): every factual line comes from a named data field (iNat, ALA, or the owner's constants) and is left out
     when the field is missing. The **taxonomy rule**: Australia's checklist is `TAXA_AU` (iNat ∪ the owner's Lucid key, minus owner-approved junior synonyms; 89 genera on 2026-10-08);
     museum data only describes taxa already on it. Field stories only from papers the owner supplies and approves (§9).
- **Ship**: bump `VERSION` in `sw.js` → copy the site files to `site/` → `git commit` → `git push` (§10). GitHub Pages updates in ~30 s.
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
- **Local-only copies**: `site/` (git-ignored) holds the site files (`index.html`, `spoodex.html`, `sw.js`, `manifest.webmanifest`,
  `icon-192.png`, `icon-512.png`) for drag-and-drop hosting (e.g. Netlify Drop).

## 3. Files

| File | What it is |
|---|---|
| `spoodex.html` | **The entire app**: HTML + CSS + JS (~5,500 lines). Script sections are marked `/* ---------------- <name>` |
| `index.html` | Redirects to `spoodex.html`, keeping `?query`, so `/spoodex/?u=x` works |
| `sw.js` | Service worker (v1.15), registered as `./sw.js` so its scope is `/spoodex/`. Caching rules in §5 "offline & install". **Bump `VERSION` on every release** |
| `manifest.webmanifest` | Web app manifest: `start_url ./spoodex.html` (boot reopens `lastLogin`), `scope ./`, `display standalone`, background and theme `#e7d8b9` (notebook `--bg`) |
| `icon-192.png`, `icon-512.png` | **Placeholder** app icons (a face-on spood on ruled kraft, glyph inside the maskable safe zone; listed as both `any` and `maskable`). The owner will swap in sticker art: keep the sizes and file names, and bump `VERSION` |
| `HANDOVER.md` | This file |
| `CLAUDE.md` | Short rules Claude Code loads automatically; points here |
| `README.md` | Public blurb |
| `IDEAS.md` | Ideas noted during builds, for the owner to choose from later (not built, not promised) |
| `ARCHITECTURE.md` | The original v1 design doc. Historical: its tier table and roadmap are stale |
| (linked, not copied) | The **Identification aid** (owner's interactive key to Australian salticid genera) lives in its own repo, https://github.com/Themoojuice/Identification-aid, and its own Pages site, https://themoojuice.github.io/Identification-aid/ (React/Vite, deployed by that repo's Actions workflow). SPOODEX only links to it via the `ID_AID` constant and `idAidBtn()`. Don't copy its build in here: it has its own service worker and offline package tied to `/Identification-aid/`, and a copy would go stale |
| `.gitignore` | Ignores `.claude/` and `site/` |

External dependencies (CDN): Leaflet 1.9.4 (cdnjs), Google Fonts (Special Elite, Fraunces, IBM Plex Mono, Caveat), and
**MapLibre GL JS 5.24.0** (cdnjs, loaded lazily the first time the 3D map opens; `MAPLIBRE` constant). MapLibre 6 is ESM-only
(`.mjs` plus worker modules) and cdnjs carries only its CSS, so 5.24.0 is the newest release cdnjs serves as a script.
Map tiles: **Esri World_Topo_Map + World_Imagery (keyless)**. OSM's tile servers blocked us (tile usage policy) and
CARTO now needs a key, so don't switch back. MapLibre needs CORS on tiles (Leaflet didn't): Esri and the terrain tiles both send
`Access-Control-Allow-Origin: *` (checked in a real browser, 2026-10-04).
Terrain: **AWS Terrain Tiles, terrarium encoding** (`TERRAIN_TILES`, `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`,
keyless, CORS `*`). Decode: metres = R×256 + G + B/256 − 32768 (tilezen `docs/formats.md`). Attribution (`TERRAIN_ATTR`) is the full
"Required attribution" list from https://github.com/tilezen/joerd/blob/master/docs/attribution.md, including "Australia terrain data
© Commonwealth of Australia (Geoscience Australia) 2017" and "…global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological
Survey". It sits behind the map's ⓘ button (collapsed on load because it's long). Esri's credits are unchanged.
The service worker caches tiles **only as they're viewed** (≤ ~600); never bulk-prefetch
an area (Esri's terms).

External services besides iNat:
- **Open-Meteo** (since v1.15, "Spooding weather"): `https://api.open-meteo.com/v1/forecast` with
  `hourly=temperature_2m,precipitation_probability,precipitation,cloud_cover,wind_speed_10m,shortwave_radiation,is_day&timezone=auto&forecast_days=7`.
  No key. Sent: the home base rounded to 0.1° (~10 km), nothing else. Response: `utc_offset_seconds` and `hourly.<field>[]` aligned with
  `hourly.time[]` (local times like `2026-10-05T09:00` at that point; checked 2026-10-04). **The free tier is non-commercial only**
  (600 calls/min, 10,000/day) and its data is **CC BY 4.0**: the panel credits "Weather: Open-Meteo" with a link to open-meteo.com.
  **If SPOODEX ever charges (subscriptions, ads, paid features), this needs Open-Meteo's paid API plan.**
- **Atlas of Living Australia** (v2.0, "museum records"; ⚙ switch `S.prefs.ext.ala`, default on, disclosed in Settings: "Sent: taxon names
  and your scan squares"). Name matching `https://api.ala.org.au/namematching/api/search?q=` (authority) and biocache
  `https://biocache-ws.ala.org.au/ws/occurrences/search` / `/occurrence/<uuid>` (holotypes, earliest specimens, specimen genera in a box).
  No key; CORS works from localhost and github.io. Its own queue per host (`extFetch`, ≈1 request/s), not `api()`. Details in §7.
- **GoatCounter**: anonymous counts (§5 "analytics").

## 4. What the app does, tab by tab

**Landing** (`#onboard`, shown to anyone with no saved user): the pitch line, a strip of 12 real jumping spiders (photo, genus, iNat
common name, credit; each links to its iNat record), then three starts in this order: **🧭 See what jumping spiders live near you**
(guest mode, no account), **Already on iNaturalist? Enter your username**, **👀 Peek at a full collection** (`SAMPLE_LOGIN`). On phones
the strip scrolls sideways under the pitch so the first start is on the first screen; credits wrap so the licence is always readable.
The strip and pitch stay up during an import and are hidden once the naturalist's own photos start flipping. A guest (or anyone with no
genera) who picks a first home base lands on **Profile** (Three to find next, with photos) rather than the Map's weather; returning guests
with a base open on Profile too.

**Tabs open up with the collection** (v1.20, `TABS[].at`, levels in §12): a new player sees Profile, SPOODEX, Map & scanner, Crew and
Quests; Trip planner and Compare at 5, Bounty board and Ladder at 10, Lineage tree at 15. A tab also opens for
good when a link or button takes you there (a `?vs=` or event link, "Bounty board →"); ⚙ "Show every tab and module" (`peek`) shows
all. Newly opened tabs toast "Unlocked: Trip planner (Go spooding)" and carry a ● until visited. On phones the header is one line (tier name, "Lv N",
icon-only ⟳ 🔗 ⚙ with `aria-label`s) above the section row and the view row: 112 px of an 812 px screen (141 px on Go spooding, whose four views wrap onto two lines).

**Three sections** (v2.3, `SECTIONS`, owner 2026-10-10/11: ten tabs in one row were too many). The header's main row is **Collection**
(Profile, SPOODEX, Lineage tree) · **Go spooding** (Map & scanner, Quests, Bounty board, Trip planner) · **Mates** (Crew, Compare, Ladder); the
open section's views sit in a lighter row under it (none when the section has only one open view). The tabs below are still the units:
`S.tab` keys, `data-tab` buttons, deep links and unlock levels are unchanged. A section shows once any of its views is open, reopens on the
view you last used in it (`S.prefs.secLast`), and shows a ● while one of its views has one. Reloading still opens Profile, as before.

**Removed in v2.2 (owner, 2026-10-08, to keep it uncluttered)**: the **This week** tab (the Spood Report: picks of the week, headlines,
weekly mini-ladder; *Since your last visit* on Profile and the Ladder already covered it) and **field mode** (the full-screen field
compass and its header button). Both are in git history (tag `v2.1.1` and earlier) if they're ever wanted back.

| Tab (key) | What the user sees |
|---|---|
| **Profile** (`profile`) | Short since 2026-10-08 (owner: the ledgers made it long and cluttered): the level, title and the headline ("53 / 80 genera on iNat in Australia · +1 elsewhere", `headline()`, v2.3) with 📤 My SPOODEX image, 🪪 Title card and 🎁 Wrapped; **Your spoods** (one photo per genus, newest first, then up to 6 mystery spoods); **Three to find next**; "Since your last visit"; the photo checklist once for anyone under 15 genera; the **trophy cabinet**; then **Your numbers**, a row of tiles (records · ledger, local areas, lineages · field style, share of the record, pioneer badges, new genera this year). Each tile opens its detail in a sheet (`openProfSheet`): the ledger with chassis and streak, regions, favourite lineages + field style + rarest finds, share of the record, pioneer badges, new genera per year. A tile appears only when its sheet has something to show; zero or tiny numbers stay hidden as before. Guests and anyone with 0 genera get Three to find (or "Set a home base") first, then the upload loop |
| **SPOODEX** (`dex`) | Four views (`S.prefs.layer`): **Genera** (cards, scope country/state/world, filters; since v2.4 a found card has a rarity-coloured edge from Uncommon up with its tier chip on the photo, a foil sweep on Rare and Exceptional on hover, a specimen label (genus, common name, `#num · tribe`, stats) and a ↻ button that turns it over to its back: dates, records, 25 km squares, species, rarity with its record count, mastery and the photographer; Esc turns it back) · **Species** (side collection) · **Sets** (themed sets, sets computed from records, complete-the-lineage, every-species-in-a-genus) · **❓ Mystery spoods** (v1.20; was 🔎 Needs ID, key still `needsid`): one tile per record stuck above genus with its photo, current ID, photo count (red under 3), **Ask for an ID ↗** (the record) and **Add photos ↗** (its iNat edit page); the photo checklist (open for anyone under 15 genera), filter chips, "open these on iNaturalist" and 🔑 Identification aid |
| **Lineage tree** (`tree`, from 15 genera) | **Museum drawers** (2026-10-08; `S.prefs.treeView`, 🗄 Drawers / 🌿 Outline, the old text tree kept as Outline). Header: the headline (`headline()`), lineages explored, Australia's checklist. **Did you know?** strip: up to 12 genera you haven't found (owner facts first, then near you / never on iNat / fewest records in turn), each with a licence-checked photo (or a curated plate), up to three facts and 🧭 Where to look. Then one section per subfamily with a photo banner (your best pick in it), a **drawer** per tribe (genera iNat gives no tribe go in "Other *<subfamily>*") with a hero photo, a progress ring, mystery spoods counted at that tribe, genus tiles (your photo, or a blurred silhouette; rarity colour underline; names hidden unless "reveal names") and "🧭 Next to light" (the top wanted genus in that drawer, with why). Last: 🏛 *Known from Australia, not on iNat there*, as specimen labels or curated images (`PLATES`) |
| **Map & scanner** (`map`) | Redesigned in v1.17, streamlined in v1.19 (owner: key info in one place, the side panel, nothing repeated). **Spooding weather** on top, full width: where it's for ("near Cairns – Barron (your home base)"), one card per day for today + 6 with its best window, 1–5 stars, a stripe of the day hour by hour (window outlined, past hours hatched), temperature, sky, rain chance and any rebound reason ("🌧 after 11 mm of rain"), then a best-bet line. Phones: one row per day. **3D map** (default with WebGL2; 2D if WebGL won't start): your squares dotted green, the home area and the scan area as dashed squares, fog of war, ⌂ home. Under Terrain / Satellite: switches for **Fog of war**, **Your squares** and **Frontier** (remembered). **Tap anywhere** to scan around that point at the panel's area and window; no popup and no coloured missing-genus squares (both removed in v1.19: the squares didn't line up with the scan outlines under 3D terrain, and the popup repeated the panel). Phones get a badge on the map ("14 genera here · 2 new to you ↓") that jumps to the panel. **2D** toggle: the Leaflet map with the same layers and tap. **Scan panel** (right; below the map on phones): recent-scan chips, the place, your records in the pin's grid square, frontier counts (with that layer on), Make this my home base, area and window chips, counts (genera, new to you, species, new species), Genera / Species tabs, new-to-you rows by most records (both ends shown when long) with tier, 🔥 last 30 days, records and season, then "already yours"; home base controls folded into its footer |
| **Bounty board** (`wanted`) | Two views (`S.prefs.wantedView`): **🔎 Bounties** (default: Needs ID records within 50 km, for genera you're missing and for "unnamed spoods", with a helper tally, ranks and 🔑 Identification aid) · **🗞 Wanted posters** (this month's forecast of missing genera, posters, year calendar, case files with a map) |
| **Trip planner** (`trip`) | Search any destination → its wanted list for a chosen month, "what this trip could add", map + list of record squares, posters, calendar, case files |
| **Compare** (`compare`) | You vs one rival, built to provoke envy |
| **Ladder** (`ladder`) | Top observers of your state/country re-ranked by genera recorded there |
| **Crew** (`crew`) | **Events** first (v1.16): active event cards (name, mode, your rank, time left), **🗓 This month's spood hunt** (v1.20) and ＋ New event, finished events; the automatic monthly **🏆 Crew Cup**. Then the crew: you + ≤5 friends, genus matrix and a feed (which also carries event news). An open event replaces the tab's content, with "← All events" |
| **Quests** (`quests`) | Generated from real gaps; fixed-height tiles (`.questgrid`) |

## 5. Code map (`spoodex.html` script, by section marker)

Search for `/* ---------------- <name>` to jump. Line numbers drift; names don't.

| Section | Key functions | Notes |
|---|---|---|
| constants | `SALTICIDAE=48139`, `API`, `API2`, `ANN`, `BEH_RX`, `TIERS`, `CRITERIA`, `MASTERY_AT=7` | |
| utils | `$`, `esc`, `photoSize(url,size)`, `cellKey`, `cellLabel` (screen name of a square, never finer than 0.25°; names cached per model in `cellNames`), `store` | `store` = IndexedDB behind a synchronous in-memory cache (§6) |
| api | `api(path, params, base = API)` | Global throttle ≈1 request / 1.1 s (iNat asks ~1/s, ≤10k/day). On 429/5xx **or a network error** it pushes back the whole queue (iNat's 429s carry no CORS header, so they reach the browser as network errors). Pass `API2` for v2. **All iNat calls go through `api()`**. When `navigator.onLine` is false (checked before each attempt and after a failed fetch) it throws `Offline` at once instead of backing off, so Sync, scans, Compare, Ladder etc. say "Offline" |
| state | `S`, `ukey`, `saveUser`, `saveShared`, `savePrefs`, `addNode` | |
| sync | `trimObs`, `OBS_FIELDS`/`TAXON_FIELDS`, `importRecords(login, save, {full,log})`, `sync`, `loadRefs`, `placesNear(lat,lng)`, `resolveBasePlaces`, `setBase`, `geolocate`, `ensureRef(scope)` → `ensureRefPlace(pid)`, `ensureInfo(ids)`, `fetchPlaces` | Import uses **v2** `/observations` + `fields=OBS_FIELDS`: ~29 KB gzipped per 200 records vs ~470 KB on v1, verified byte-identical after `trimObs` (1,538/1,538). Incremental via `updated_since`; full resync every 14 days |
| model | `buildModel(obsMap, base)` → `M`; `genusOf`, `speciesOf`, `genusOfNode`, `lineage`, `lineageText`, `pointFor` | Pure derivation, no network. A genus cover is the owner's pick when that record is in the collection (`OWNER_PICKS`), else the first research-grade photo, else any photo |
| scope helpers | `scopeGenera`, `headline(scope)` → `{found, total, extra, away, where}` or null, `headlineHtml`/`headlineText`/`headlineExtra`, `taxonomicOrder`, `refFor`, `refCount`, `rarityTier`, `starsFor`, `prestige`, `moduleOn` | `kind` is `'g'` or `'s'`. **One headline count** (v2.3): every screen that prints the collection fraction (reveal, Profile, SPOODEX, Lineage, My SPOODEX image) uses `headline()`: genera found out of the scope's iNat list, plus "+N elsewhere" for genera recorded that aren't on it ("+N more" if any of those has a record inside the scope place, e.g. a casual one), so found + extra = the level. The "N of M genera known from Australia" checklist count is only in SPOODEX › 🏛 Never on iNat |
| field style & titles | `fieldStyle`, `favouriteLineages`, `TITLE_GEN`, `titleParts(M, login)`, `generatedTitle(M, login)` (plain, canvases), `titleHtml(M, login)` (genus in italics) | **Titles** (owner, 2026-10-07, second version; replaced the tribe-adjective + noun ladder): an empowering adjective and a genus, alliterative where possible ("Magnificent *Mopsus*"). The genus climbs a ladder from the most-recorded on iNat (*Phidippus* at 0 genera) to rarer, more celebrated ones (*Portia* at 100); each rung has three adjectives and a naturalist keeps one, chosen by `hash32` of their login so it never changes. Owner: "Masterful *Mopsus*"; a guest: "Plucky *Phidippus*". List in §12 |
| quests | `buildQuests(M)`, `questDone(q,M)` | Derived fresh each time; completion detected on sync by diffing the pre-sync list. Kinds: `hunt` (any target genus found), `lineage`, `resolve`, `master`, `beh`, `month`, `explore`, `first`, `scan`, `base`, `info`. Includes "Complete the Set" (`nearestSet`) |
| silhouette (v2.4) | CSS `--sil` on `:root` (a data-URI SVG: a generic jumping spider from above, ink line), `.sil` | The one empty-slot drawing, used as a mask so it takes the theme's ink: missing cards and unrevealed reveal tiles (`::after`), Three to find and Did you know? tiles without a photo, event finds without a photo, the landing's loading tiles. Redraw it by replacing that one url |
| cards (v2.4) | `rarAttrs(id)` → `{r, cls, style}` (edge class `rar rarN` and `--rc`, Uncommon up), `cardBack(id)`, `turnCard(card, open)` (`data-act="flip"`) | Used by `cardHtml`, Profile's Your spoods (`.lcard`), the reveal's tiles (`flipCard`) and the My SPOODEX image (`K.tile` strokes the tile in the rarity colour) |
| views | `TABS` (`at` = genera to open the tab), `SECTIONS`, `secOf(k)`, `navHtml()` (both header rows), `tabEarned`, `tabOn`, `tabNews`, `render`, `softRender`, `viewProfile` (builds `profSheets` {key: {t title, h html}} for the number tiles; `openProfSheet(k)` shows one; the pioneer tile's count is a `[data-piocount]` span that `pioneerUpdated` updates in place, so the 440-check drain doesn't redraw Profile) (`nextKey`/`nextAt`: Three to find reloads when the home square, region or month changes, or after 6 h), `cardHtml`, `viewDex`, `viewTree`, `viewQuests` | `render()` swaps `#view` innerHTML and triggers lazy loads per tab (map: `initMap()` then `loadWx()`). `softRender()` debounces 400 ms and skips the map tab |
| scan areas & rarity | `boxOf(c, km)` (`km` = 'sq' for the grid square itself), `boxQ`, `boxRing`, `boxBounds`, `cellBox`; `RARITY`, `tierIn(table, id)`, `tierOf(id, kind, scope)`, `rarityOf(id, kind, pid)`, `rarityTier`, `starsIn`, `starsAt`, `rarityIdx`, `rarityChip` | **Every "within N km" search is a square** (v1.17): iNat's bounding box (`swlat/swlng/nelat/nelng`) reaching N km north, south, east and west, so every outline drawn is exactly the area searched. Used by map scans, the home scan (`fetchScan`, ±25 km), active now, haunts (±150 km), trips (±50 km), bounties (±50 km) and "since your last visit" (±25 km). Only `placesNear` still uses a radius, and it's never drawn. **One rarity language** (v1.18, owner's choice): five colour tiers by a taxon's rank among all genera (or species) recorded in the scope, rarest first: red Exceptional ≤ 10% (or not recorded there at all), blue Rare ≤ 25%, yellow Scarce ≤ 45%, green Uncommon ≤ 70%, white Common. `lv` 5…1 is the numeric weight: prestige = Σ genera 10×lv + Σ species 3×lv, event points +2 per tier above Common, bingo draws by tier, sorting. Shown as `rarityChip` everywhere (cards, genus page, Compare, Crew, This week, Wrapped, map, scanner) and as a coloured label on share cards |
| map & scanner | `baseWidget`, `SCAN_KM` ('sq', 5, 10, 25, 50, 100), `SCAN_PER`, `SCAN_HIST`, `SCAN_ENDS`, `scanKm`/`kmVal`/`kmChip`, `scanPer`, `runScan(lat, lng, km, per)`, `scanBadge`, `paintScan`, `scanPanelHtml`, `scanInfo`, `MAP_LAYERS`, `layerOn`, `layerSwitchEl`, `applyLayers`, `mapLegendHtml`, `viewMapShell`, `drawScanArea`, `initMap` (2D), `afterMapInit`, `fetchScan(k, into)` | A tap on either map calls `runScan` directly. It rounds the point to 0.01°, remembers area and window in `S.prefs.scanKm`/`scanPer`, and makes one `taxonomy` call for the chosen window (`d1`, or `month=` for "this month, any year") plus one for the last 30 days (skipped for a 30-day window), then names the spot with `placesNear` the first time per 0.1° cell this session. `scanSeq`: when a newer tap starts another scan, the older one's results are dropped. Area 'sq' scans exactly the 0.25° grid square the pin is in. The result is `S.u.mscan` and joins `S.u.scanHist` (last 5, shown as chips named by place, or by coordinates when two would read the same; a chip under 6 h old reopens without a call). The panel lists new-to-you by most records first; past 9 it shows the 4 most recorded and the 4 fewest, with the middle folded. `scanInfo` adds your records and the frontier counts for the pin's grid square, and "Make this my home base" (`data-act=pinHome`). **2D** (Leaflet) has the same layers in `map2d` {fog, front, mine, home} and the same switches (`layerSwitchEl` inside an `L.Control`); `applyLayers` re-adds them in a fixed order |
| frontier (v1.18) | `FRONT`, `S.frontier`, `tileXY`, `frontierCounts`, `isFrontier`, `viewBounds`, `loadFrontier`, `frontierSoon`, `drawFrontier` | Squares where people record plenty of other life but hardly any jumping spiders: ≥ 100 iNat records of anything and ≤ 2 salticid records. From iNat's map grid (`/v1/grid/7/x/y.grid.json`: 64 × 64 cells per tile with a `cellCount` each), summed into 0.25° squares by each cell's location; two calls per z7 tile (salticids, all life), only for tiles in view while the Frontier switch is on (off by default), up to 6 per move, cached 30 days, newest 60 tiles kept. The counts are approximate (checked 2026-10-06: about ±40% against bounding-box counts, because cells straddle square edges), which is fine for "few versus many" |
| 3D map | `MAPLIBRE`, `TERRAIN_TILES`, `TERRAIN_ATTR`, `hasGL2`, `use3d`, `loadMapLibre`, `initMap3d`, `dropMap3d`, `paintMap3d`, `paintHome`, `applyLayers`, `gridEdges`, `mixHex`, `cssVar` | `initMap()` branches to `initMap3d()` when `use3d()` (WebGL2, `S.prefs.map3d !== false`, MapLibre loaded, and 3D hasn't failed this session); otherwise the Leaflet code runs. `render()` calls `dropMap3d()` whenever the tab isn't `map` (WebGL contexts are capped, so the map is torn down, not hidden). **If the MapLibre constructor throws (the browser refuses a WebGL context) or the context is lost, `to2d` sets `mlFailed` and re-renders with the 2D map** (v1.19; before, the map went blank, as the owner saw after leaving and re-opening the tab). Layers bottom→top: Esri topo/imagery, fog `fill` (world polygon with a hole per `M.cells25` square; holes wind opposite to the outer ring), `fogNew` (squares cleared since `S.u.fog`, faded once via feature-state `f`), hillshade, frontier fill + line, `lit` (your squares, dotted), `home` (±25 km home square, hidden while the scan on show is the home area itself), `scan` + halo (the scan square, dashed accent). Zoom expressions must be top-level in MapLibre styles (a bad one fails the whole style silently, so the map logs `error` events). Layer switches (`MAP_LAYERS`) set `S.prefs.mapLayers` and `applyLayers()` (which also redraws the legend). Phones get a lighter map (shared terrain source, pixel ratio ≤ 1.5, terrain ≤ z12, opening zoom 8) |
| elevation | `ELEV_Z`, `S.elev`, `fillElev`, `elevsOf`, `topElev`, `altitudeLine` | After each sync (`doSync`, `onboard`), in the background: for each non-obscured record without a cached height, fetch its z12 terrarium tile (each tile once, plain `fetch`, not iNat) and decode the pixel. `createImageBitmap(…, {colorSpaceConversion:'none', premultiplyAlpha:'none'})` matters: colour management would shift the encoded heights. Spot checks: Cairns Esplanade −1 m, Lake Eacham 769 m, Atherton 772 m, Bellenden Ker summit 1,553 m (true 1,593 m). Used by the genus page "Altitude" line (lowest–highest, rounded to 50 m) and the Highlanders set. Never per record, never on cards or in links |
| species layer | `speciesInScope`, `speciesCard`, `viewDexSpecies`, `leadsUrl`, `viewNeedsId`, `layerSwitch`, `speciesSection(gid)` | Mystery spoods (`viewNeedsId`) also live here |
| photo coaching (v1.20) | `PHOTO_TIPS`, `tipsHtml(open)`, `tipsOnce(dismiss)`, `mysteryCount` | The five-point photo checklist (§12): on Mystery spoods, and once for anyone under 15 genera: at the end of the first reveal, or on Profile until **Got it** (`S.prefs.tipsDone`). "Mystery spoods" replaces "Unresolved leads"/"stuck above genus" on Profile, the dex footer, the quest and the layer chip |
| active now | `scanActive(k, force, into)` | ±25 km square, last 30 days |
| best months | `phenoKey(gid,pid)`, `ensurePheno(ids,pid)`, `peakInfo(gid,pid,month)`, `phenoHtml`, `phenoTag`, `phenoChart(gid,pid,month)`, `phenoUpdated` | Month-of-year histograms for any place. `[data-pheno]`/`[data-phenochart]` placeholders update in place |
| mastery fix-it | `fixIt(g, criterionKey)` | Links to the exact records that could tick a box |
| genus page | `openGenus(id)` | Modal in `#modalRoot`. Under the name: iNat's common name (`cnHtml(id, 'cnbig')`) and one line about the animal (`wowLine`) with a Wikipedia ↗ link |
| common names & one line (v1.20) | `cnFrom`, `cnOf`, `cnHtml`, `GENUS_NOTES`, `S.notes`, `ownNote`, `WOW_SKIP`, `wikiLine`, `wowLine` (= `ownNote` or `wikiLine`) | Common names come from `/v1/taxa` (`ensureInfo`, the landing call) into `S.nodes[id].c`; `ensureInfo` re-asks once for taxa cached before v1.20. Shown on dex cards (recorded genera; unknown ones only with "reveal names"), the genus page, scanner rows, wanted posters, both reveals, Three to find and the canvas tiles (title card, Wrapped, event card, My SPOODEX image). **`wowLine`**: the first sentence of the genus's Wikipedia summary (`S.info[id].s`, via iNat) that says more than "X is a genus of jumping spiders" and isn't taxonomic history (`WOW_SKIP`: who described it, synonyms, species counts, "as of 2017", "moved to"). Shown on the genus page and the new-genus reveal, not on grid cards (at card width only "X is a genus of…" fitted). `GENUS_NOTES` (genus id → a line the owner writes) replaces it, without the Wikipedia link |
| reveal ceremony | `celebrations(fresh, solved)`, `SOLVED_SHOWN` 3, `aGenus`, `revealQueue(items)`, `revealList`, `revealNext` (v2.0: one queue, so honour ceremonies `{hon, crew?}` join a genus reveal already on screen; closing a modal opened from a ceremony resumes the queue) | After a sync, one full-screen photo per new genus and per **mystery spood identified**: `doSync` keeps the ids of records above genus before syncing and, after it, takes those that now have a genus (no extra call). "MYSTERY SPOOD IDENTIFIED · Your mystery spood is a Servaea! Card unlocked." (the last part only if the genus is new) with that record's photo; up to 3 for genera you already had, then "…and N more mystery spoods identified". Common name and the `wowLine` under the name; a new genus says "Your Nth jumping spider genus" (by first observation date, so it's left off an identified mystery spood, where "Card unlocked." says it and an old record would read "Your 1st") |
| first reveal (v1.20) | `onboard`, `REVEAL_ALL` 20, `REVEAL_TOP` 12, `revealGenera`, `flipCard`, `revEndHtml` | Replaces the old boot log and name chips. While importing: one plain line ("Read 400 of 1,543 records") and a bar (`importRecords`' `log(text, fraction)`). Then each genus flips from a blurred silhouette to the naturalist's own cover photo with its name and common name, ~0.4 s apart; **Skip** flips the rest at once. Over 20 genera it reveals the 12 rarest (`rarestFirst`) and says how many more. Ends with the level, the generated title, "N of the M genera on iNat in <scope>", "❓ N mystery spoods not yet identified to genus. See them →" (`data-act=needsid`, which enters the app when it's clicked from the reveal), **Open your SPOODEX** (`data-act=openDex`) and Three to find next. The landing strip and pitch are hidden when the flips start (and the page scrolls to the top); a genus name too long for its card shrinks (14 → 10 px) instead of losing letters; common names get up to three lines. Revealed cards open the genus page. `render()` does nothing while `#app` is hidden, so background `softRender`s can't switch the chassis colours under the landing page |
| three to find next (v1.20) | `OWNPH_TTL`, `NEXT_N`, `S.ownph`, `ownerPhotos(ids)`, `taxonPhoto(id)`, `nextThree`, `loadNextThree(redraw)`, `findCard`, `nextThreeHtml` | Three missing genera from `wantedList(homeCtx())`, recorded within 25 km of home first, then in season (`season` ≥ 0.4), then by the wanted score. Each card: photo, name, common name, where ("🔥 Recorded within 25 km of home in the last 30 days" / "📍 N records within 25 km of home" / "📚 N records in <region>") and when (peak months); a tap opens the case file. **Photos**: the owner's most-faved research-grade photo of the genus (`ownerPhotos`, one v2 call per ≤ 30 genera, cached 30 days in `ownph`; skipped when the viewer is the owner), else iNat's taxon photo only if `S.info[id].lc` is CC0/CC BY/CC BY-NC, else a "?" plate. Used by the reveal and Profile |
| compare | `viewCompare`, `lineageRows`, `loadCompare(login)` | Most recent rival cached as `cmp` |
| regional ladder | `loadLadder`, `ladderRows`, `viewLadder`, `myStanding`, `starsIn`, `idPrestige` | One `observers` call + one in-place `taxonomy` call per person; streams; 24 h cache |
| crew mode | `setCrew`, `loadCrew`, `crewMembers`, `viewCrew` (broken link / one event / events + `viewCrewMain`), `crewFeedHtml`, `crewUnseen` | One all-time `taxonomy` call (`captive=false`) each; 6 h refresh; feed = diff vs previous snapshot, plus event news entries `{kind:'ev', id, n, m, txt}` (they light the tab's ● too) |
| events (crew games) | Link: `evCheck`, `evParse`, `evEncode`, `evLink`, `evId`, `b64u`/`unb64u`, `hash32`, `rng` (mulberry32), `shuffle`. Fetch: `loadEvent(id, force)` (queued, one event at a time) → `evFetch`, `evTrim`. Score (pure): `evScore`, `starsAt`, `evResult`, `evBingo`/`bingoCard`/`sqTest`/`sqTicks`, `evTurf`, `evDare`, `evAfter`, `evPost`. Flow: `openEventCode`, `evStart`, `evRematch`, `evDareBack`, `bingoPool`, `cupEv`/`cupEnsure`/`loadCups`/`cupDue`. Views: `eventsHtml`, `evCardHtml`, `cupHtml`, `viewEvent`, `evBoardHtml`, `evBlitzHtml`, `evDuelHtml`, `evBingoHtml`, `evTurfHtml` + `mountEventMap`, `evDareHtml`, `evAnimate`, `evPodium`, `openEventCard`/`drawEventCard`, `trophies`/`trophyHtml`, `evDraftNew`/`evPreset`/`evFormHtml`/`evCreate`. **v1.20, public hunts**: an open bioblitz may have **no place**: it runs worldwide (`observers` with no `place_id`) and rarity counts the world's records (`evScope` returns `'w'`; `scopeRef`, `scopeName`; no `sc` in the link). **🗓 This month's spood hunt** (`data-act=evHunt`) fills the form: bioblitz, open to anyone, the whole calendar month, named "Spood hunt · Oct 2026", no place unless picked; date presets gain "Next month". Open events with a link get **📋 Post text** (`evPostText`/`evPostHtml`, `S.evPost`): a title line, where and when, two lines of rules and the link, with Copy; nothing is posted. **Best finds** (`bestFindsHtml`): the 8 top-scoring inked genera as photo cards (first finder, points, credit) above the bioblitz table, and each player's best inked find as a thumbnail in every event table (`evThumb`). Someone else's photo shows only if `evPhOk` (CC0/CC BY/CC BY-NC, or the owner's, or yours), credited by `evPhCredit`; `EV_FIELDS` now asks for `photos:(url,license_code)` (`lc` on each event record). The result card's top-find photo follows the same rule. **Open events refresh every 2 hours** (`EV_OPEN_TTL`, rosters stay at 30 min) and read at most `EV_OPEN_PAGES` = 20 pages (4,000 records) a refresh, saying so if they stop there (`E.capped`). `E.queued` is saved along with the event while it's being read, so `boot()` clears it on every event: before (v1.16–v1.20 testing), closing the page mid-read left that event on "Reading records…" for good, with no Refresh button. The form's rarity note says "the world" for an open hunt with no place | **The link is the rulebook and iNaturalist is the referee**: `?ev=<base64url JSON>` (format in §9); every viewer fetches the same public records and scores them with the same pure functions, so there's no server. **Per refresh**: one v1 `taxonomy` for the whole roster in the window (names/ranks), then v2 `/observations` with `user_login=a,b,…` (comma list works, §7), `d1`/`d2`, `place_id`, `captive=false`, `fields=EV_FIELDS`, paged by `id_above`. **Once per player**: a `taxonomy` call with `d2` = the day before the event (their collection before it; kept for good, since it can't change once the event has started). Open bioblitz: one `observers` call per refresh finds the top 25 for the place and window. TTL 30 min (`EV_TTL`), ⟳ Refresh button, no refreshes once final. **What counts** (`evTrim`): observed in the window, uploaded (`created_at`) by `d2`+2 days, not captive, in the place. **Inked**: a current identification by someone who isn't a player, at or below the record's genus (`taxon.id` or its `ancestor_ids`; v2 identification ancestors exclude the taxon itself). Not reusing `community_taxon_id`: it's null when the only ID is the observer's (checked, §7), and a fellow player's agreeing ID would set it. Other records show **✏️ pencilled** points. A named species (dare) needs an outside ID at the species. **Final** at `d2` + 7 days (`EV_FINAL_DAYS`); before that "Provisional · final in N days". **Points** (`EV_POINTS`, §12): per distinct inked genus 3, +2 per ★ in the event's scope (`starsAt`, record-count tertiles like `rarityTier`, in the place if set, else the state carried in the link as `sc`), +5 new to the player's pre-event collection, +3 if no player had it, +2 for an inked ♂ and ♀, ×2 for bioblitz targets. Behaviour keywords score nothing except as bingo squares. **Bingo**: the creator's browser draws the pool (11 fixed challenge squares `SQ_FIXED` + 19 genera, 10 ★ / 7 ★★ / 2 ★★★, in season during the window by `peakInfo` where known) into the link; each card = 24 of them shuffled by `rng(hash32(seed + ':' + login))` + a free centre, so cards are identical on every device. Every square needs an inked record (genus at least); `q` ticks on the third distinct 25 km square of inked records. Line 10, blackout +50, first line of the event +5 (earliest completing record by observed date, upload date, id). **Turf**: each 0.25° square goes to the player with most inked genera there (ties: first to reach that count); obscured records don't claim squares; colours `turfColours` (hash into `TURF_COLS`, probing so a roster never shares one). **Payoffs** (`evAfter`, silent on the first read): lead changes (toast + event news + crew feed), turf takeovers/holdings, completed dares; changed scores count up once (`E.from` → `evAnimate`); the first read after the final date shows the podium (`#reveal` style) then the 1080×1350 result card (card kit). **Crew Cup**: a synthetic monthly event `cup:YYYY-MM` for you + the saved crew (no link), scored like a bioblitz; current and last month load when the Crew tab opens; last month's winner gets a 🏆 in the trophy cabinet (Profile) |
| share of the record | `recordShare`, `shareHtml`, `shareLine`, `inPlace`, `pctTxt` | No extra calls |
| checklist (v2.0) | `TAXA_AU` (generated block between `// TAXA_AU:begin` and `// TAXA_AU:end`), `TAXA_AU_EXCLUDED`, `AU`, `taxaAu(name)`, `auHome`, `auNever`, `auFound`, `afdUrl`, `plateHtml`, `taxonomyReviewHtml` | **Generated by `tools/taxa.py`** (not shipped): iNat's Australian genus tree (`taxonomy?place_id=6744&verifiable=true`) ∪ the Lucid key's genera (`Themoojuice/Identification-aid`, `01_lucid_schema.json`), with the AFD genus list (BIE `childConcepts`) used only for museum spellings (`afd`) and authorities (`a`, AFD first, else the Lucid name's). `python tools/taxa.py` prints counts; `--write` replaces the block. Rows `{n, inat id or null, lucid, afd:[spellings], a}`. Shown only when the home country is Australia: the dex header adds "53 / 91 known from Australia" (sets and other denominators unchanged), the **🏛 Never on iNat** chip (`filter:'never'`) shows the 10 as museum plates (link to the AFD), the lineage tree gets a 🏛 branch, and Settings → **Taxonomy review** (owner only, `isMe(OWNER)`) lists kept and excluded names |
| lineage drawers (2026-10-08) | `GENUS_FACTS`, `S.facts`, `ownFact(name)`, `SPOT_N` 12, `treeGroups`, `treePh`, `factsFor(id, name, never)`, `spotlights`, `spotCard`, `treeTile`, `progRing`, `drawerHtml`, `viewTree` (→ `viewTreeOutline` for Outline), `PLATES`, `plateFor`, `plateBg`, `ensureCcPhotos`, `S.ccph` | **Facts are never generated**: `factsFor` only states what data shows (owner's `GENUS_FACTS` line; zero iNat records in Australia, or, when ALA files the genus under another name (`S.lore[n].syn`), that instead; recorded within 25 km in the last 30 days / N records within 25 km (home scans); only N iNat records in scope when ≤ 30; peak season (pheno); first collected in Australia (ALA); described by (checklist authority)). `ensureCcPhotos` fills genera with no owner pick and no CC0/CC BY/CC BY-NC taxon photo with the most-faved research-grade record whose photo has one of those licences (one call per genus, 30 days, `{ts}` alone = none); `taxonPhoto` uses it, so Three to find gets it too. `PLATES` (genus name → {u, sp species pictured, cr credit, src, crop?, plate?}) are hand-checked images for never-on-iNat genera; `crop` {fw, cx, cy, ar} shows one figure of a plate via background-size/position (square box). `loreUpdated` re-renders the tree. ALA lore for the strip and all never-on-iNat genera, ≤ 8 per render, only with museum records on |
| lore (v2.0) | `ALA_NM`, `ALA_BC`, `ALA_NOT_INAT`, `LORE_TTL` 90 d, `S.lore`, `alaOn`, `extFetch(url)`, `museumOf`, `zeroDate`, `realYear`, `alaDate`, `alaName`, `ensureLore(name, rank)`, `holoTxt`, `firstTxt`, `authParts`, `authOf`, `lineageSegs`/`lineageHtml(tid, pid, login)`, `historyHtml(gid)`, `spLoreHtml(sid)`, `loreUpdated` | Per name: ALA name matching → authority (only if `family === 'Salticidae'`); species only: holotype search + full record (collector, date, locality, state, museum, catalogue no.); then the earliest **dated, Australian** preserved specimen (`sort=year&dir=asc`, skipping 30 Dec 1899 placeholder dates). 2 calls per genus, 4 per species. The genus page's **History** (`[data-history]`): Described by, Holotype (genus: only via a field story's `type` species), First collected, Earliest on iNat (`pioneerLine`), Naturalists (`natLine` per home country/state). Your species rows get a museum line (`[data-splore]`). Lore loads when a genus page opens (the genus, then your species in it), for the 10 plates, and before a ceremony. **Lineage line**: collected by (holotype) or first collected → described by → N naturalists on iNat → you, #N; each segment only with its data |
| field stories (v2.0) | `FIELD_STORIES`, `fieldStoryHtml(name)` | **Ships empty.** `{[taxon name]: {story (paragraphs split by a blank line), refs:[{cite, doi}], type (a genus's type species, for its holotype line), by, ok}}`; shown on the genus page only with `ok:true`, typeset like a journal note with the refs as DOI links. No placeholder when absent. Workflow: owner supplies PDFs → a session drafts strictly from them → owner approves → `ok:true` |
| pioneer badges & naturalist ranks | `PIONEER_TTL`, `RANK_N` 50, `S.pioneer`, `pioneerQ`, `pioneerFresh`, `pioneerTargets`, `rankTargets()` (Map key → you have a research-grade record), `rankScan(tid, pid)`, `HONOURS`, `HONOUR_BY`, `honourOf`, `sealHtml`, `natRank(tid, pid, login)`, `natLine`, `evalHonours(keys)`, `queueRanks(prev)`, `nextPioneerJob`, `drainPioneer`, `myPioneers`, `pioneerHtml`, `pioneerLine`, `pioneerUpdated` | **Pioneer**: earliest verifiable record per (genus, place); ~180 calls for the owner. **Rank** (v2.0): for every species and genus you have in your home country and state (261 keys for the owner), v2 `/observations?quality_grade=research&captive=false&order_by=observed_on&order=asc&per_page=200&fields=(id,observed_on,user:(login))`, distinct logins in order (date, then id) until 50 or the records run out, plus one `observers` call for the total when there are more. The list is **player-independent** (`nat`), so the same cache ranks crew members. `natRank`: your index if your login is on it (inked); otherwise, for you only, where your earliest non-casual record would sit (**pencilled**). One drain does both, 30-day cache: sync-queued keys first (`pioneerQ`), then stale rank keys, then pioneer keys; ~300 calls ≈ 6 min for the owner the first time. The 14-day full resync marks rank keys stale (quiet re-check) |
| naturalist honours (v2.0) | `honourWeight`, `celebrateHonours`, `honourPhoto`, `honourReveal(e, crew)`, `dispatchText`, `openDispatch`, `honoursHtml`, `PEN_SHOWN`, `drawHonourCard`, `openHonourCard` | `S.u.honours` `[{k:'taxon:place', tier, rank, ts, shown}]`, research grade only. Tiers (proposals): 1 First on record · 2–3 Founding trio · 4–10 Vanguard (full-screen ceremony) · 11–50 Founding Naturalist (toast + cabinet). Ceremonies only for keys a sync queued (new taxa in your country/state, records just turned research grade); the background backfill files honours quietly; a lost one (re-ID, slipped past 50, taxon gone) leaves without a word. One ceremony per taxon (its best place); order: a genus top-10 in the country first, then country before state, then rank. Ceremony = your record's photo, wax seal, "You are the Nth naturalist ever to record X in <place>", lineage line, "Before you: …" (up to 3 logins with years), 🪪 Share card (1080×1350, seal per tier, no place finer than country/state) and 📋 Dispatch (plain text from data fields + the record's iNat link). GoatCounter `naturalist-rank`. Profile's trophy cabinet: one row per taxon with replay, Founding Naturalist seals folded, and **✏️ Pencilled in** (best 5, rest folded) with "ask for an ID ↗" |
| museum ghosts (v2.0) | `GHOST_TTL`, `wktOf`, `ghostQ`, `ghostsIn(c, km)`, `ghostLatest`, `scanGhosts(D)`, `loadScanGhosts`, `ghostRowsHtml`, `loadHomeGhosts(latest)`, `homeGhosts`, `inBox`, `coldCaseHtml` | One ALA genus facet (preserved specimens, `dr1411` excluded, Salticidae) over the scan's own box (WKT polygon from `boxOf`), kept only for `TAXA_AU` genera. Scan panel (all-time scans only): **🏛 Museum records here, none on iNat here** under the new-to-you rows; genera you have elsewhere dimmed; opening a row loads its latest dated specimen (year + museum). Home (±25 km, `S.u.ghostHome`, 30 days): **🏛 Cold cases** on the wanted posters (stamp "COLD CASE · LAST COLLECTED <year>", photo via `taxonPhoto` = owner's, else CC0/CC BY/CC BY-NC, else a specimen label) and the quest **Bring It Into the Light** (`kind:'ghost'`, done by a record of a target genus inside the home box). Never in the dex, level, XP, sets or events |
| crew hype (v2.0) | `HYPE_DAYS` 14, `HYPE_G` 6, `HYPE_S` 3, `crewHype`, `crewCeremony`, `hypeHtml` | After `loadCrew`, for feed entries from the last 14 days: rank scans (shared cache) for up to 6 new genera + 3 new species in your country and state; a crew member in the first 10 → `e.hype` and a small ceremony when the Crew tab opens ("laz just became the 1st naturalist…", **Congratulate them on iNaturalist ↗**). Every new-genus feed entry is highlighted with its lineage line |
| most wanted | `homeCtx`, `wantedList(ctx)`, `sharpenWanted(ctx, redraw)`, `loadWanted`, `wView`, `wantedSwitch`, `viewWanted` → `viewBounty` / `viewWantedPosters`, `posterHtml`, `calendarHtml`, `ensureHaunts(gid,ctx)`, `hauntSummary`, `hauntsOf(ctx)`, `openCase(gid,ctx)`, `drawCaseMap`, `kmBetween`, `bearingDeg`, `compassPt`, `bearingTxt`, `agoTxt` | Everything takes a **ctx** `{kind, pid, centre, km, month, at, atLong, near, recent, stale, posters, mem}` so home and trips share one ranking. `mem` (optional): haunts are read from and written to that in-memory object instead of `S.haunts`. Score = (1 + 1.5·log(1+nearby records) + 2 if recent) × log(10 + state records) × (0.25 + season this month) × reach, where reach = 1/(1+(km to nearest record square/100)²). Haunts: v2 `fields=id,observed_on,obscured,geojson`, 150 km radius, falls back to the region; obscured records skipped |
| trip planner | `S.trip {cur, recent}`, `tripCtx`, `setTrip`, `loadTrip`, `tripSpots`, `viewTrip`/`viewTripPlan`, `mountTripMap` | Countries, states and places with `bbox_area > 4` are planned as a whole region; anything else by what's within 50 km. Streamed updates only redraw `#tripPlan` (so the search box isn't wiped); the Leaflet element is moved between renders, not rebuilt. ≈55 calls for a fresh destination Optional dates (`t.d1`/`t.d2`, v1.18) set the month and, once inside the 16-day forecast, show the destination's weather cards (`tripWxHtml`). |
| sets | `THEMES`, `taxonByName`, `themeMembers`, `themeIds`, `themeGot`, `bothSexes`, `squaresOf`, `lineageSets`, `genusSpeciesSets`, `setStats(ref)`, `nearestSet(ref)`, `loadSetRefs`, `viewSets` | See §8 |
| bounty board | `bountyWhere`, `loadBounties`, `trimBounty`, `viewBounty`, `bountyRank`, `BOUNTY_RANKS` | Two v2 queries within 50 km of home (or the state): Needs ID ranked family→subtribe (`hrank`/`lrank`), and Needs ID records of genera you're missing in your state. Own records dropped client-side. "Helped" = bounty records where you have an identification, accumulated in `S.u.bounty.helped`. 1 h cache |
| since your last visit | `markVisit`, `loadNews`, `newsHtml`, `sinceTxt` | A new visit starts after 3 h away. After each sync: `taxonomy` with `created_d1=<previous visit, full ISO datetime>` within 25 km and for the state, plus a `per_page=0` count of new unnamed spoods. Dismissible until the next visit |
| spooding weather | `WX` (every threshold, §12), `WX_URL`, `WX_TTL`, `S.wx`, `wxFetch`, `loadWx(force)`, `wxWarm`, `wxScore`, `wxDays`, `wxPanelHtml`/`paintWx`/`wxInner`, `wxGeneraHtml`, `wxSpan`, `wxStars` | Open-Meteo, not iNat, so its own tiny queue (`wxFetch`), not `api()`. `past_days=2` and `forecast_days=16` with `relative_humidity_2m` (cache entries carry `v:3`; older ones refetch) for the rebound rules and dated trips. Each hour scores warmth × dry × (0.4 + 0.6·sun) × (0.5 + 0.5·calm). `wxDays`: for today + 6, the day's window = the run of daylight hours from now on around its best hour that stay ≥ `WX.win` (85%) of it; mean score + **rebound bonus** (only for a window ≥ 0.6): +0.12 after ≥ 3 mm of rain in the 48 h before, +0.06 after wind ≥ 30 km/h in the 24 h before, +0.06 for the first ≥ 24 °C window after a day that topped out under 22 °C, +0.05 for a warm (≥ 24 °C), humid (≥ 70%) window, capped at +0.2; ≥ 50 mm of rain in the 48 h before replaces the rain bonus with −0.1 ("🌊 too wet"); stars from `WX.stars` (★5 needs ≥ 1.03, i.e. a near-perfect window plus a rebound; an ordinary perfect day is ★4). **v2.0 length rule**: score = (mean + bonus) × `lenF`, where a 1-hour window keeps 70% and 4+ hours keep 100% (`WX.len`); windows under 2 h get no positive bonus; ★5 also needs a rebound and ≥ 3 h (`WX.five`). Checked on the 16-day Cairns forecast of 2026-10-07: 5–8 h days ★4, a 1 h day ★3, 2 h post-rain days ★4 (were ★5), the only ★5 an 8 h post-rain window. The star widget always renders five glyphs: read `.wxst` titles, not text. Best bet = most stars, then score, then length. `wxCardsHtml(f, days)` draws the cards for home and for dated trips. On failure the panel says so in one line and keeps a cached forecast. Weather only since v1.19 (its missing-genera list repeated the scan panel) |
| offline & install | `installEvt`, `standalone`, `isIOS`, `installHtml`, `installApp`, `netState`, `registerSW` | `boot()` registers `./sw.js` and calls `netState()` (header **Offline** chip). `online` retries a failed field scan/haunts and the weather. `beforeinstallprompt` is stashed and shown as "📲 Install SPOODEX" in Settings (Android/desktop Chromium); iOS gets the Add to Home Screen steps instead; nothing once installed. Installed (standalone) apps ask for `navigator.storage.persist()` so saves survive low-storage eviction |
| `sw.js` (own file) | `VERSION`, caches `spoodex-shell-<v>`, `spoodex-libs-<v>`, `spoodex-tiles`, `spoodex-photos` | **Shell** (`spoodex.html`, `index.html`, manifest, icons; precached on install): network-first, cache fallback after 5 s or on failure; keyed by path, so `?u=` never lands in the cache. **CDN** (cdnjs incl. Leaflet/MapLibre, Google Fonts CSS and font files): cache-first, versioned. **Tiles** (Esri `/tile/`, AWS `elevation-tiles-prod`): cache-first as viewed, cap 600. **Photos** (`static.inaturalist.org`, `inaturalist-open-data.s3.amazonaws.com`): cache-first as viewed, cap 400. Caps are checked every 20 additions, oldest out (cache keys are in insertion order). For `<img>`/`<link>` (no-cors) requests it fetches a CORS copy with `cache:'no-cache'` where the host allows it (an earlier plain image load can sit in the HTTP cache without CORS headers), because browsers pad opaque responses heavily in storage quota; `static.inaturalist.org` has no CORS, so those are stored opaque. An opaque copy only answers no-cors requests (the card canvas still gets CORS). **Never touches the iNat API, Open-Meteo or GoatCounter.** `skipWaiting` + `clients.claim`; activate deletes only old `spoodex-*` caches (the Identification aid's worker on the same origin uses `salticidae-core:*` caches and scope `/Identification-aid/`, checked 2026-10-04; a worker only sees fetches from pages it controls, so the two can't intercept each other) |
| analytics | `GOATCOUNTER`, `track(path, event=true)` | Anonymous counts on https://themoojuice.goatcounter.com (owner's dashboard). **Deliberately not GoatCounter's `count.js`**: it always sends `location.search`, which holds `?u=`/`?vs=`/`?crew=` usernames. `track` sends only `p` (path or event name), `t`, `s` (screen width), `r` (referrer with query stripped, page views only), `e`, `rnd`, via `sendBeacon` or an image. Skips localhost/`.test`/`file:`. Page view in `boot()`; events: `new-spoodex` (first import), `guest-mode`, `trip-planned`, `compare`, `card-download`, `card-share`, `dex-image` (v1.20, the share image opened). Settings says so. **Never add usernames, places or coordinates to a tracked path** |
| cards | `cardKit`, `cardPhotos`, `mountCard`, `cardBlob`, `cardExport`, `rarestFirst` | 1080×1350 canvas kit; see §11 on photo CORS |
| title card / wrapped | `drawTitleCard`, `openTitleCard` / `wrappedData`, `wrappedExtras`, `openWrapped`, `showWrapped`, `drawWrappedCard` | |
| my SPOODEX image (v1.20) | `drawDexImage(cv, tiles, square, photosOnly)`, `openDexImage(square)`, `S.dexSq`, `tierKicker`, `K.lines` | For Reddit: **portrait** 1080×1350 (4 × 3 genera) or **square** 1080×1080 (4 × 2), chosen by chips. 200 px tiles with 104 px under each for the name and a common name on up to two lines (`K.tile(…, cnLines)` → `K.lines`, split between words where the longer line is shortest); in every canvas tile a long genus name shrinks (34 → 24 px) instead of ending in "…", and common names are Fraunces (narrower than the mono). The kicker reads "SPOODEX MK II", not "SPOODEX · SPOODEX MK II" (`tierKicker`, also on the title card). Name, "Level N", "N / M genera on iNat in <country or state>" (or "N jumping spider genera" with the world scope), the naturalist's own cover photos rarest first with name and common name, "???  not yet found" plates for empty slots, then the kit footer: "Photos © <login> via iNaturalist", the rarity scope, and the `?u=` link. **No places below state level, no map, no squares** (§9). Offered on Profile (📤 My SPOODEX image), at the end of the first reveal (📤 Share my SPOODEX) and on the last new-genus photo after a sync. `cardKit(cv, H)` now takes the height |
| landing (v1.20) | `OWNER`, `OWNER_PICKS`, `pickUrl(id, size)`, `stockPh(id)`, `stockCr(id)`, `LAND`, `LAND_TTL`, `OK_LIC`, `PH_FIELDS`, `byName`, `creditTxt`, `genusIn`, `loadLanding`, `paintLanding` | **`OWNER_PICKS`** (2026-10-07): genus id → [observation id, photo file] for each of the owner's 54 genera, his best photo picked by eye from all 1,544 of his salticid records (§12). `pickUrl` builds the `static.inaturalist.org` URL at any size. Used first everywhere a genus needs a picture: his own covers (`buildModel`, when that record is in the collection), the landing strip, Three to find (`taxonPhoto`; `ownerPhotos` skips picked genera), and, through `stockPh`/`stockCr`, unknown dex cards, the genus page hero and credit for a genus you haven't got, and wanted posters. Only genera he has never recorded fall back to iNat's taxon photo. `LAND` = 12 hand-picked genus ids (§12): his pick where he has one (no call), else one v2 call per genus with `photo_license=cc0,cc-by,cc-by-nc` whose photo is used only if its `license_code` is one of those three; then `/v1/taxa/{ids}` for names and common names. Cached in store key `landing` (`v:2`; older caches refetch) for 14 days. Boot calls it unless `?u=`/`?ev=` is opening something |
| genus lines editor (2026-10-07) | `notesOn`, `notesView`, `notesIds`, `openNotes(focus)`, `noteInput`, `notesCode`, `noteCount` | For the owner to write one line per genus by clicking and typing: ⚙ Settings → **✏️ Write the genus lines**, or **✏️ write your own line** / **edit** under the line on any genus page. Shown when the login is `themoojuice` or the URL has `?notes`. A list (Your genera / Not written yet / All, taxonomic order) of photo, name, common name and a text box whose grey placeholder is today's Wikipedia line. Each keystroke saves to `S.notes` (store key `notes`, persisted, this browser only), and the line shows at once in that browser. **📋 Copy all for SPOODEX** copies a `const GENUS_NOTES = {…}` block (each genus named in a comment) to paste over the empty one in `spoodex.html`, which is what publishes them to everyone |
| boot / flows | `loadUser`, `updateUrl`, `copyLink`, `doSync`, `onboard`, `enterApp`, `startGuest`, `toast`, `settings`, event handlers, `PERSISTED`, `boot()` | `boot()` awaits `store.init()`, re-reads `PERSISTED`, then opens a cached user (and syncs quietly) or onboards `?u=`. `?ev=` is kept in `S.pendingEv` and opened by `enterApp` (before `vs`/`crew`); someone with no saved user who opens an event link becomes a guest. `setBase` sends a player with 0 genera to Profile after their *first* base (later bases, e.g. "Make this my home base" on the map, stay on the map); `enterApp()` with no tab opens Profile when there are genera or a base, else the Map. `updateUrl()` writes `ev` while an event with a link is open on the Crew tab (instead of `crew`) |

**UI event wiring**: one delegated `click` listener on `document` dispatches on data attributes, checked in this order:
`data-genus` (genus modal) · `data-close` · `data-tab` · `data-filter` · `data-layer` · `data-scan` · `data-base` (`lat|lng|label`) ·
`data-trip` (`lat|lng|area|label`) · `data-act` with its argument in `data-v`. Current actions:
`bountyGo bountyRefresh card cardPng cardShare clearBase crewAdd crewDel crewRefresh dexImage evBack evCancel evCard evCopy evCreate
evDareBack evDarePick evDel evHunt evMode evNew evOpen evPlaceClear evPlacePick evPostCopy evPostText evPreset evRefresh evRematch field
fieldClose fieldNext fieldRescan fieldStart full geo guest install ladderRefresh leadFilter lscope lsort needsid newsDismiss notes notesCopy notesView openDex
reportRefresh sample sets share switch tipsDone tripCase tripClear tripRefresh tripRetry vs wanted wantedRetry wipe wrapped wrNext wrPrev
wrYear wview wxRetry` (v1.20 added `dexImage evHunt evPostCopy evPostText openDex tipsDone` and dropped `peek`, whose locked-tab plate
is gone). The reveal's **Skip** has its own listener (`#revSkip`). Clicking the Crew tab button closes any open event. Because `data-tab` is checked before `data-layer`, a link that must switch tab **and**
view needs its own `data-act` (see `sets`, `needsid`, `bountyGo`).
Forms: `data-form` = `compare | crew | evDare | evPlace | placeSearch | tripSearch` (delegated `submit`). Prefs: `data-pref` on `change`; the trip
month select uses `data-tripm`. The event form keeps its state in `S.evDraft`: `data-evf` fields update it on `input` without redrawing
(so focus stays), toggles redraw on `change`; target checkboxes use `data-evt`. **Exception**: controls inside the maps (layer and base switches) stop click propagation, so they get direct `onclick`s.

## 6. State and storage

`S` (global): `login`, `u` (per-user save), `nodes` (taxon id → `{n,r,l,p,c}`; `c` = iNat's English common name, '' if none, set only by
`/taxa` calls via `cnFrom` and kept by `addNode`), `places` (id → `{n,l}` admin level),
`info` (taxon id → `{p photo, s summary, w wiki, a attribution, lc photo licence code, c count}`), `ref` (`'p<place>'` or `'world'` →
`{ts, g:{genusId:count}, s:{speciesId:count}, t:familyTotal}`), `observers`, `pheno` (`'gid:place'` → `{ts, m:[12]}`),
`prefs`, `tab`, `M` (model), `ownph` (genus id → the owner's photo of it, §5 "three to find next"), `cmp`, `ladder`, `crew`, `pioneer`, `haunts`, `trip`, `elev` (observation id → metres above
sea level, from the terrain tiles; shared across users since ids are global), `wx` (home base rounded to 0.1°, `"lat,lng"` →
`{ts, v:3, off: UTC offset in s, h:{time, t, pp, p, cc, w, sw, rh, day}}`, the hourly Open-Meteo arrays, 2 past days + 16 ahead; also the
destination of a dated trip; 1 h fresh, newest 4 kept), `frontier` (z7 tile `"x/y"` → `{ts, c:{square: [salticid, all life]}}`, 30 days, newest 60), `events`, `pendingVs`, `pendingCrew`, `pendingEv`,
`evOpen` (id of the open event), `evDraft` (the create form), `evBroken` (a malformed link was opened).


`S.events` (persisted key `events`, shared by every user of the browser): id (`'e' + hash of the link code`, or `cup:YYYY-MM`) →
`{id, code (the ?ev= payload; null for cups), ev (decoded), ts (last opened), at (last read), players (open events), pre {login: [genus ids
before the event]}, gone {login: true if no such user}, obs [{id, u login, d observed, c uploaded date, g genus, sp species, ink, inkS,
k 25 km square or null, a annotations, b behaviour keywords, ph first photo}], st {login: score} (last snapshot), lead, ink {login: {genus:
pts}}, turf {square: login}, from (scores to count up from, once), feed [{ts, txt}], res {rows:[{login, rank, val, pts, pencil}]}, final,
shown (podium seen), justFinal, dareWon, sig (cup roster)}`. Capped at 20 (`EV_KEEP`): finished ones go first (oldest end date), then
the least recently opened; the open one is never dropped.

`S.prefs`: `scope` (country|state|world), `reveal`, `treeView` (drawers|outline), `peek`, `chassis`, `filter`, `layer` (genus|species|sets|needsid), `tipsDone` (photo checklist seen),
`ext` (v2.0: `{ala}`, false = no requests to the Atlas of Living Australia anywhere), `ladderScope`, `ladderSort`, `wantedView` (bounty|posters; default bounty), `leadFilter` (taxon id or null), `map3d` (false = 2D Leaflet map;
unset/true = 3D when WebGL2 is available), `mapLayers {fog, mine, front}` (false = hidden; `front` is off unless true), `scanKm` ('sq'|5|10|25|50|100, default 25),
`scanPer` (all|90|60|30|month, default all), `scanTab` (g|s).

Per-user save `S.u` (key `u:<login lowercased>`): `obs` (id → trimmed obs), `meta {lastSync, lastFull}`, `seen` (revealed genus ids),
`scans` (point key → `{ts, b:1, g:[{id,c}]}`, ±25 km squares), `active` (same, last 30 days, with `d1`), `mscan` (the last map scan:
`{lat, lng (0.01°), km, per, ts, month, near, G:[{id, c records, r last-30-day records}], Sp:[same]}`), `scanHist` (the last 5 map scans,
same shape, newest first), `completed` (quests), `base` (optional home base
`{lat, lng, label, places{country,state}, near}`), `visit {last, prev}`, `news {since, ts, dismissed, near, nearT, st, stT, unk}`,
`bounty {helped:[obs ids], data{ts, k, unk[], unkN, conf[], confN}}`, `tabs` (tabs opened by a link before their level), `tabsSeen`
(tabs this player has had; anything newer gets the unlock toast), `tabNew` (tabs with a ● until opened), `honours` (v2.0, §5 "naturalist
honours"; per user, so two people on one browser don't share them), `ghostHome` (v2.0: `{k home square, ts, g:[{n, id, c, yN, inst}]}`),
`mscan.gh`/`scanHist[i].gh` (v2.0: museum ghosts of that scan, same shape), `fog` (25 km square keys already cleared on the 3D map; squares not in
it fade out once, then it's updated).

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
haunts trip elev wx events landing notes lore` (`report` was dropped in v2.2; boot deletes it) (`notes` = the owner's genus-line drafts, genus id → text, persisted; v2.0: `lore` name → `{ts, auth, holo:{by, date, y, loc, state, inst, cat}|null, first:{y, by, inst, st}|null}`,
90 days; `pioneer` entries gain `rts, nat:[[login, date, id]], all, of`; `landing` = `{v:2, ts, items:[{g genus, n, cn, o observation, u photo url, by, lic}]}`, read on demand,
so not in `PERSISTED`). The owner's save is ~1 MB of JSON. `HAUNT_KEEP` (newest haunts kept) is 120 since v1.14: the 3D map keeps
25 home genera cached, the wanted posters share them, and a trip adds up to ~40.
The service worker's Cache Storage (shell, libraries, ≤600 tiles, ≤400 photos)
is separate from IndexedDB and never holds app data.

Scan-point keys: a 0.25° cell `"lat:lng"` (integers) or an arbitrary point `"pt:lat,lng"`. Resolve with `pointFor(k)`.

## 7. iNaturalist facts we rely on (all verified against the live API)

- Salticidae = taxon **48139**. Australia place **6744**, Queensland **7308**. Taxon `ancestor_ids` include the taxon itself on v1 and
  on v2 `taxon`, but **not** on v2 `identifications[].taxon` (`trimObs` handles both).
- `GET /v1/observations/taxonomy?taxon_id=48139&…` returns a whole tree (`rank`, `parent_id`, `descendant_obs_count`) for any
  `user_login`, `place_id`, or `lat/lng/radius`, with `d1` (observed) or `created_d1` (uploaded) windows. **`created_d1` accepts a full
  ISO datetime.** One call gives genus + species counts. The worldwide tree (`verifiable=true`) is ~2,700 nodes / ~60 KB gzipped.
- **Photo licences** (checked 2026-10-06): v2 `photos:(url,license_code,attribution)`; `license_code` is `cc0`, `cc-by`, `cc-by-nc`,
  `cc-by-sa`, `cc-by-nc-sa`, `cc-by-nd`, `cc-by-nc-nd`, or null for all rights reserved. `photo_license=cc0,cc-by,cc-by-nc` filters
  observations on v2. All the owner's photos are all rights reserved (null) on `static.inaturalist.org`, which sends no CORS header
  (rechecked: 200, no `Access-Control-Allow-Origin`). `attribution` reads "(c) Name, some rights reserved (CC BY-NC)" (`byName` parses it).
  Of the 80 Australian genera's default taxon photos: 31 are CC0/CC BY/CC BY-NC, 28 other CC licences, 21 all rights reserved or none.
- v2 `GET /v2/observations?fields=…` returns only the requested fields. Nested fields use RISON, e.g.
  `(id:!t,taxon:(id:!t,name:!t),photos:(url:!t))`. v2 honours `id_above`, `updated_since`, `hrank`/`lrank`, `quality_grade`,
  `created_d1`, lat/lng/radius, and `per_page=0` for a bare count.
- `GET /v1/observations/histogram?taxon_id=G&place_id=P&interval=month_of_year&verifiable=true` → `results.month_of_year`.
- `GET /v1/observations/observers?taxon_id=…&place_id=…` → top observers.
- `GET /v1/places/autocomplete?q=` → `location "lat,lng"`, `admin_level` (0 country, 10 state, 20 county/LGA, null for parks etc.),
  `bbox_area` (deg²). `GET /v1/places/{ids}`.
- `GET /v1/taxa/{≤30 ids}` → `default_photo` (with `license_code`, `attribution`), `wikipedia_summary`, `preferred_common_name`.
- **Common names** (checked 2026-10-06): `/v1/taxa/{ids}` returns `preferred_common_name` in English with no `locale` (identical to
  `locale=en`; `preferred_place_id=6744` changed nothing for these genera; `locale=fr` gives null plus `english_common_name`). The key
  is missing when there's none. `/v1/observations/taxonomy` never carries common names. v2 `/taxa?fields=preferred_common_name` and v2
  observations `taxon:(preferred_common_name:!t)` work too (unused). Only 15 of the 80 Australian genera have one (e.g. *Maratus*
  Peacock Spiders, *Portia* Dandy Spiders, *Myrmarachne* Ant-mimic Spiders, *Cosmophasis* Iridescent Jumping Spiders); *Phidippus*
  has none at genus level. SPOODEX shows iNat's capitalisation as is.
- Annotations: **Sex = 9** (Female 10, **Male 11**), **Life stage = 1** (Adult 2, Nymph 5, Juvenile 8), **Evidence = 22** (Egg 30, Molt 28, Construction 35).
- Pagination: `per_page=200&order_by=id&order=asc&id_above=<last>` avoids the 10k page cap.
- **Map grid** (checked 2026-10-06): `/v1/grid/{z}/{x}/{y}.grid.json?taxon_id=…&verifiable=true` returns a UTFGrid: `grid` (64 rows of
  64 chars), `keys`, and `data` keyed by cell with `cellCount`, `latitude`, `longitude`. Any observation filter works. Counts summed
  into 0.25° squares came within about ±40% of bounding-box counts.
- **Bounding boxes and months** (checked 2026-10-06): `swlat/swlng/nelat/nelng` work on v2 `/observations` (193 records in a ±10 km box,
  none outside it, 7 in the corners a circle would miss), v1 `/observations/taxonomy` and `/observations/observers`; `month=10` filters
  by month of any year. `radius` is a true circle in km (a 5 km query's farthest record was 5.0 km away), which is why v1.17 moved to boxes.
- **Several users in one query** (checked 2026-10-05): v2 `/observations?user_login=themoojuice,laz` returned 504 = 342 + 162 (the two
  separate totals; Qld, Sep–Dec 2025), and v1 `/observations/taxonomy?user_login=a,b` returns the combined tree (504 at the root).
- **`community_taxon_id` and the observer's own ID** (checked 2026-10-05 on 100 recent records of themoojuice + laz): 0 of 69 records
  whose only current ID was the observer's had a community taxon; all 31 with two or more current IDs had one. So a community taxon
  doesn't say *who* agreed; events check `identifications[]` (current, user login, taxon id + ancestor_ids) directly.
- v2 `fields` used by events: `user:(login)`, `created_at`, `identifications:(current,user:(id,login),taxon:(id,ancestor_ids))`,
  `annotations`, `photos:(url)` (see `EV_FIELDS`). `/v1/taxa/autocomplete?taxon_id=48139&rank=genus,species` finds dare targets.
- Needs ID stuck above genus: `taxon_id=48139&hrank=family&lrank=subtribe`; exactly one taxon: `taxon_id=X&rank=<X's rank>`
  (owner: 305 and 105 for Salticinae, matching the app with `captive=false`).
- **Rate limits**: iNat asks for ~1 req/s and ≤10k/day per client, and returns 429s with no CORS header. Bursts from `curl` plus the
  app sharing an IP get empty responses: wait a minute. Rough call costs: fresh import ≈ 1 per 200 obs + 3; ladder ≈ 26; pioneer ≈ 180;
  wanted posters ≈ 40; a trip ≈ 55; bounties 3; news 3; sets 1–2 (world tree).
  **Lineage drawers** (2026-10-08): `/taxa` for photos and licences of the strip and drawer heroes (≤ 1 call per 30 genera, cached), then
  up to 12 `ensureCcPhotos` calls (one per strip genus without a licensed photo, 30-day cache), and ALA lore for ≤ 8 genera per render
  (90-day cache). The first visit costs ≈ 14 iNat calls; later visits 0.
  **Three to find next** (v1.20): the home scan and last-30-days scan if not cached (2), season curves for the 8 likeliest (30-day cache,
  shared with the posters), 1 `/taxa` for names and photos, 1 for the owner's photos (30-day cache): ≈ 12 the first time, then 0–2.
  **Landing page** (v1.20): 1 CC call per `LAND` genus the owner has never recorded (only *Phidippus* now) + 1 `/taxa` = 2, once per
  14 days per browser; 0 for anyone who has opened a SPOODEX before. The owner's picks cost nothing (`OWNER_PICKS` is in the file).
  **Map scan** (v1.17): 2 calls (the chosen window + the last 30 days; 1 for a 30-day scan) plus a place-name lookup (≤ 3, once per 0.1°
  cell per session); a 100 km scan is still one call per window. The first Map-tab visit scans around home automatically.
  **Frontier layer** (v1.18): 2 calls per z7 tile in view (≤ 6 tiles per map move, 30-day cache); nothing while the switch is off.
  **Map tab, first open** (v1.19): the home scan (2–3 calls, once) and season curves for up to 25 new-to-you genera in it (30-day cache,
  shared with the posters). The missing-genus squares and the weather panel's genera list (up to ~70 calls between them) are gone.
  Elevation and terrain tiles come from AWS, not iNat (owner: 66 z12 tiles for 1,534 records, once).
  **Spooding weather**: 0 iNat calls (1 Open-Meteo call per home base per hour).
  **Events** (v1.16), measured: opening a fresh **6-player event costs 8 calls** (6 before-the-event collections + 1 event tree + 1 page
  of records) when the place name and the region's checklist are cached, up to **10** when they aren't (+1 `places`, +1 region
  `taxonomy`), plus 1 per extra 200 records in the window. Each **refresh: 2** (tree + 1 page per 200 records). An **open bioblitz** adds 1
  `observers` call per refresh and up to 25 one-off collection calls (measured: 7 players, 10 calls). Creating a **bingo** event
  checks the season of ≤ 44 candidate genera (histograms, 30-day cache shared with the posters; 0–2 calls when cached) plus the region
  checklist. **Open worldwide hunt** (v1.20, measured on September 2026 with no place): first open **38 calls, about a minute**: 1 `observers`
  (25 players), 25 before-the-event collections, 1 world checklist (`taxonomy`, ~60 KB), 1 event tree, 9 pages for 1,795 records, 1 `/taxa`
  for the best finds' common names. Each **refresh: 11** (observers, tree, 9 pages), now every 2 hours instead of 30 minutes; the
  collections of players already read are kept. The busiest month measured (Sep 2026, worldwide) is about half the 20-page cap; the October 2026 hunt on day 6 read 25 players and 457 records (3 pages); a
  place-limited hunt is far smaller (Australia's top 25: 885 records, 5 pages; Queensland's: 492, 3 pages). The **Crew Cup** is an event like the others, for this month and last month: ≈ (crew + you) + 2 calls each the first time,
  then 2 per 30 minutes while the Crew tab is open; last month stops once final.
- **The iNat website is behind a Cloudflare bot check.** Automated browsers get "Just a moment…". Don't try to bypass it; verify
  web-link filters by running the same parameters against the API.
- Test accounts: `themoojuice` (owner), `laz` (Qld, 38 genera, 60 species; the standard compare test, 1,180 obs), `natashataylor`,
  `rattyexplores`, `scottwgavins`.

- **Naturalist rank** (checked 2026-10-07 from the browser): v2 `/observations?taxon_id=831786&place_id=6744&quality_grade=research&captive=false&order_by=observed_on&order=asc&per_page=200&fields=(id:!t,observed_on:!t,user:(login:!t))`
  → 67 records, 39 distinct logins, the owner **#23 of 39** for *Zenodorus metallescens* in Australia (#17 of 30 in Queensland), as the
  spec expected. v1 `/observations/observers?…&quality_grade=research&per_page=1` → `total_results` = naturalists. *Huntiglennia williamsi*
  (the spec's pencilled example) has 0 records in Australia and the owner has none of it either; real pencilled cases are many (Profile).

## 7b. Museum data (Atlas of Living Australia) facts (checked 2026-10-07 from the browser; CORS fine from localhost)

- Name matching `api.ala.org.au/namematching/api/search?q=Maratus tasmanicus` → `scientificNameAuthorship` "Otto & Hill, 2013", plus
  `family`, `rank`, `success`. Genus names that are also other taxa's (*Tara*, *Neon*) resolved to Salticidae, but `ensureLore` still
  requires `family === 'Salticidae'`.
- Biocache: use the **`genus:"X"` / `species:"X y"`** fields with `fq=family:Salticidae`. `taxon_name:"X"` is a looser match
  (*Zenodorus*: 251 specimens vs 486 by `genus:`). Always `fq=-data_resource_uid:dr1411` (iNaturalist Australia's copy inside ALA).
- Holotype: `fq=type_status:HOLOTYPE&pageSize=1` → `recordedBy[]`, `eventDate` (epoch ms, UTC midnight), `year`, `stateProvince`,
  `dataResourceName` ("Tasmanian Museum and Art Gallery provider for OZCAM": strip " provider for …"), `raw_catalogNumber`; full record
  `/ws/occurrence/<uuid>` → `raw.location.locality` ("Stanley (unlocalised)"), `raw.occurrence.catalogNumber` (J5946).
  *Maratus tasmanicus*: J.C. Otto, 26 Dec 2010, Stanley, Tasmania, TMAG J5946. *Jacksonoides queenslandicus*: no holotype in ALA.
- **First collected**: `fq=basis_of_record:PRESERVED_SPECIMEN&fq=country:Australia&fq=year:[1700 TO 2100]&sort=year&dir=asc` gives the
  earliest specimen with its museum in one call (the spec's year facet needs a second call for the museum). **`country:Australia` matters**:
  without it *Zenodorus* "first collected" was an 1897 Naturalis specimen with no country and an 1898 one from Papua New Guinea.
  **30 Dec 1899 is a placeholder** (spreadsheet day zero): ANIC holds many salticid specimens dated 1899-12-30 (*Zenodorus*, *Maratus
  griseus*, *Pellenes*…), which made several genera read "first collected 1899"; `zeroDate` skips them. *M. tasmanicus*'s earliest
  specimen (1994, Australian Museum, Vic) predates its 2010 holotype; both lines show.
- Ghost facet: `q=*:*&fq=family:Salticidae&fq=basis_of_record:PRESERVED_SPECIMEN&facets=genus&flimit=-1&wkt=POLYGON((w s,e s,e n,w n,w s))`.
  Owner's home square (±25 km around 16.875 °S 145.625 °E): 46 genera with specimens, of which **new to him and none on iNat there:
  *Neon, Ocrisiona, Cyrba, Thyene, Barraina, Margaromma, Pellenes*** (+ *Rhombonotus*, which he has elsewhere). The spec's *Adoxotoma*
  only has non-specimen sightings there. *Habrocestum* and *Mintonia* (AFD-only) are dropped by the checklist.
- BIE `childConcepts` of the AFD Salticidae concept → 91 genera with `nameComplete` ("Abracadabrella Zabka, 1991"). Openverse
  (`api.openverse.org/v1/images/?q=`) answers anonymously (Phase 2; unused).

## 8. Game rules

- **Level = number of genera.** Species are a side collection and never drive level (owner's explicit choice). Sets are side goals too.
- **Mastery points** (v2.3; "XP" until then): the per-record mastery events in `buildModel` (`g.xp`, `g.xpLog`, `M.xp`), shown as
  "Mastery points" in Profile's ledger sheet and the genus page's "Mastery points ledger". Quests and wanted posters no longer print rewards (they were never added
  to anything); a poster's reward is just "LEVEL N+1".
- States: Unknown (greyed photo, `???` unless "reveal names") → Glimpsed/Needs ID (stuck above genus) → Discovered →
  Supported (community taxon within the genus; **not** Research Grade) → Mastered (7 of 10 `CRITERIA`).
- Tiers/chassis: 0 Mk 0 · 5 Field Notebook · 15 Mk II (lineage tree) · 30 Mk III (rarity) · 50 Naturalist Cabinet · 75 Arachnologist Rig ·
  100 Research Station. Skins `notebook` / `kit` / `cabinet`. ⚙ → "peek" unlocks everything.
- Rarity: five colour tiers by record count within scope (red Exceptional, blue Rare, yellow Scarce, green Uncommon, white Common; not recorded in scope = red). Prestige ✦ = Σ genera 10 × tier level (white 1 … red 5) + Σ species 3 × tier level.
- Streaks count consecutive **field days** with a new genus.
- **Sets** (`THEMES` + automatic):
  - Curated (taxon names at any rank; starter content for the owner to edit): 🦚 Peacock spiders (*Maratus* species),
    🐜 Ant mimics (hand-picked genera; the tribe Myrmarachnini wasn't used because it also holds *Judalana*, *Damoetas* etc.),
    🕸 Portia & the spartaeines (Spartaeinae), 🌿 Beyond Salticinae (every other subfamily), ⭐ Celebrities (11 famous species, worldwide).
  - Computed: 🏡 Local specialties (≥90% of a genus's verifiable iNat records are in scope, ≥5 worldwide), 👻 Ghost list (≤25 records
    in scope), 💞 Couples (your species with both Male and Female annotations), 🧭 Wanderers (your genera in ≥5 different 25 km squares),
  ⛰ Highlanders (your genera recorded above `HIGHLAND_M`, currently 700 m, by terrain height at each non-obscured record; no quest).
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
  location privacy note by the home-base controls, the GoatCounter and weather disclosures in Settings, photo and weather attribution,
  and the chassis tier names (game flavour; their subtitles were removed in v2.3).
  Event screens explain what inked/pencilled and the points mean (it's what makes the numbers readable); keep those.
  "Spooding weather" scores the weather and the season; keep its wording from suggesting it predicts spiders.
- **Photos from other people** (owner, v1.20): licence-checked and credited every time. Prefer the owner's own photos (`themoojuice`,
  ~14k observations; his best per genus is `OWNER_PICKS`, chosen by eye, never by faves: "top quality", his words); use someone else's only where he has no suitable one, and then only CC0, CC BY or CC BY-NC (`OK_LIC`), credited
  "© name, licence" and linked to the record. Existing views that still show iNat's taxon photo without the check are listed in §12.
- **Nothing invented, museum data describes only** (v2.0): no generated prose about a taxon's history; lines come from iNat, ALA or the
  owner's constants and are omitted when missing (never "unknown"). The checklist is fixed by the taxonomy rule (`TAXA_AU`, regenerate
  with `tools/taxa.py`); a museum name outside it is ignored silently (no card, ghost or count). Honours are **inked** only for research-grade
  records; before that a rank is **pencilled** ("you'd be #3 once confirmed"). Field stories: owner-supplied papers, owner-approved, `ok:true`.
- **Taxonomic care**: propose curated taxon lists to the owner; don't present them as settled. Check names against the live iNat tree.
- **Privacy**: ≥25 km squares only, no exact coordinates (bounty distances rounded to 5 km), home base rounded to ~0.01° and kept in
  the browser, trips kept in the browser. Share links carry only `?u=`, `?vs=`, `?crew=` (usernames) and `?ev=` (event links, below).
  The **My SPOODEX image** (v1.20) names at most a country or state: no local areas, maps or squares, and only the `?u=` link.
  Open-Meteo gets the home base rounded to 0.1°.
  **On screen** (v2.3) a square or point is never printed finer than a quarter degree: `cellLabel` gives its own label, else "near <the
  county-level iNat place (admin level 20) most of your records in that 25 km square share>", else "about 17°S 145.75°E" (nearest 0.25°).
  Stored values (base and scan points at 0.01°) are unchanged. The genus page's "First recorded" and the new-genus ceremony show the
  square's name the same way (owner, v2.3); the record's iNat place guess (`pg`) is still stored but no longer shown anywhere.
- **Event links** (v1.16): `?ev=<base64url(JSON)>`, ≤ ~1,500 characters, validated by `evCheck` (anything malformed shows only "This event
  link is broken"); every decoded string is `esc()`d. Fields: `v` 1 · `m` blitz|bingo|turf|duel|dare · `n` name ≤ 40 · `d1`/`d2`
  YYYY-MM-DD (≤ 92 days; a duel 1–3 days) · `p` optional iNat **place id** · `r` roster of 1–6 iNat logins (absent = open bioblitz) ·
  `s` seed · `sc` rarity-scope place id (a state; only when there's no `p`, and not for an open event, which uses the world's records) · `t` bioblitz target genus ids (≤ 30) · `b` bingo pool
  codes · `q` dare target code. **Place ids are allowed in event links (owner-approved, 2026-10-05)**: a named park, LGA or region
  the creator picks from `/places/autocomplete`, never coordinates, and never filled in from the home base. Square codes: `g<id>`
  genus, `s<id>` species (dares), `n` new to you, `x` no player had it, `t` tribe new to you, `M`/`F`/`J` male/female/juvenile, `s`
  species-level ID, `q` three 25 km squares, `bf`/`bc`/`be` feeding / courtship / egg sac, retreat or moult (keyword or Evidence
  annotation). GoatCounter gets only `event-created` and `event-opened`, never names, usernames or places.
- **No backend** yet; public read-only iNat data; no OAuth. Third parties: GoatCounter (anonymous counts, §5) and Open-Meteo (weather, §3).
  Single file plus the approved offline sidecars until it clearly outgrows that (then Vite + TS).
- **Mobile matters**: most visitors will be on phones. No horizontal page scroll at 375 px.
- Never help find or enter the owner's credentials (or anyone's).
- **GoatCounter** gets event names only (§5 "analytics"): never usernames, places or coordinates.
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
for (const id of Object.keys(S.events)) run('ev:'+id, ()=>{S.tab='crew'; S.evOpen=id; render();});
S.evOpen=null;
for (const m of ['blitz','bingo','turf','duel','dare']) run('evform:'+m, ()=>{S.tab='crew'; S.evDraft=evDraftNew(m); render();});
S.evDraft=null;
for (const [n,f] of [['genus',()=>openGenus(S.M.genera[0].id)],['case',()=>openCase(wantedList()[0].id)],['settings',settings],['card',openTitleCard],['dexImage',()=>openDexImage()],['wrapped',()=>openWrapped()],['evcard',()=>openEventCard(Object.keys(S.events).find(id => S.events[id].obs))]]) { run('modal:'+n,f); $('#modalRoot').innerHTML=''; }
S.prefs.layer='genus'; S.prefs.wantedView='bounty'; savePrefs(); ({out, errs:__errs})
```
**v2.0 additions** (add to the loop above): `run('dex:never', ()=>{S.tab='dex'; S.prefs.filter='never'; render(); S.prefs.filter='all';})`,
and modals `['honCard', ()=>openHonourCard(S.u.honours.find(e=>HONOUR_BY[e.tier].cer)?.k)]`, `['dispatch', ()=>openDispatch(…same k…)]`.
Checks: `natRank(831786, 6744)` → #23 of 39 (2026-10-07; drifts); `ensureLore('Maratus tasmanicus','species')` → holotype J.C. Otto 2010
Stanley TMAG; `ensureLore('Jacksonoides queenslandicus','species')` → `holo:null` and no Holotype line; a home scan's
`scanGhosts(S.u.mscan)` lists only `TAXA_AU` genera; with `S.prefs.ext = {ala:false}` `performance.getEntriesByType('resource')` shows no
`ala.org.au` requests on any tab. **Force a ceremony**: `revealQueue([{ hon:S.u.honours.find(e => HONOUR_BY[e.tier].cer) }])`; a crew one:
`revealQueue([{ hon:{ k:'<taxon>:<place>', tier:'first', rank:1 }, crew:'laz' }])` (laz is #1 for *Simaethula* in Australia). A field story
on screen without editing the file: `FIELD_STORIES.Portia = { story:'x', refs:[], ok:true }; openGenus(<id>)`, then `delete` it.
Then repeat the tab loop at phone width (375 px) and check `document.documentElement.scrollWidth === innerWidth`, and try guest mode
("See what jumping spiders live near you") on a fresh load.
**Seeing it as a stranger** (v1.20): storage is per origin, so `http://127.0.0.1:8765/spoodex.html` starts empty even when
`localhost:8765` has saves: the landing page, then guest mode or a username. Once 127.0.0.1 has saves of its own, use a new
`*.localhost` name each time (`http://stranger7.localhost:8765/spoodex.html`; Chromium sends any `*.localhost` to the same server), which is
a brand-new origin: no saves, no service worker, no landing cache. To replay a reveal on an origin, `store.del(ukey('<login>'));
store.del('lastLogin'); await store.flush()` and reload. The ID celebration through a real sync: edit a cached record back above genus
(`o.t`, `o.anc` cut at Salticidae, `o.ct = null`; for a "Card unlocked" also drop the genus from `S.u.seen`), `S.M = buildModel()`, set
`S.u.meta.lastSync` to an old date and press ⟳ (the incremental sync then re-reads every record, as an ID landing would bump the record's `updated_at`). The service worker serves the shell network-first but the
browser's HTTP cache can hand it a stale `spoodex.html` from `python -m http.server`; add `?nc=<n>` to the URL (any unknown parameter is
ignored) or unregister the worker (`navigator.serviceWorker.getRegistrations()`) while testing. If the preview's port is taken by another
session, the second configuration in `.claude/launch.json` (`spoodex-alt`, port 8766) serves the same folder.
**Testing the v1.20 moments without waiting for iNat**: the ID celebration:
`const o = structuredClone(S.M.leads[0].obs[0]); o.anc.push(S.M.genera[0].id); revealQueue(celebrations([], [o]))`;
a tab unlock: `S.u.tabsSeen = ['profile','dex','map','crew','quests']; render()`; the photo checklist again: `S.prefs.tipsDone = false`.

**Testing events** (console, on `?u=themoojuice`): build one without the form and open it:
```js
const code = evEncode({ v:1, m:'blitz', n:'Test blitz', d1:'2025-10-01', d2:'2025-10-31', p:7308, r:['themoojuice','laz'], s:12345 });
openEventCode(code, false);   // then S.events[evId(code)], evResult(S.events[evId(code)])
```
A past window is final at once, so the podium shows after the first read. To exercise lead changes, set `E.st`, `E.lead`, `E.ink` to an
older snapshot and call `evAfter(E)` (put them back afterwards; `E.feed` and `S.crew.feed` keep the lines). Different viewers of a
bingo link must see identical cards: compare `bingoCard(ev, login)` under `?u=themoojuice` and `?u=laz`. Clipboard writes can be
refused in an automated pane; `evStart` then falls back to `window.prompt`, which blocks scripts, so stub it (`window.prompt = () => null`). In the Claude desktop browser pane, screenshots sometimes time out or show a stale frame when the
pane is in the background: rely on DOM checks (`read_page`, `javascript_tool`) and retry, or toggle `resize_window` mobile → desktop.
The field dial rotates in `requestAnimationFrame`, which doesn't run while the pane is hidden: take a screenshot first to bring it forward.

**Testing offline without devtools** (the desktop pane has no Network panel):
```js
// app-level offline (the service worker still sees the network)
Object.defineProperty(navigator, 'onLine', { configurable:true, get:() => false }); dispatchEvent(new Event('offline'));
// back: delete navigator.onLine; dispatchEvent(new Event('online'));
```
For the service worker's offline path, stop the preview server (`preview_stop`) and reload: the shell,
libraries, viewed tiles and photos come from Cache Storage (fetch a non-shell file such as `/HANDOVER.md` to confirm the server is down;
`/index.html` will answer from cache). In real Chrome, devtools → Application shows the manifest, icons and worker, and Network → Offline
does the rest. Clear old caches with `caches.keys().then(ks => ks.forEach(k => caches.delete(k)))` if a test needs a cold start.

**Branches and tags** (2026-10-07): `main` is the live site. Finished branches are marked with `archive/<branch>` tags
(`archive/feature-3d-map`, `-crew-games`, `-field-mode`, `-map-redesign`, `archive/fix-map-streamline`, `archive/feature-spood-frenzy`),
pushed to GitHub; the branches themselves are kept until the owner decides to delete them. Releases are tagged `v1.20.0`, `v2.0.0`.
Work on a new branch, merge it to `main` with `--no-ff`, tag the release.

**Ship**:
1. **Bump `VERSION` in `sw.js`** (e.g. `1.15.0` → `1.16.0`) on every release, even if `sw.js` didn't otherwise change: it renames the
   shell and library caches, and the changed bytes make browsers install the new worker (which then drops the old `spoodex-*` caches).
2. `cp index.html spoodex.html sw.js manifest.webmanifest icon-192.png icon-512.png site/`
3. `git commit` (message ends with the attribution line from the session's system reminder) → `git push`.
4. Confirm it's live: `curl -s "https://themoojuice.github.io/spoodex/spoodex.html?nc=$RANDOM" | grep -c <new identifier>`.
   Installed copies pick up the new shell on their next online launch (network-first), or the one after if the network took over 5 s.

## 11. Known issues and caveats

- Incremental sync uses `updated_since`; unconfirmed whether adding an annotation bumps `updated_at`. The genus page suggests
  ⚙ → Full resync if a mastery box doesn't tick. (Full resync also runs every 14 days.)
- Web links (fix-it, Needs ID) use Explore params the API honours; the website itself can't be checked by automation (Cloudflare).
  If the owner reports a wrong link, switch to explicit `id=` lists.
- **Photo CORS**: `static.inaturalist.org` (all-rights-reserved photos, most of them, including all of the owner's) sends no
  `Access-Control-Allow-Origin`, so they taint a canvas. `inaturalist-open-data.s3.amazonaws.com` (CC photos) sends `*`. Card PNG
  downloads therefore use name plates for all-rights-reserved photos. A fix needs a tiny image proxy (e.g. a Cloudflare Worker),
  which would be the first backend. Don't cache-bust S3 URLs with `?cors=` (S3 returns its CORS config); the card uses `?spoodex=card`.
  This matters more now the My SPOODEX image is meant for Reddit: for anyone whose photos are all rights reserved (including the owner)
  the downloaded PNG shows name plates, while CC-licensed users (iNat's default for new accounts is CC BY-NC) get every photo.
- Opening a share card for someone with all-rights-reserved photos logs one "Failed to load resource: net::ERR_FAILED" per photo: the
  CORS attempt on `static.inaturalist.org` (no CORS header) failing before the card falls back. Expected; not an app error.
- `ensureInfo` has one `infoBusy` flag; concurrent requests are dropped, not queued (they're retried on the next render).
- Behaviour detection is keyword-based (`BEH_RX`) and heuristic.
- Ladder = top 25 observers **by record count**, re-ranked by genera; ladder counts verifiable in-place records, crew counts all
  non-captive records (so they differ by design).
- iNat taxonomy quirks show through (e.g. a genus with no tribe shows "· Salticinae"; a stray *Lyssomanes* record in Queensland is
  almost certainly a misidentification). That's data, not a bug.
- Only tested in depth with Australian accounts. Other countries should work (all queries are place-based), but check with a US and
  a European account before promoting widely.
- With every tab open (from 15 genera, or Show every tab) there are 11, in one sideways-scrolling row on phones.
- 3D map: the terrain tiles include sea-floor depths, so the hillshade draws the reef shelf off Cairns as a faint grey streak in the sea.
  A MapLibre map doesn't draw (or fire `load`) while its page isn't painting, e.g. when the Claude browser pane is hidden or the app
  window is behind another: test the 3D map with it in front.
- **Offline photo cache and quota**: all-rights-reserved photos (`static.inaturalist.org`) can only be cached opaque, and browsers pad
  opaque entries in quota accounting (Chrome by megabytes each), so 400 photos can count as gigabytes. Eviction under storage pressure
  takes the whole origin, IndexedDB saves included, unless storage is persisted; installed apps ask for that. If it bites, lower the
  `spoodex-photos` cap or cache only CORS photos.
- **Events are deterministic up to the data each viewer has**: everyone reads the same records, but ★ rarity comes from each browser's
  cached regional tree (refreshed weekly), so two viewers can differ by a star until their caches agree; a record can also be inked
  between one viewer's refresh and another's. Once final, each browser stops refreshing and keeps its last reading (trophies come
  from it). Open bioblitzes are re-read from the current top-25 observers each refresh, so a 26th-ranked player can drop out.
- Event records are attributed by `user.login`; a renamed iNat account breaks old links (its records stop matching the roster).
- iNat's `/places/autocomplete` also returns user-made places (e.g. private properties); the event form lists whatever iNat returns.

## 12. Backlog and ideas (owner-approved or discussed; not built)

**Before posting publicly (discussed 2026-09-28)**:
- **Usage analytics**: DONE in v1.11 (GoatCounter, see §5 "analytics"). Stats: https://themoojuice.goatcounter.com (owner signs in).
- **Mobile navigation**: group the 11 tabs into ~4 sections (e.g. Collection / Explore / Social / Quests). v1.20 shows new players five
  tabs and opens the rest with their level, and the phone header is one line; grouping is still open.
- **Test outside Australia**; consider showing progress as a % of the regional total for low-diversity regions (e.g. the UK has ~20 genera).
- **Full-photo share cards** via an image proxy (see §11).

**Decided (v2.3, simplify, owner 2026-10-11)**: the level stays every genus recorded anywhere, with "+N elsewhere" in the headline;
three sections, with Quests under Go spooding; "XP" renamed "mastery points"; first-record places show the square's name, not the place
guess. Still open: the view label "Lineage tree" could become "Lineage"; the Research Station module reads "Every module".

**Awaiting the owner's decision (v2.0, the naturalist update)**:
- **Honour names and cut-offs** (`HONOURS`): First on record (1) · Founding trio (2–3) · Vanguard (4–10) · Founding Naturalist (11–50).
- **A lost honour** (record re-identified away): disappears quietly (built). Alternative: stays as "earned <date>".
- **Ghost sources**: museum specimens only (built). Adding NatureMapr / BowerBird / QuestaGame sightings would bring back e.g. *Adoxotoma*.
- **"Known from Australia"** (53 / 89) is an extra dex line only; sets, Profile and share images still use iNat's 81. Feed it further?
- **Built differently from the spec, please confirm**: (1) *pencilled* rank = where your earliest non-casual record would sit among
  research-grade naturalists, computed from the same list (no extra `verifiable=true` scan); (2) the rank list is read to 50 naturalists
  even after your login appears (still one call for nearly every taxon), so it serves crew members too; (3) "first collected" is limited to
  specimens collected **in Australia** and skips 30 Dec 1899 placeholder dates, found in one sorted call; (4) honours are stored per user
  (`S.u.honours`), not in a shared `honours` key; (5) the dispatch says "became the 4th naturalist to record X on iNaturalist in
  Australia" (the spec's "the 4th X ever photographed" would count records, not naturalists); (6) lore queries use `genus:`/`species:`
  rather than `taxon_name:` (§7b).
- **First import**: honours found while a new player's history is backfilled are filed quietly (ceremonies only follow a sync). A one-time
  "your honours" reveal after the first backfill would give newcomers the big moment for past finds. Not built.
- **Field stories**: renderer ready, `FIELD_STORIES` empty; the genus-level holotype line appears once a story names its `type` species.

**Awaiting the owner's decision (v1.20, spood frenzy)**:
- **Pitch** (top of the landing page). Using the first; alternatives:
  1. "A Pokédex for jumping spiders, filled in from your own iNaturalist photos." (yours, lightly kept)
  2. "Collect every jumping spider genus. Your iNaturalist photos fill in the cards."
  3. "Photograph a jumping spider, post it on iNaturalist, and its card lights up here."
  "Pokédex" is a Nintendo trademark; using it descriptively in a tagline is common, and 2 and 3 avoid it if that worries you.
- **Landing genera** (`LAND`, proposed): the world's most-recorded salticid genera on iNat plus favourites: *Maratus*, *Phidippus*,
  *Portia*, *Mopsus*, *Cosmophasis*, *Myrmarachne*, *Salticus*, *Menemerus*, *Plexippus*, *Hasarius*, *Evarcha*, *Zenodorus*. 11 of
  them now use your picked photo (`OWNER_PICKS`; *Salticus* is your one casual record). You've never recorded *Phidippus*, so it uses
  the most-faved CC BY-NC research-grade photo by someone else (Lily Fulton, a sharp face-on orange *Phidippus*), credited.
  Your photos are all rights reserved; they're shown because you asked for them, credited "© themoojuice".
- **One line per genus** (`wowLine`): of your 54 genera, 24 get a Wikipedia line, and only about 5 say something about the animal
  (*Maratus* courtship colours, *Myrmarachne* waving its front legs as antennae, *Portia* eating other spiders, *Abracadabrella*
  "appear to mimic flies", *Menemerus* "found worldwide in warmer climates"); most of the rest say where the genus lives, and 30 get
  nothing. **You're writing your own (2026-10-07)**: open `?u=themoojuice`, ⚙ → ✏️ Write the genus lines (or ✏️ under the line on a
  genus page), click a box and type; it saves as you go and shows in your browser at once. When you're done, 📋 Copy all for SPOODEX and
  paste it to Claude (or over `const GENUS_NOTES = {};` in `spoodex.html`) to publish them for everyone. Until then Wikipedia's lines
  stay, quoted as written, so a line can say "endemic" or "native".
- **Photo checklist** (`PHOTO_TIPS`, "📸 Photos that get a genus ID"; please check the wording):
  1. 👁 **Face on**: the big front eyes and the face
  2. ⬆ **From above**: the whole body and its pattern
  3. ↔ **From the side**: the legs and the body in profile
  4. 📏 **Something for scale**: a fingertip, coin or ruler beside it
  5. 📸 **Several sharp shots**: all in the same iNaturalist record
- **Mystery spood actions**: "Ask for an ID ↗" opens the record (where you'd @mention an identifier); "Add photos ↗" opens
  `inaturalist.org/observations/<id>/edit`, iNat's own edit page for the observer. Neither can be checked by automation (Cloudflare).
- **Tab levels** (`TABS[].at`, genera needed): always Profile, SPOODEX, Map & scanner, Crew, Quests; Trip planner and
  Compare 5 (the Field Notebook tier); Bounty board and Ladder 10; Lineage tree 15 (unchanged, Mk II). The old 🔒 tab and "MODULE NOT
  INSTALLED" plate are gone: locked tabs are simply not shown.
- **Tier subtitles: removed in v2.3** (owner, 2026-10-10, "no filler captions"): `TIERS[].sub` ("Brass fittings. Mastery ledgers
  installed." etc.) is gone from the data, the header and Profile's Chassis sheet, and the Research Station module reads "Every module".
- The landing page doesn't guess where a stranger is, so it always shows this global set; their own area comes with the first start.
- **Lineage tree images for genera never on iNat in Australia** (`PLATES`, picked 2026-10-08, please check): of the 9, four got a
  picture, each naming the species shown. *Pseudomaevia*: Rainbow (1920) plate XXXI fig. 123, *P. cognata*, the whole animal, public
  domain (Wikimedia Commons); *Harmochirus insulanus* (portioid, CC BY), *Nungia epigynalis* (Marco Chan, CC BY), *Phlegra blaugrana*
  (Óscar Mendez, CC BY-NC) and *Pristobaeus beccarii* (Naufal Urfi Dhiya'ulhaq, CC BY-NC) from iNat outside Australia, chosen by eye.
  *Ancipitilobus*, *Capeyorkia*, *Frewena*, *Parahelpis* (described 1985–2016) have no public-domain figures and no licensed photos, so
  they stay as specimen labels; their papers' figures are copyright. Commons' *Harmochirus*, *Pristobaeus* and one *Phlegra* image were
  CC BY-SA, so not used. Swap any entry for a better image (keep the licence rule).
- ***Hypoblemum*: settled (owner, 2026-10-08)**: a junior synonym of *Maratus* (Otto & Hill 2012, 2021; as summarised in Schubert's
  2025 thesis). `tools/taxa.py` now has `SYNONYMS = {'Hypoblemum': 'Maratus'}`, so it's left out of `TAXA_AU` even though the Lucid key
  still lists it (update the key when convenient), and its plate is gone. Two related fixes stay: ALA authorities only for an exact
  name match (ALA answered "Hypoblemum" with *Maratus* Karsch, 1878), and the checklist's authority wins for checklist genera.
  The same regeneration dropped *Asaphobelis*: it was on iNat in Australia on 2026-10-07 and isn't now (a record re-identified, it
  seems); the checklist follows iNat by design, so it returns by itself if a record does.
- **Noted, not built**: Schubert (2025, thesis) proposes *Tropijotus* gen. nov. for a north Queensland "tropical group" of the *Saitis*
  group (eleven new species, one new combination). A thesis isn't a published work for nomenclature, so nothing changes until the
  paper is out and iNat follows; then it arrives through iNat (and the Lucid key) like any genus.
- **"Did you know?" facts** (`GENUS_FACTS`, by genus name): written by you in ⚙ → ✏️ Genus lines and facts (the second box under each
  genus), saved as you type and shown first in the strip in your browser; 📋 Copy all gives both blocks to bake in. Biology facts like
  "the largest chelicerae for its size" only ever come from you; the app's own facts are counts, dates and places from the data.
- **Your photo picks** (`OWNER_PICKS`, done 2026-10-07 at your request, please check): I went through your 1,544 salticid records
  (4,340 photos) and chose one photo per genus for all 54 of your genera on sharpness, framing and how much of the animal shows,
  face-on where there was a good one. For the 13 genera with over 72 photos (*Cytaea* 921, *Cosmophasis* 435, *Simaetha* 330,
  *Zenodorus* 238, *Simaethula* 220, *Euryattus* 189, *Opisthoncus* 167, *Myrmarachne* 166, *Jacksonoides* 109, *Servaea* 92, *Mopsus* 89,
  *Holoplatys* 83, *Helpis* 77) I looked at the 72 sharpest by a sharpness score; every photo of the rest, including all 193 *Maratus*. Records still stuck above genus (305) weren't searched: they can't stand for a genus.
  Picks worth a look: *Maratus*, the face-on *M. griseus* on bark (obs 248862453; your only *M. nigromaculatus*, obs 384932826,
  is on mesh and less sharp); *Opisthoncus*, your *O. nigrofemoratus* on the gumnut twig (obs 342008178; this is the "nigrofemoratus" you
  remembered, an *Opisthoncus* rather than a *Maratus*); *Mopsus mormon*, green, face-on (obs 318158295); *Portia fimbriata* face-on
  (obs 278719012); *Cosmophasis micarioides* on a stem (obs 314116210). Weakest, because they're your only record of the genus:
  *Metacyrba* and *Paraplatoides* (one record each, same day, small black spiders on granite) and *Salticus* (one casual record).
  Swap any pick by editing its entry: `genus id: [observation id, 'photo id.jpg']` (the photo id and extension from the photo's URL).
- **Titles** (`TITLE_GEN`, genera needed → genus · adjectives; all valid iNat genera, checked 2026-10-07 with their record counts):
  0 *Phidippus* (240,604) Plucky, Proud, Fearless · 1 *Salticus* (96,576) Spirited, Swift, Spunky · 3 *Menemerus* (96,140) Mighty,
  Mettlesome, Marvellous · 5 *Plexippus* (39,386) Powerful, Peerless, Plucky · 8 *Hasarius* (24,777) Heroic, Hardy, Headstrong ·
  12 *Marpissa* (23,617) Masterful, Mighty, Magnificent · 15 *Myrmarachne* (16,371) Mighty, Mysterious, Majestic · 20 *Philaeus* (14,994)
  Fearless, Fierce, Formidable · 25 *Cosmophasis* (14,453) Courageous, Cosmic, Commanding · 30 *Hyllus* (11,575) Heroic, Herculean,
  High-flying · 40 *Maratus* (27,168) Magnificent, Majestic, Marvellous · 50 *Mopsus* (5,090) Magnificent, Mighty, Masterful ·
  60 *Euophrys* (3,885) Exalted, Epic, Elite · 75 *Bagheera* (1,191) Bold, Brilliant, Brave · 90 *Spartaeus* (800) Splendid, Sovereign,
  Stalwart · 100 *Portia* (3,294) Peerless, Prodigious, Phenomenal. *Maratus* and *Portia* sit higher than their record counts, for fame.
- **Share images and all-rights-reserved photos**: the My SPOODEX PNG can only include photos whose host sends CORS (CC-licensed ones on
  iNat's open-data bucket). Your photos, and most experienced users', are all rights reserved, so their *downloaded* PNG shows name plates
  and the modal says to screenshot the card instead (§11). New iNat accounts default to CC BY-NC, so beginners get every photo. Full photos
  for everyone needs the image proxy listed under "Before posting publicly".

**Awaiting the owner's decision (v1.14)**:
- **Highlanders threshold**: `HIGHLAND_M = 700` m is a proposal (about the height of the Atherton Tablelands; with it 6 of the owner's
  54 genera qualify). Confirm or pick another height; it's one constant in the sets section. No quest for it yet.

**Awaiting the owner's decision (v1.17, map & scanner)**:
- **Rarity tiers** (`RARITY`, v1.18): colours and order are the owner's (red rarest, blue, yellow, green, white commonest); the names
  (Exceptional, Rare, Scarce, Uncommon, Common) and cut-offs (10 / 25 / 45 / 70%) are proposals. Prestige numbers grew with the move from
  three stars to five tiers (the owner's own prestige went from the hundreds to ~1,600).
- **Weather extras** (v1.18): +0.05 when a good window is warm (≥ 24 °C) and humid (≥ 70% relative humidity); 50 mm or more of rain in
  the 48 h before cancels the rain bonus and takes 0.1 off instead (`WX.flood`).
- **Frontier thresholds** (`FRONT.life` 100, `FRONT.salt` 2): first guesses.
- **Rebound and stars** (`WX.rebound`, `WX.stars`): see §5 "spooding weather". In a dry week in Cairns every day rates ★4; a 20 °C
  sunny day rates ★1 (warmth ramps from 18 °C), so winter on the Tablelands will look harsh until the warmth ramp is tuned.
- Obscured iNat records sit up to ~20 km from where they were found, so a 5 or 10 km scan can miss or include one (not mentioned
  in the UI, by the owner's no-disclaimer rule).
- Ideas noted during the build, for later: [IDEAS.md](IDEAS.md).

**Awaiting the owner's decision (v1.15, spooding weather)**:
- **Spooding weather thresholds** (all in the `WX` constant, first guesses): warmth 0 at 18 °C → 1 at 24 °C, flat to 32 °C, 0.8 at
  35 °C, 0 at 40 °C; sun = shortwave 100 → 500 W/m², or 0.7 × clear sky, whichever is higher; dry = rain chance 20 → 70% and
  0.1 → 1 mm/h; calm = wind 15 → 35 km/h; a dull hour keeps 40% and a windy hour 50% of its score; a good hour scores ≥ 0.6; windows
  rank by mean score + 0.03 per hour (up to 4 h). Sky words: < 30% cloud "sunny", < 70% "partly cloudy", else "cloudy" or "hazy sun".
  With these, a typical October week in Cairns gives 9 am–5 pm windows almost every day (mornings < 18 °C and showery afternoons drop out).
- **Trip weather**: trips have a month, not a date, so the Trip planner has no weather. Would need a trip date (and the forecast only
  reaches 7 days, so it would only help for imminent trips).
- **App icons**: `icon-192.png`/`icon-512.png` are placeholders for the owner's sticker art.

**Awaiting the owner's decision (v1.16, crew games)**:
- **`EV_POINTS`** (starting values): per distinct inked genus 3 · +2 per ★ (scope: the place, else the link's state) · +5 new to your
  collection · +3 if no player had it before the event · +2 for an inked ♂ and ♀ of the genus · bioblitz targets ×2 · bingo line 10,
  blackout +50, first line of the event +5. Also: uploads count until `d2` + 2 days (`EV_LATE_UPLOAD`), standings final at `d2` + 7
  (`EV_FINAL_DAYS`), events ≤ 92 days, open bioblitz = top 25 observers, duel 1–3 calendar days.
- **Bingo pool mix**: 11 fixed challenge squares + 19 genera (10 ★, 7 ★★, 2 ★★★, `BINGO_TIERS`), drawn from the 2×+2 most-recorded
  candidates of each tier and preferring ones in season during the window (peak months from `peakInfo`; "too few records" counts as
  in season). Not added yet: a Highlanders square (a record above `HIGHLAND_M`, using the v1.14 elevations, now on main), and turf on the 3D map (columns by owner); both are possible now.
- **Rules I had to bend** (please confirm or change):
  1. *"Otherwise the state"* for rarity: so every viewer scores the same, the creator's state id travels in the link as `sc` when no
     place is set. It's a place id at state level, derived from the creator's region rather than typed in.
  2. *Duel "24–72 hours"*: iNat dates are calendar days, so a duel is 1–3 calendar days.
  3. *Ticking bingo's behaviour square* also requires the record to be inked at genus, like the annotation squares, so a pencilled
     record can't tick anything.
  4. *Turf colours*: hashed into a 6-colour palette, then probed so two players in one event never share a colour (a pure hash can collide).
  5. *Dare deadlines* are days (a dare runs from the day it's made to the deadline, inclusive); a dare is won as soon as an outside
     ID inks it, and judged missed only once final.
- Bingo cards for open events aren't supported (bingo, turf, duels and dares need a roster).

**Awaiting the owner's decision (v1.20, photo licences in older views)**:
- The v1.20 rule (other people's photos only under CC0/CC BY/CC BY-NC, credited) is applied to everything new: the landing page, Three
  to find, mystery spoods (your own photos), the share image (your own), and event best finds, thumbnails and the result card. Older
  views still show iNat's taxon photo (`S.info[id].p`, with its attribution where there's room) whatever its licence: blurred
  silhouettes on unknown dex cards and species cards, the genus page hero for a genus you haven't got, wanted posters (credited), and
  species thumbnails. Of Australia's 80 genera, 49 taxon photos are not CC0/CC BY/CC BY-NC (28 other CC licences, 21 all rights
  reserved or none). Retrofitting is one helper (`taxonPhoto`, which also swaps in your photo where you have one) but those 49 would
  lose their silhouette or poster photo unless you have one. Your call.

**Awaiting the owner's decision (v1.20, public spood hunt)**:
- **Post text** (`evPostText`), for Reddit and the iNat forum (the first line doubles as a Reddit title):
  > Spood hunt · Oct 2026: a jumping spider hunt on iNaturalist, 1 Oct – 31 Oct 2026
  >
  > Photograph jumping spiders (Salticidae) anywhere in the world between 1 Oct and 31 Oct, and upload them to iNaturalist by 2 Nov.
  > Each genus scores once someone outside the hunt agrees with its genus ID, rarer genera score more, and the 25 most active observers make the leaderboard.
  >
  > Leaderboard and rules: <event link>
- **Open-event caps**: 25 players (unchanged), a refresh every 2 hours, 20 pages (4,000 records) per refresh. Raise the page cap if a
  worldwide hunt ever reaches it (the board says so when it does).
- A worldwide hunt scores rarity against the world's records, so a genus common in Australia but rare worldwide earns more than in
  an Australian hunt. Pick a place if you'd rather keep it regional.

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
| v2.3 | Simplify (shipped 2026-10-11, tag `v2.3.0`; prompt `spoodex-prompt-5-simplify.md`): one headline count everywhere (`headline()`, which fixed the reveal's "54 of the 80"), three sections (Collection, Go spooding with Quests, Mates) with a view row instead of ten tabs, quest and poster XP rewards removed (mastery XP kept, renamed mastery points), first-record places shown as the square's name, tier subtitles removed, no coordinates finer than 0.25° on screen (`cellLabel` names squares) |
| v2.2 | Uncluttered (owner, 2026-10-08): the This week tab (Spood Report) and field mode (field compass, header 🧭 button) removed; 10 tabs; boot drops the old `report` cache |
| v2.0 | The Naturalist Update (shipped 2026-10-07, tag `v2.0.0`, on top of v1.20): merged onto v1.20 by the spood-frenzy session (one conflict, `PERSISTED` = both `notes` and `lore`); `extFetch` now drops ALA requests queued before the switch went off; Australia's checklist `TAXA_AU` (iNat ∪ the Lucid key, 91 genera, `tools/taxa.py`), "known from Australia" in the dex, 🏛 Never on iNat museum plates and tree branch, owner's Taxonomy review; museum history from the Atlas of Living Australia (described by, holotype, first collected) on the genus page and species rows; naturalist ranks for every species and genus in your country and state, inked or pencilled, with honours (First on record, Founding trio, Vanguard, Founding Naturalist), a ceremony, a share card and a dispatch, and a cabinet on Profile; museum ghosts in the scanner, cold-case posters and the Bring It Into the Light quest; crew hype with a ceremony and a link to congratulate on iNat; an empty field-story renderer; weather stars weigh the window's length |
| v1.20 | Spood frenzy (shipped 2026-10-07, tag `v1.20.0`): a landing page with real jumping spiders (the owner's photos first, licence-checked others) and three starts; a photo reveal instead of the boot log; iNat common names and one Wikipedia line per genus; the photo checklist, mystery spoods (was Needs ID) and a celebration when one is identified; a beginner-first Profile (Your spoods, Three to find next, tiny stats hidden); tabs that open with level and a one-line phone header; a My SPOODEX share image (portrait/square); the monthly spood hunt (open worldwide events, post text, best-find photos, refresh/page caps); guests are asked where they look before the map. Second test pass (2026-10-06, all five test personas, 375 and 1280 px): guests land on Profile after their first base; the reveal hides the landing strip, shrinks long genus names and gives common names three lines; mystery spoods join "Your spoods" and the reveal links to them; the share image wraps common names and shrinks long genus names; landing credits wrap; open-hunt form says "the world"; a saved `queued` flag no longer freezes an event after a reload. Then (2026-10-07, owner's requests): his best photo per genus picked by eye from all his records (`OWNER_PICKS`, used everywhere a genus needs a picture, including the landing page and for other players); titles are an empowering adjective and a genus ("Masterful *Mopsus*"), rarer genera at higher levels; a click-and-type genus lines editor that saves as you type and copies the `GENUS_NOTES` block. Profile tidy (2026-10-08, v2.0.1): top section and trophy cabinet only, the ledgers behind "Your numbers" tiles that open sheets. Lineage tree as museum drawers (v2.1): subfamily banners, tribe drawers with progress rings and genus tiles, Next to light, a Did you know? strip (data facts and the owner's `GENUS_FACTS`, written in the editor), CC-licensed photos for genera without one, curated plates and photos for never-on-iNat genera, and the ALA synonym fix (*Hypoblemum*) |
| v1.19 | Map streamlined into the side panel: tap the map to scan (no popup), coloured missing-genus squares removed, weather panel is weather only, "Needs ID in this square" removed; the 3D map falls back to 2D instead of going blank when WebGL fails; singular labels ("1 record", "1 genus") |
| v1.18 | One rarity language: five colour tiers (red, blue, yellow, green, white) replace ★1–3 everywhere, including prestige, events and share cards; scan exactly a grid square; Frontier layer (iNat map grid); recent-scan chips; 2D map with the same layers and switches as 3D; scan list by most records with both ends shown; "Needs ID in this square" opens the Bounty board for a scan; weather adds humidity and a flood penalty, fetches 16 days; trips can have dates, with the trip's weather when the forecast reaches them |
| v1.17 | Map & scanner redesign: weather cards per day with stars, hour stripes and rebound days (rain, wind, cool spell; `past_days=2`); missing-genus squares outlined by six rarity tiers instead of pillars, filled when in season; Missing genera / Fog of war / Your squares switches; click popup with size (5–100 km each way) and window (all time, 90/60/30 days, this month any year); every "within N km" search and outline is now a square (bounding box); new scan panel with genera/species tabs, new-to-you first and rarest first; home base folded into the panel |
| v1.16 | Crew games: event links (`?ev=`) scored from public iNat records with inked/pencilled IDs; 🏕 Bioblitz (roster or open, targets), 🎲 Spood Bingo, 🗺 Turf War, ⚔️ Duels, 🎯 Dares; 🏆 monthly Crew Cup; lead changes, count-ups, podium and result card, trophy cabinet, rematch / dare back; `events` storage |
| v1.15 | Field mode: 🌤 Spooding weather panel on the Map tab (Open-Meteo, `wx` cache), 🧭 field compass (header button: your square, what's around, needle to recent records of missing genera; live position in memory only), offline and installable (`sw.js`, `manifest.webmanifest`, placeholder icons; "Offline" instead of `api()` back-off; install button / iOS steps in Settings) |
| v1.14 | 3D Map tab (MapLibre 5.24.0 + AWS terrain tiles): missing-genus pillars, dotted outlines for your squares, ⌂ home button, fog of war over unrecorded squares, 2D/3D toggle (Leaflet kept as 2D); record elevations (`elev`), genus page Altitude line, ⛰ Highlanders set (threshold awaiting owner); `HAUNT_KEEP` 80 → 120 |
| v1.13 | 🔑 Identification aid button (Needs ID view, Bounty board) opens the owner's genus key in one reused popup window |
| v1.12 | Removed ~50 filler captions, disclaimers and quips across the app |
| v1.11 | GoatCounter analytics (hand-rolled beacon, no usernames); Spood Report leads with picks of the week |
| v1.10 | Sets: Local specialties, Ghost list, Every species in a genus, Couples, Wanderers, Celebrities; Needs ID "open these on iNaturalist" links (follow the filter); weekly ladder table fits phones; guest wording on Needs ID; this handover rewrite |
