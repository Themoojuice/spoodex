# SPOODEX — handover

**As of 2026-10-06 · v1.19 · live at https://themoojuice.github.io/spoodex/?u=themoojuice**

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
     dates, taxon ids and iNat **place ids** (owner-approved, v1.16), never coordinates (§9). Field mode's live position
     stays in memory for the session (§9).
  6. After every edit, syntax-check (§10). Before shipping, run the smoke test (§10).
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
| `spoodex.html` | **The entire app**: HTML + CSS + JS (~3,700 lines). Script sections are marked `/* ---------------- <name>` |
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
- **GoatCounter**: anonymous counts (§5 "analytics").

## 4. What the app does, tab by tab

**Landing** (`#onboard`, shown to anyone with no saved user): the pitch line, a strip of 12 real jumping spiders (photo, genus, iNat
common name, credit; each links to its iNat record), then three starts in this order: **🧭 See what jumping spiders live near you**
(guest mode, no account), **Already on iNaturalist? Enter your username**, **👀 Peek at a full collection** (`SAMPLE_LOGIN`). On phones
the strip scrolls sideways under the pitch so the first start is on the first screen.

**Tabs open up with the collection** (v1.20, `TABS[].at`, levels in §12): a new player sees Profile, SPOODEX, Map & scanner, Crew and
Quests; This week at 3 genera, Trip planner and Compare at 5, Bounty board and Ladder at 10, Lineage tree at 15. A tab also opens for
good when a link or button takes you there (a `?vs=` or event link, "Bounty board →"); ⚙ "Show every tab and module" (`peek`) shows
all. Newly opened tabs toast "New tab unlocked: …" and carry a ● until visited. On phones the header is one line (tier name, "Lv N",
icon-only 🧭 ⟳ 🔗 ⚙ with `aria-label`s) above one sideways row of tabs: 78 px of an 812 px screen.

| Tab (key) | What the user sees |
|---|---|
| **Profile** (`profile`) | Beginner first (v1.20): the level, generated title and "N / M genera on iNat in <scope>" with 📤 My SPOODEX image, 🪪 Title card and 🎁 Wrapped; **Your spoods** (one photo per genus, newest first, sideways scroller, each opens its card); **Three to find next**; "Since your last visit" (after 3+ h away); the photo checklist once for anyone under 15 genera. Then the ledgers: stats, chassis/tier progress and streak, regions, favourite lineages, field style, rarest finds, share of the record, pioneer badges, trophies, new genera per year. **Zero or tiny numbers stay hidden until they mean something**: each stat row is left out while it's 0; behaviour lists only the non-zero kinds; the streak shows when it's running or the best is ≥ 2; field style, favourite lineages (top lineage ≥ 2 genera) and "new genera per year" (≥ 2 years) appear when there's something to show; share of the record only from 1%, and pioneer badges only once you have one (the panel appears with the first badge). Guests and anyone with 0 genera get Three to find (or "Set a home base") first, then the upload loop |
| **SPOODEX** (`dex`) | Four views (`S.prefs.layer`): **Genera** (cards, scope country/state/world, filters) · **Species** (side collection) · **Sets** (themed sets, sets computed from records, complete-the-lineage, every-species-in-a-genus) · **❓ Mystery spoods** (v1.20; was 🔎 Needs ID, key still `needsid`): one tile per record stuck above genus with its photo, current ID, photo count (red under 3), **Ask for an ID ↗** (the record) and **Add photos ↗** (its iNat edit page); the photo checklist (open for anyone under 15 genera), filter chips, "open these on iNaturalist" and 🔑 Identification aid |
| **Lineage tree** (`tree`, from 15 genera) | iNat classification tree, lit where you have genera |
| **Map & scanner** (`map`) | Redesigned in v1.17, streamlined in v1.19 (owner: key info in one place, the side panel, nothing repeated). **Spooding weather** on top, full width: where it's for ("near Cairns – Barron (your home base)"), one card per day for today + 6 with its best window, 1–5 stars, a stripe of the day hour by hour (window outlined, past hours hatched), temperature, sky, rain chance and any rebound reason ("🌧 after 11 mm of rain"), then a best-bet line; 🧭 Field compass button. Phones: one row per day. **3D map** (default with WebGL2; 2D if WebGL won't start): your squares dotted green, the home area and the scan area as dashed squares, fog of war, ⌂ home. Under Terrain / Satellite: switches for **Fog of war**, **Your squares** and **Frontier** (remembered). **Tap anywhere** to scan around that point at the panel's area and window; no popup and no coloured missing-genus squares (both removed in v1.19: the squares didn't line up with the scan outlines under 3D terrain, and the popup repeated the panel). Phones get a badge on the map ("14 genera here · 2 new to you ↓") that jumps to the panel. **2D** toggle: the Leaflet map with the same layers and tap. **Scan panel** (right; below the map on phones): recent-scan chips, the place, your records in the pin's grid square, frontier counts (with that layer on), Make this my home base, area and window chips, counts (genera, new to you, species, new species), Genera / Species tabs, new-to-you rows by most records (both ends shown when long) with tier, 🔥 last 30 days, records and season, then "already yours"; home base controls folded into its footer |
| **🧭 Field** (header button, not a tab) | Full-screen **field compass** for phones: your 25 km square and whether you've recorded there, a needle to the nearest square with a record from the last 90 days of a genus you're missing (tap to cycle), and a 25 km scan of what's around you |
| **This week** (`report`) | The Spood Report: masthead, then **picks of the week (photos first, at the owner's request)**, then headlines, weekly mini-ladder and genera recorded |
| **Bounty board** (`wanted`) | Two views (`S.prefs.wantedView`): **🔎 Bounties** (default: Needs ID records within 50 km, for genera you're missing and for "unnamed spoods", with a helper tally, ranks and 🔑 Identification aid) · **🗞 Wanted posters** (this month's forecast of missing genera, posters, year calendar, case files with a map) |
| **Trip planner** (`trip`) | Search any destination → its wanted list for a chosen month, "what this trip could add", map + list of record squares, posters, calendar, case files |
| **Compare** (`compare`) | You vs one rival, built to provoke envy |
| **Ladder** (`ladder`) | Top observers of your state/country re-ranked by genera recorded there |
| **Crew** (`crew`) | **Events** first (v1.16): active event cards (name, mode, your rank, time left), ＋ New event, finished events; the automatic monthly **🏆 Crew Cup**. Then the crew: you + ≤5 friends, genus matrix and a feed (which also carries event news). An open event replaces the tab's content, with "← All events" |
| **Quests** (`quests`) | Generated from real gaps; fixed-height tiles (`.questgrid`) |

## 5. Code map (`spoodex.html` script, by section marker)

Search for `/* ---------------- <name>` to jump. Line numbers drift; names don't.

| Section | Key functions | Notes |
|---|---|---|
| constants | `SALTICIDAE=48139`, `API`, `API2`, `ANN`, `BEH_RX`, `TIERS`, `CRITERIA`, `MASTERY_AT=7` | |
| utils | `$`, `esc`, `photoSize(url,size)`, `cellKey`, `cellLabel`, `store` | `store` = IndexedDB behind a synchronous in-memory cache (§6) |
| api | `api(path, params, base = API)` | Global throttle ≈1 request / 1.1 s (iNat asks ~1/s, ≤10k/day). On 429/5xx **or a network error** it pushes back the whole queue (iNat's 429s carry no CORS header, so they reach the browser as network errors). Pass `API2` for v2. **All iNat calls go through `api()`**. When `navigator.onLine` is false (checked before each attempt and after a failed fetch) it throws `Offline` at once instead of backing off, so Sync, scans, Compare, Ladder etc. say "Offline" |
| state | `S`, `ukey`, `saveUser`, `saveShared`, `savePrefs`, `addNode` | |
| sync | `trimObs`, `OBS_FIELDS`/`TAXON_FIELDS`, `importRecords(login, save, {full,log})`, `sync`, `loadRefs`, `placesNear(lat,lng)`, `resolveBasePlaces`, `setBase`, `geolocate`, `ensureRef(scope)` → `ensureRefPlace(pid)`, `ensureInfo(ids)`, `fetchPlaces` | Import uses **v2** `/observations` + `fields=OBS_FIELDS`: ~29 KB gzipped per 200 records vs ~470 KB on v1, verified byte-identical after `trimObs` (1,538/1,538). Incremental via `updated_since`; full resync every 14 days |
| model | `buildModel(obsMap, base)` → `M`; `genusOf`, `speciesOf`, `genusOfNode`, `lineage`, `lineageText`, `pointFor` | Pure derivation, no network |
| scope helpers | `scopeGenera`, `taxonomicOrder`, `refFor`, `refCount`, `rarityTier`, `starsFor`, `prestige`, `moduleOn` | `kind` is `'g'` or `'s'` |
| field style & titles | `fieldStyle`, `favouriteLineages`, `generatedTitle` | |
| quests | `buildQuests(M)`, `questDone(q,M)` | Derived fresh each time; completion detected on sync by diffing the pre-sync list. Kinds: `hunt` (any target genus found), `lineage`, `resolve`, `master`, `beh`, `month`, `explore`, `first`, `scan`, `base`, `info`. Includes "Complete the Set" (`nearestSet`) |
| views | `TABS` (`at` = genera to open the tab), `tabEarned`, `tabOn`, `tabNews`, `render`, `softRender`, `viewProfile` (`nextKey`/`nextAt`: Three to find reloads when the home square, region or month changes, or after 6 h), `cardHtml`, `viewDex`, `viewTree`, `viewQuests` | `render()` swaps `#view` innerHTML and triggers lazy loads per tab (map: `initMap()` then `loadWx()`). `softRender()` debounces 400 ms and skips the map tab |
| scan areas & rarity | `boxOf(c, km)` (`km` = 'sq' for the grid square itself), `boxQ`, `boxRing`, `boxBounds`, `cellBox`; `RARITY`, `tierIn(table, id)`, `tierOf(id, kind, scope)`, `rarityOf(id, kind, pid)`, `rarityTier`, `starsIn`, `starsAt`, `rarityIdx`, `rarityChip` | **Every "within N km" search is a square** (v1.17): iNat's bounding box (`swlat/swlng/nelat/nelng`) reaching N km north, south, east and west, so every outline drawn is exactly the area searched. Used by map scans, the home scan (`fetchScan`, ±25 km), active now, haunts (±150 km), trips (±50 km), bounties (±50 km) and "since your last visit" (±25 km). Only `placesNear` still uses a radius, and it's never drawn. **One rarity language** (v1.18, owner's choice): five colour tiers by a taxon's rank among all genera (or species) recorded in the scope, rarest first: red Exceptional ≤ 10% (or not recorded there at all), blue Rare ≤ 25%, yellow Scarce ≤ 45%, green Uncommon ≤ 70%, white Common. `lv` 5…1 is the numeric weight: prestige = Σ genera 10×lv + Σ species 3×lv, event points +2 per tier above Common, bingo draws by tier, sorting. Shown as `rarityChip` everywhere (cards, genus page, Compare, Crew, This week, Wrapped, map, scanner) and as a coloured label on share cards |
| map & scanner | `baseWidget`, `SCAN_KM` ('sq', 5, 10, 25, 50, 100), `SCAN_PER`, `SCAN_HIST`, `SCAN_ENDS`, `scanKm`/`kmVal`/`kmChip`, `scanPer`, `runScan(lat, lng, km, per)`, `scanBadge`, `paintScan`, `scanPanelHtml`, `scanInfo`, `MAP_LAYERS`, `layerOn`, `layerSwitchEl`, `applyLayers`, `mapLegendHtml`, `viewMapShell`, `drawScanArea`, `initMap` (2D), `afterMapInit`, `fetchScan(k, into)` | A tap on either map calls `runScan` directly. It rounds the point to 0.01°, remembers area and window in `S.prefs.scanKm`/`scanPer`, and makes one `taxonomy` call for the chosen window (`d1`, or `month=` for "this month, any year") plus one for the last 30 days (skipped for a 30-day window), then names the spot with `placesNear` the first time per 0.1° cell this session. `scanSeq`: when a newer tap starts another scan, the older one's results are dropped. Area 'sq' scans exactly the 0.25° grid square the pin is in. The result is `S.u.mscan` and joins `S.u.scanHist` (last 5, shown as chips named by place, or by coordinates when two would read the same; a chip under 6 h old reopens without a call). The panel lists new-to-you by most records first; past 9 it shows the 4 most recorded and the 4 fewest, with the middle folded. `scanInfo` adds your records and the frontier counts for the pin's grid square, and "Make this my home base" (`data-act=pinHome`). **2D** (Leaflet) has the same layers in `map2d` {fog, front, mine, home} and the same switches (`layerSwitchEl` inside an `L.Control`); `applyLayers` re-adds them in a fixed order |
| frontier (v1.18) | `FRONT`, `S.frontier`, `tileXY`, `frontierCounts`, `isFrontier`, `viewBounds`, `loadFrontier`, `frontierSoon`, `drawFrontier` | Squares where people record plenty of other life but hardly any jumping spiders: ≥ 100 iNat records of anything and ≤ 2 salticid records. From iNat's map grid (`/v1/grid/7/x/y.grid.json`: 64 × 64 cells per tile with a `cellCount` each), summed into 0.25° squares by each cell's location; two calls per z7 tile (salticids, all life), only for tiles in view while the Frontier switch is on (off by default), up to 6 per move, cached 30 days, newest 60 tiles kept. The counts are approximate (checked 2026-10-06: about ±40% against bounding-box counts, because cells straddle square edges), which is fine for "few versus many" |
| 3D map | `MAPLIBRE`, `TERRAIN_TILES`, `TERRAIN_ATTR`, `hasGL2`, `use3d`, `loadMapLibre`, `initMap3d`, `dropMap3d`, `paintMap3d`, `paintHome`, `applyLayers`, `gridEdges`, `mixHex`, `cssVar` | `initMap()` branches to `initMap3d()` when `use3d()` (WebGL2, `S.prefs.map3d !== false`, MapLibre loaded, and 3D hasn't failed this session); otherwise the Leaflet code runs. `render()` calls `dropMap3d()` whenever the tab isn't `map` (WebGL contexts are capped, so the map is torn down, not hidden). **If the MapLibre constructor throws (the browser refuses a WebGL context) or the context is lost, `to2d` sets `mlFailed` and re-renders with the 2D map** (v1.19; before, the map went blank, as the owner saw after leaving and re-opening the tab). Layers bottom→top: Esri topo/imagery, fog `fill` (world polygon with a hole per `M.cells25` square; holes wind opposite to the outer ring), `fogNew` (squares cleared since `S.u.fog`, faded once via feature-state `f`), hillshade, frontier fill + line, `lit` (your squares, dotted), `home` (±25 km home square, hidden while the scan on show is the home area itself), `scan` + halo (the scan square, dashed accent). Zoom expressions must be top-level in MapLibre styles (a bad one fails the whole style silently, so the map logs `error` events). Layer switches (`MAP_LAYERS`) set `S.prefs.mapLayers` and `applyLayers()` (which also redraws the legend). Phones get a lighter map (shared terrain source, pixel ratio ≤ 1.5, terrain ≤ z12, opening zoom 8) |
| elevation | `ELEV_Z`, `S.elev`, `fillElev`, `elevsOf`, `topElev`, `altitudeLine` | After each sync (`doSync`, `onboard`), in the background: for each non-obscured record without a cached height, fetch its z12 terrarium tile (each tile once, plain `fetch`, not iNat) and decode the pixel. `createImageBitmap(…, {colorSpaceConversion:'none', premultiplyAlpha:'none'})` matters: colour management would shift the encoded heights. Spot checks: Cairns Esplanade −1 m, Lake Eacham 769 m, Atherton 772 m, Bellenden Ker summit 1,553 m (true 1,593 m). Used by the genus page "Altitude" line (lowest–highest, rounded to 50 m) and the Highlanders set. Never per record, never on cards or in links |
| species layer | `speciesInScope`, `speciesCard`, `viewDexSpecies`, `leadsUrl`, `viewNeedsId`, `layerSwitch`, `speciesSection(gid)` | Mystery spoods (`viewNeedsId`) also live here |
| photo coaching (v1.20) | `PHOTO_TIPS`, `tipsHtml(open)`, `tipsOnce(dismiss)`, `mysteryCount` | The five-point photo checklist (§12): on Mystery spoods, in field mode (folded, both before and after Start), and once for anyone under 15 genera: at the end of the first reveal, or on Profile until **Got it** (`S.prefs.tipsDone`). "Mystery spoods" replaces "Unresolved leads"/"stuck above genus" on Profile, the dex footer, the quest and the layer chip |
| active now | `scanActive(k, force, into)` | ±25 km square, last 30 days |
| best months | `phenoKey(gid,pid)`, `ensurePheno(ids,pid)`, `peakInfo(gid,pid,month)`, `phenoHtml`, `phenoTag`, `phenoChart(gid,pid,month)`, `phenoUpdated` | Month-of-year histograms for any place. `[data-pheno]`/`[data-phenochart]` placeholders update in place |
| mastery fix-it | `fixIt(g, criterionKey)` | Links to the exact records that could tick a box |
| genus page | `openGenus(id)` | Modal in `#modalRoot`. Under the name: iNat's common name (`cnHtml(id, 'cnbig')`) and one line about the animal (`wowLine`) with a Wikipedia ↗ link |
| common names & one line (v1.20) | `cnFrom`, `cnOf`, `cnHtml`, `GENUS_NOTES`, `WOW_SKIP`, `wowLine` | Common names come from `/v1/taxa` (`ensureInfo`, the landing call) into `S.nodes[id].c`; `ensureInfo` re-asks once for taxa cached before v1.20. Shown on dex cards (recorded genera; unknown ones only with "reveal names"), the genus page, scanner rows, wanted posters, both reveals, Three to find and the canvas tiles (title card, Wrapped, event card, My SPOODEX image). **`wowLine`**: the first sentence of the genus's Wikipedia summary (`S.info[id].s`, via iNat) that says more than "X is a genus of jumping spiders" and isn't taxonomic history (`WOW_SKIP`: who described it, synonyms, species counts, "as of 2017", "moved to"). Shown on the genus page and the new-genus reveal, not on grid cards (at card width only "X is a genus of…" fitted). `GENUS_NOTES` (genus id → a line the owner writes) replaces it, without the Wikipedia link |
| reveal ceremony | `celebrations(fresh, solved)`, `SOLVED_SHOWN` 3, `aGenus`, `revealQueue(items)` | After a sync, one full-screen photo per new genus and per **mystery spood identified**: `doSync` keeps the ids of records above genus before syncing and, after it, takes those that now have a genus (no extra call). "MYSTERY SPOOD IDENTIFIED · Your mystery spood is a Servaea! Card unlocked." (the last part only if the genus is new) with that record's photo; up to 3 for genera you already had, then "…and N more mystery spoods identified". Common name and the `wowLine` under the name |
| first reveal (v1.20) | `onboard`, `REVEAL_ALL` 20, `REVEAL_TOP` 12, `revealGenera`, `flipCard`, `revEndHtml` | Replaces the old boot log and name chips. While importing: one plain line ("Read 400 of 1,543 records") and a bar (`importRecords`' `log(text, fraction)`). Then each genus flips from a blurred silhouette to the naturalist's own cover photo with its name and common name, ~0.4 s apart; **Skip** flips the rest at once. Over 20 genera it reveals the 12 rarest (`rarestFirst`) and says how many more. Ends with the level, the generated title, "N of the M genera on iNat in <scope>", **Open your SPOODEX** (`data-act=openDex`) and Three to find next. Revealed cards open the genus page. `render()` does nothing while `#app` is hidden, so background `softRender`s can't switch the chassis colours under the landing page |
| three to find next (v1.20) | `OWNPH_TTL`, `NEXT_N`, `S.ownph`, `ownerPhotos(ids)`, `taxonPhoto(id)`, `nextThree`, `loadNextThree(redraw)`, `findCard`, `nextThreeHtml` | Three missing genera from `wantedList(homeCtx())`, recorded within 25 km of home first, then in season (`season` ≥ 0.4), then by the wanted score. Each card: photo, name, common name, where ("🔥 Recorded within 25 km of home in the last 30 days" / "📍 N records within 25 km of home" / "📚 N records in <region>") and when (peak months); a tap opens the case file. **Photos**: the owner's most-faved research-grade photo of the genus (`ownerPhotos`, one v2 call per ≤ 30 genera, cached 30 days in `ownph`; skipped when the viewer is the owner), else iNat's taxon photo only if `S.info[id].lc` is CC0/CC BY/CC BY-NC, else a "?" plate. Used by the reveal and Profile |
| compare | `viewCompare`, `lineageRows`, `loadCompare(login)` | Most recent rival cached as `cmp` |
| regional ladder | `loadLadder`, `ladderRows`, `viewLadder`, `myStanding`, `starsIn`, `idPrestige` | One `observers` call + one in-place `taxonomy` call per person; streams; 24 h cache |
| crew mode | `setCrew`, `loadCrew`, `crewMembers`, `viewCrew` (broken link / one event / events + `viewCrewMain`), `crewFeedHtml`, `crewUnseen` | One all-time `taxonomy` call (`captive=false`) each; 6 h refresh; feed = diff vs previous snapshot, plus event news entries `{kind:'ev', id, n, m, txt}` (they light the tab's ● too) |
| events (crew games) | Link: `evCheck`, `evParse`, `evEncode`, `evLink`, `evId`, `b64u`/`unb64u`, `hash32`, `rng` (mulberry32), `shuffle`. Fetch: `loadEvent(id, force)` (queued, one event at a time) → `evFetch`, `evTrim`. Score (pure): `evScore`, `starsAt`, `evResult`, `evBingo`/`bingoCard`/`sqTest`/`sqTicks`, `evTurf`, `evDare`, `evAfter`, `evPost`. Flow: `openEventCode`, `evStart`, `evRematch`, `evDareBack`, `bingoPool`, `cupEv`/`cupEnsure`/`loadCups`/`cupDue`. Views: `eventsHtml`, `evCardHtml`, `cupHtml`, `viewEvent`, `evBoardHtml`, `evBlitzHtml`, `evDuelHtml`, `evBingoHtml`, `evTurfHtml` + `mountEventMap`, `evDareHtml`, `evAnimate`, `evPodium`, `openEventCard`/`drawEventCard`, `trophies`/`trophyHtml`, `evDraftNew`/`evPreset`/`evFormHtml`/`evCreate` | **The link is the rulebook and iNaturalist is the referee**: `?ev=<base64url JSON>` (format in §9); every viewer fetches the same public records and scores them with the same pure functions, so there's no server. **Per refresh**: one v1 `taxonomy` for the whole roster in the window (names/ranks), then v2 `/observations` with `user_login=a,b,…` (comma list works, §7), `d1`/`d2`, `place_id`, `captive=false`, `fields=EV_FIELDS`, paged by `id_above`. **Once per player**: a `taxonomy` call with `d2` = the day before the event (their collection before it; kept for good, since it can't change once the event has started). Open bioblitz: one `observers` call per refresh finds the top 25 for the place and window. TTL 30 min (`EV_TTL`), ⟳ Refresh button, no refreshes once final. **What counts** (`evTrim`): observed in the window, uploaded (`created_at`) by `d2`+2 days, not captive, in the place. **Inked**: a current identification by someone who isn't a player, at or below the record's genus (`taxon.id` or its `ancestor_ids`; v2 identification ancestors exclude the taxon itself). Not reusing `community_taxon_id`: it's null when the only ID is the observer's (checked, §7), and a fellow player's agreeing ID would set it. Other records show **✏️ pencilled** points. A named species (dare) needs an outside ID at the species. **Final** at `d2` + 7 days (`EV_FINAL_DAYS`); before that "Provisional · final in N days". **Points** (`EV_POINTS`, §12): per distinct inked genus 3, +2 per ★ in the event's scope (`starsAt`, record-count tertiles like `rarityTier`, in the place if set, else the state carried in the link as `sc`), +5 new to the player's pre-event collection, +3 if no player had it, +2 for an inked ♂ and ♀, ×2 for bioblitz targets. Behaviour keywords score nothing except as bingo squares. **Bingo**: the creator's browser draws the pool (11 fixed challenge squares `SQ_FIXED` + 19 genera, 10 ★ / 7 ★★ / 2 ★★★, in season during the window by `peakInfo` where known) into the link; each card = 24 of them shuffled by `rng(hash32(seed + ':' + login))` + a free centre, so cards are identical on every device. Every square needs an inked record (genus at least); `q` ticks on the third distinct 25 km square of inked records. Line 10, blackout +50, first line of the event +5 (earliest completing record by observed date, upload date, id). **Turf**: each 0.25° square goes to the player with most inked genera there (ties: first to reach that count); obscured records don't claim squares; colours `turfColours` (hash into `TURF_COLS`, probing so a roster never shares one). **Payoffs** (`evAfter`, silent on the first read): lead changes (toast + event news + crew feed), turf takeovers/holdings, completed dares; changed scores count up once (`E.from` → `evAnimate`); the first read after the final date shows the podium (`#reveal` style) then the 1080×1350 result card (card kit). **Crew Cup**: a synthetic monthly event `cup:YYYY-MM` for you + the saved crew (no link), scored like a bioblitz; current and last month load when the Crew tab opens; last month's winner gets a 🏆 in the trophy cabinet (Profile) |
| share of the record | `recordShare`, `shareHtml`, `shareLine`, `inPlace`, `pctTxt` | No extra calls |
| pioneer badges | `pioneerTargets`, `drainPioneer`, `myPioneers`, `pioneerHtml` | Earliest verifiable record per (genus, place). ~180 calls for the owner, 30-day cache, drains while Profile is open |
| spood report | `loadReport`, `viewReport` | State, 7 days (`d1`), 6 h cache |
| most wanted | `homeCtx`, `wantedList(ctx)`, `sharpenWanted(ctx, redraw)`, `loadWanted`, `wView`, `wantedSwitch`, `viewWanted` → `viewBounty` / `viewWantedPosters`, `posterHtml`, `calendarHtml`, `ensureHaunts(gid,ctx)`, `hauntSummary`, `hauntsOf(ctx)`, `openCase(gid,ctx)`, `drawCaseMap`, `kmBetween`, `bearingDeg`, `compassPt`, `bearingTxt`, `agoTxt` | Everything takes a **ctx** `{kind, pid, centre, km, month, at, atLong, near, recent, stale, posters, mem}` so home, trips and field mode share one ranking. `mem` (field mode away from home only): haunts are read from and written to that in-memory object instead of `S.haunts`. Score = (1 + 1.5·log(1+nearby records) + 2 if recent) × log(10 + state records) × (0.25 + season this month) × reach, where reach = 1/(1+(km to nearest record square/100)²). Haunts: v2 `fields=id,observed_on,obscured,geojson`, 150 km radius, falls back to the region; obscured records skipped |
| trip planner | `S.trip {cur, recent}`, `tripCtx`, `setTrip`, `loadTrip`, `tripSpots`, `viewTrip`/`viewTripPlan`, `mountTripMap` | Countries, states and places with `bbox_area > 4` are planned as a whole region; anything else by what's within 50 km. Streamed updates only redraw `#tripPlan` (so the search box isn't wiped); the Leaflet element is moved between renders, not rebuilt. ≈55 calls for a fresh destination Optional dates (`t.d1`/`t.d2`, v1.18) set the month and, once inside the 16-day forecast, show the destination's weather cards (`tripWxHtml`). |
| sets | `THEMES`, `taxonByName`, `themeMembers`, `themeIds`, `themeGot`, `bothSexes`, `squaresOf`, `lineageSets`, `genusSpeciesSets`, `setStats(ref)`, `nearestSet(ref)`, `loadSetRefs`, `viewSets` | See §8 |
| bounty board | `bountyWhere`, `loadBounties`, `trimBounty`, `viewBounty`, `bountyRank`, `BOUNTY_RANKS` | Two v2 queries within 50 km of home (or the state): Needs ID ranked family→subtribe (`hrank`/`lrank`), and Needs ID records of genera you're missing in your state. Own records dropped client-side. "Helped" = bounty records where you have an identification, accumulated in `S.u.bounty.helped`. 1 h cache |
| since your last visit | `markVisit`, `loadNews`, `newsHtml`, `sinceTxt` | A new visit starts after 3 h away. After each sync: `taxonomy` with `created_d1=<previous visit, full ISO datetime>` within 25 km and for the state, plus a `per_page=0` count of new unnamed spoods. Dismissible until the next visit |
| spooding weather | `WX` (every threshold, §12), `WX_URL`, `WX_TTL`, `S.wx`, `wxFetch`, `loadWx(force)`, `wxWarm`, `wxScore`, `wxDays`, `wxPanelHtml`/`paintWx`/`wxInner`, `wxGeneraHtml`, `wxSpan`, `wxStars` | Open-Meteo, not iNat, so its own tiny queue (`wxFetch`), not `api()`. `past_days=2` and `forecast_days=16` with `relative_humidity_2m` (cache entries carry `v:3`; older ones refetch) for the rebound rules and dated trips. Each hour scores warmth × dry × (0.4 + 0.6·sun) × (0.5 + 0.5·calm). `wxDays`: for today + 6, the day's window = the run of daylight hours from now on around its best hour that stay ≥ `WX.win` (85%) of it; mean score + **rebound bonus** (only for a window ≥ 0.6): +0.12 after ≥ 3 mm of rain in the 48 h before, +0.06 after wind ≥ 30 km/h in the 24 h before, +0.06 for the first ≥ 24 °C window after a day that topped out under 22 °C, +0.05 for a warm (≥ 24 °C), humid (≥ 70%) window, capped at +0.2; ≥ 50 mm of rain in the 48 h before replaces the rain bonus with −0.1 ("🌊 too wet"); stars from `WX.stars` (★5 needs ≥ 1.03, i.e. a near-perfect window plus a rebound; an ordinary perfect day is ★4). Best bet = most stars, then score, then length. `wxCardsHtml(f, days)` draws the cards for home and for dated trips. On failure the panel says so in one line and keeps a cached forecast. Weather only since v1.19 (its missing-genera list repeated the scan panel) |
| field compass | `FIELD`, `F` (session state), `fieldCtx`, `fieldScan`, `fieldTargets`, `fieldScanNow`, `fieldHaunts`, `onPos`/`onPosErr`, `onOrient`, `listenOrient`, `wakeOn`/`wakeOff`, `fieldStart`/`fieldStop`, `openField`/`closeField`, `paintField`, `fieldDial`, `spinField`, `turnTo`, `setHtml`, `agoShort` | Overlay in `#fieldRoot` (z 900: above the header, below modals, so genus pages open on top). **Start** (one tap) asks for motion access on iOS (`DeviceOrientationEvent.requestPermission()`, must run inside the tap), starts `watchPosition` (high accuracy) and a screen wake lock (released on close and when the page is hidden, re-taken when visible). Heading: iOS `webkitCompassHeading`; Android `deviceorientationabsolute` → 360 − alpha; both plus `screen.orientation.angle`. It listens for orientation events even if permission is refused: readings that arrive win; otherwise the dial stays north-up with text bearings (N, NE…). **Scan**: key `pt:<lat 0.1°>,<lng 0.1°>`, only when you enter a new 0.1° cell and at most every 10 min (`FIELD.scanGap`); results in `F.scans`/`F.active` (memory). Offline or between scans it shows the nearest cached scan within 15 km (this session's, or a saved map scan) and says it's cached data. **Needle**: squares holding a record from the last 90 days of a genus on `wantedList(fieldCtx())`, from haunts (non-`wide` only), nearest first; distance via `kmTxt`, bearing via `compassPt`. Within 75 km of home `fieldCtx()` = `homeCtx()` (persisted haunts, shared with the posters); further away it is a 0.5° centre with `mem:F.haunts`. `fieldHaunts()` fills haunts for the top 8 (`FIELD.haunts`) through `ensureHaunts`. Entering a square with none of your records toasts once per square per session. The DOM is built once per start; `setHtml` only rewrites parts whose HTML changed, and `spinField` rotates the rose/needle in a rAF along the shortest way round |
| offline & install | `installEvt`, `standalone`, `isIOS`, `installHtml`, `installApp`, `netState`, `registerSW` | `boot()` registers `./sw.js` and calls `netState()` (header **Offline** chip). `online` retries a failed field scan/haunts and the weather. `beforeinstallprompt` is stashed and shown as "📲 Install SPOODEX" in Settings (Android/desktop Chromium); iOS gets the Add to Home Screen steps instead; nothing once installed. Installed (standalone) apps ask for `navigator.storage.persist()` so saves survive low-storage eviction |
| `sw.js` (own file) | `VERSION`, caches `spoodex-shell-<v>`, `spoodex-libs-<v>`, `spoodex-tiles`, `spoodex-photos` | **Shell** (`spoodex.html`, `index.html`, manifest, icons; precached on install): network-first, cache fallback after 5 s or on failure; keyed by path, so `?u=` never lands in the cache. **CDN** (cdnjs incl. Leaflet/MapLibre, Google Fonts CSS and font files): cache-first, versioned. **Tiles** (Esri `/tile/`, AWS `elevation-tiles-prod`): cache-first as viewed, cap 600. **Photos** (`static.inaturalist.org`, `inaturalist-open-data.s3.amazonaws.com`): cache-first as viewed, cap 400. Caps are checked every 20 additions, oldest out (cache keys are in insertion order). For `<img>`/`<link>` (no-cors) requests it fetches a CORS copy with `cache:'no-cache'` where the host allows it (an earlier plain image load can sit in the HTTP cache without CORS headers), because browsers pad opaque responses heavily in storage quota; `static.inaturalist.org` has no CORS, so those are stored opaque. An opaque copy only answers no-cors requests (the card canvas still gets CORS). **Never touches the iNat API, Open-Meteo or GoatCounter.** `skipWaiting` + `clients.claim`; activate deletes only old `spoodex-*` caches (the Identification aid's worker on the same origin uses `salticidae-core:*` caches and scope `/Identification-aid/`, checked 2026-10-04; a worker only sees fetches from pages it controls, so the two can't intercept each other) |
| analytics | `GOATCOUNTER`, `track(path, event=true)` | Anonymous counts on https://themoojuice.goatcounter.com (owner's dashboard). **Deliberately not GoatCounter's `count.js`**: it always sends `location.search`, which holds `?u=`/`?vs=`/`?crew=` usernames. `track` sends only `p` (path or event name), `t`, `s` (screen width), `r` (referrer with query stripped, page views only), `e`, `rnd`, via `sendBeacon` or an image. Skips localhost/`.test`/`file:`. Page view in `boot()`; events: `new-spoodex` (first import), `guest-mode`, `trip-planned`, `compare`, `card-download`, `card-share`. Settings says so. **Never add usernames, places or coordinates to a tracked path** |
| cards | `cardKit`, `cardPhotos`, `mountCard`, `cardBlob`, `cardExport`, `rarestFirst` | 1080×1350 canvas kit; see §11 on photo CORS |
| title card / wrapped | `drawTitleCard`, `openTitleCard` / `wrappedData`, `wrappedExtras`, `openWrapped`, `showWrapped`, `drawWrappedCard` | |
| landing (v1.20) | `OWNER`, `LAND`, `LAND_PIN`, `LAND_TTL`, `OK_LIC`, `PH_FIELDS`, `byName`, `creditTxt`, `genusIn`, `loadLanding`, `paintLanding` | `LAND` = 12 hand-picked genus ids (§12). One v2 call for the owner's most-faved research-grade record of each (`order_by=votes`, `photos=true`), plus `LAND_PIN` (genus → one of his observation ids) if he pins any; then, only for genera he hasn't photographed, one v2 call each with `photo_license=cc0,cc-by,cc-by-nc` whose photo is used only if its `license_code` is one of those three; then `/v1/taxa/{ids}` for names and common names. Cached in store key `landing` for 14 days. Boot calls it unless `?u=`/`?ev=` is opening something |
| boot / flows | `loadUser`, `updateUrl`, `copyLink`, `doSync`, `onboard`, `enterApp`, `startGuest`, `toast`, `settings`, event handlers, `PERSISTED`, `boot()` | `boot()` awaits `store.init()`, re-reads `PERSISTED`, then opens a cached user (and syncs quietly) or onboards `?u=`. `?ev=` is kept in `S.pendingEv` and opened by `enterApp` (before `vs`/`crew`); someone with no saved user who opens an event link becomes a guest. `updateUrl()` writes `ev` while an event with a link is open on the Crew tab (instead of `crew`) |

**UI event wiring**: one delegated `click` listener on `document` dispatches on data attributes, checked in this order:
`data-genus` (genus modal) · `data-close` · `data-tab` · `data-filter` · `data-layer` · `data-scan` · `data-base` (`lat|lng|label`) ·
`data-trip` (`lat|lng|area|label`) · `data-act` with its argument in `data-v`. Current actions:
`bountyGo bountyRefresh card cardPng cardShare clearBase crewAdd crewDel crewRefresh evBack evCancel evCard evCopy evCreate
evDareBack evDarePick evDel evMode evNew evOpen evPlaceClear evPlacePick evPreset evRefresh evRematch field fieldClose fieldNext
fieldRescan fieldStart full geo guest install ladderRefresh leadFilter lscope lsort needsid newsDismiss peek reportRefresh sample
sets share switch tripCase tripClear tripRefresh tripRetry vs wanted wantedRetry wipe wrapped wrNext wrPrev wrYear wview wxRetry`. Clicking the Crew tab button closes any open event. Because `data-tab` is checked before `data-layer`, a link that must switch tab **and**
view needs its own `data-act` (see `sets`, `needsid`, `bountyGo`).
Forms: `data-form` = `compare | crew | evDare | evPlace | placeSearch | tripSearch` (delegated `submit`). Prefs: `data-pref` on `change`; the trip
month select uses `data-tripm`. The event form keeps its state in `S.evDraft`: `data-evf` fields update it on `input` without redrawing
(so focus stays), toggles redraw on `change`; target checkboxes use `data-evt`. **Exception**: controls inside the maps (layer and base switches) stop click propagation, so they get direct `onclick`s.

## 6. State and storage

`S` (global): `login`, `u` (per-user save), `nodes` (taxon id → `{n,r,l,p,c}`; `c` = iNat's English common name, '' if none, set only by
`/taxa` calls via `cnFrom` and kept by `addNode`), `places` (id → `{n,l}` admin level),
`info` (taxon id → `{p photo, s summary, w wiki, a attribution, lc photo licence code, c count}`), `ref` (`'p<place>'` or `'world'` →
`{ts, g:{genusId:count}, s:{speciesId:count}, t:familyTotal}`), `observers`, `pheno` (`'gid:place'` → `{ts, m:[12]}`),
`prefs`, `tab`, `M` (model), `ownph` (genus id → the owner's photo of it, §5 "three to find next"), `cmp`, `ladder`, `crew`, `pioneer`, `report`, `haunts`, `trip`, `elev` (observation id → metres above
sea level, from the terrain tiles; shared across users since ids are global), `wx` (home base rounded to 0.1°, `"lat,lng"` →
`{ts, v:3, off: UTC offset in s, h:{time, t, pp, p, cc, w, sw, rh, day}}`, the hourly Open-Meteo arrays, 2 past days + 16 ahead; also the
destination of a dated trip; 1 h fresh, newest 4 kept), `frontier` (z7 tile `"x/y"` → `{ts, c:{square: [salticid, all life]}}`, 30 days, newest 60), `events`, `pendingVs`, `pendingCrew`, `pendingEv`,
`evOpen` (id of the open event), `evDraft` (the create form), `evBroken` (a malformed link was opened).

`F` (global, field mode, **memory only, never saved**): `on`, `pos` (live position), `geo`/`compass` (status), `heading`, `watch`, `lock`,
`sq`, `toasted` (squares already toasted this session), `scans`/`active` (field scans by `pt:` key), `haunts` (away-from-home haunts),
`scanK`, `scanAt`, `scanErr`, `pick` (which target), `tb` (target bearing).

`S.events` (persisted key `events`, shared by every user of the browser): id (`'e' + hash of the link code`, or `cup:YYYY-MM`) →
`{id, code (the ?ev= payload; null for cups), ev (decoded), ts (last opened), at (last read), players (open events), pre {login: [genus ids
before the event]}, gone {login: true if no such user}, obs [{id, u login, d observed, c uploaded date, g genus, sp species, ink, inkS,
k 25 km square or null, a annotations, b behaviour keywords, ph first photo}], st {login: score} (last snapshot), lead, ink {login: {genus:
pts}}, turf {square: login}, from (scores to count up from, once), feed [{ts, txt}], res {rows:[{login, rank, val, pts, pencil}]}, final,
shown (podium seen), justFinal, dareWon, sig (cup roster)}`. Capped at 20 (`EV_KEEP`): finished ones go first (oldest end date), then
the least recently opened; the open one is never dropped.

`S.prefs`: `scope` (country|state|world), `reveal`, `peek`, `chassis`, `filter`, `layer` (genus|species|sets|needsid), `tipsDone` (photo checklist seen),
`ladderScope`, `ladderSort`, `wantedView` (bounty|posters; default bounty), `leadFilter` (taxon id or null), `map3d` (false = 2D Leaflet map;
unset/true = 3D when WebGL2 is available), `mapLayers {fog, mine, front}` (false = hidden; `front` is off unless true), `scanKm` ('sq'|5|10|25|50|100, default 25),
`scanPer` (all|90|60|30|month, default all), `scanTab` (g|s).

Per-user save `S.u` (key `u:<login lowercased>`): `obs` (id → trimmed obs), `meta {lastSync, lastFull}`, `seen` (revealed genus ids),
`scans` (point key → `{ts, b:1, g:[{id,c}]}`, ±25 km squares), `active` (same, last 30 days, with `d1`), `mscan` (the last map scan:
`{lat, lng (0.01°), km, per, ts, month, near, G:[{id, c records, r last-30-day records}], Sp:[same]}`), `scanHist` (the last 5 map scans,
same shape, newest first), `completed` (quests), `base` (optional home base
`{lat, lng, label, places{country,state}, near}`), `visit {last, prev}`, `news {since, ts, dismissed, near, nearT, st, stT, unk}`,
`bounty {helped:[obs ids], data{ts, k, unk[], unkN, conf[], confN}}`, `tabs` (tabs opened by a link before their level), `tabsSeen`
(tabs this player has had; anything newer gets the unlock toast), `tabNew` (tabs with a ● until opened), `fog` (25 km square keys already cleared on the 3D map; squares not in
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
haunts report trip elev wx events landing` (`landing` = `{ts, items:[{g genus, n, cn, o observation, u photo url, by, lic}]}`, read on demand,
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
  **Three to find next** (v1.20): the home scan and last-30-days scan if not cached (2), season curves for the 8 likeliest (30-day cache,
  shared with the posters), 1 `/taxa` for names and photos, 1 for the owner's photos (30-day cache): ≈ 12 the first time, then 0–2.
  **Landing page** (v1.20): 2 calls when the owner has photos of all but one or two `LAND` genera (measured: 1 owner call + 2 CC calls
  for *Phidippus* and *Salticus* + 1 `/taxa` = 4), once per 14 days per browser; 0 for anyone who has opened a SPOODEX before.
  **Map scan** (v1.17): 2 calls (the chosen window + the last 30 days; 1 for a 30-day scan) plus a place-name lookup (≤ 3, once per 0.1°
  cell per session); a 100 km scan is still one call per window. The first Map-tab visit scans around home automatically.
  **Frontier layer** (v1.18): 2 calls per z7 tile in view (≤ 6 tiles per map move, 30-day cache); nothing while the switch is off.
  **Map tab, first open** (v1.19): the home scan (2–3 calls, once) and season curves for up to 25 new-to-you genera in it (30-day cache,
  shared with the posters). The missing-genus squares and the weather panel's genera list (up to ~70 calls between them) are gone.
  Elevation and terrain tiles come from AWS, not iNat (owner: 66 z12 tiles for 1,534 records, once).
  **Spooding weather**: 0 iNat calls (1 Open-Meteo call per home base per hour).
  **Field mode**: 2 per scan (all-time + last 30 days), only on entering a new 0.1° cell and at most every 10 min, so ≤ 12 an hour
  while moving and 0 while standing still; haunts for the top 8 missing genera ≤ 8 (near home: 7-day cache shared with the posters,
  usually 0; away from home: once per 0.5° centre per session); season curves for the scan's missing genera (≤ 25, 30-day cache).
  **Events** (v1.16), measured: opening a fresh **6-player event costs 8 calls** (6 before-the-event collections + 1 event tree + 1 page
  of records) when the place name and the region's checklist are cached, up to **10** when they aren't (+1 `places`, +1 region
  `taxonomy`), plus 1 per extra 200 records in the window. Each **refresh: 2** (tree + 1 page per 200 records). An **open bioblitz** adds 1
  `observers` call per refresh and up to 25 one-off collection calls (measured: 7 players, 10 calls). Creating a **bingo** event
  checks the season of ≤ 44 candidate genera (histograms, 30-day cache shared with the posters; 0–2 calls when cached) plus the region
  checklist. The **Crew Cup** is an event like the others, for this month and last month: ≈ (crew + you) + 2 calls each the first time,
  then 2 per 30 minutes while the Crew tab is open; last month stops once final.
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
  location privacy note by the home-base controls, the GoatCounter and weather disclosures in Settings, the location note on the
  field-mode start screen, photo and weather attribution, and the chassis tier names and subtitles (game flavour).
  Event screens explain what inked/pencilled and the points mean (it's what makes the numbers readable); keep those.
  "Spooding weather" scores the weather and the season; keep its wording from suggesting it predicts spiders.
- **Photos from other people** (owner, v1.20): licence-checked and credited every time. Prefer the owner's own photos (`themoojuice`,
  ~14k observations); use someone else's only where he has no suitable one, and then only CC0, CC BY or CC BY-NC (`OK_LIC`), credited
  "© name, licence" and linked to the record. Existing views that still show iNat's taxon photo without the check are listed in §12.
- **Taxonomic care**: propose curated taxon lists to the owner; don't present them as settled. Check names against the live iNat tree.
- **Privacy**: ≥25 km squares only, no exact coordinates (bounty distances rounded to 5 km), home base rounded to ~0.01° and kept in
  the browser, trips kept in the browser. Share links carry only `?u=`, `?vs=`, `?crew=` (usernames) and `?ev=` (event links, below).
  **Field mode** (v1.15): the live position stays in `F` for the session. It is never stored, logged, sent to GoatCounter or put in a
  link; it reaches iNat only as a 25 km scan point rounded to 0.1° (like a map scan), or a 0.5° haunts centre away from home. The
  needle points at 25 km square centres, never at individual records (owner's open question, §12: don't change it without asking).
  Open-Meteo gets the home base rounded to 0.1°.
- **Event links** (v1.16): `?ev=<base64url(JSON)>`, ≤ ~1,500 characters, validated by `evCheck` (anything malformed shows only "This event
  link is broken"); every decoded string is `esc()`d. Fields: `v` 1 · `m` blitz|bingo|turf|duel|dare · `n` name ≤ 40 · `d1`/`d2`
  YYYY-MM-DD (≤ 92 days; a duel 1–3 days) · `p` optional iNat **place id** · `r` roster of 1–6 iNat logins (absent = open bioblitz) ·
  `s` seed · `sc` rarity-scope place id (a state; only when there's no `p`) · `t` bioblitz target genus ids (≤ 30) · `b` bingo pool
  codes · `q` dare target code. **Place ids are allowed in event links (owner-approved, 2026-10-05)**: a named park, LGA or region
  the creator picks from `/places/autocomplete`, never coordinates, and never filled in from the home base. Square codes: `g<id>`
  genus, `s<id>` species (dares), `n` new to you, `x` no player had it, `t` tribe new to you, `M`/`F`/`J` male/female/juvenile, `s`
  species-level ID, `q` three 25 km squares, `bf`/`bc`/`be` feeding / courtship / egg sac, retreat or moult (keyword or Evidence
  annotation). GoatCounter gets only `event-created` and `event-opened`, never names, usernames or places.
- **No backend** yet; public read-only iNat data; no OAuth. Third parties: GoatCounter (anonymous counts, §5) and Open-Meteo (weather, §3).
  Single file plus the approved offline sidecars until it clearly outgrows that (then Vite + TS).
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
for (const id of Object.keys(S.events)) run('ev:'+id, ()=>{S.tab='crew'; S.evOpen=id; render();});
S.evOpen=null;
for (const m of ['blitz','bingo','turf','duel','dare']) run('evform:'+m, ()=>{S.tab='crew'; S.evDraft=evDraftNew(m); render();});
S.evDraft=null;
for (const [n,f] of [['genus',()=>openGenus(S.M.genera[0].id)],['case',()=>openCase(wantedList()[0].id)],['settings',settings],['card',openTitleCard],['wrapped',()=>openWrapped()],['field',()=>{openField(); closeField();}],['evcard',()=>openEventCard(Object.keys(S.events).find(id => S.events[id].obs))]]) { run('modal:'+n,f); $('#modalRoot').innerHTML=''; }
S.prefs.layer='genus'; S.prefs.wantedView='bounty'; savePrefs(); ({out, errs:__errs})
```
Then repeat the tab loop at phone width (375 px) and check `document.documentElement.scrollWidth === innerWidth`, and try guest mode
("Explore near me") on a fresh load.

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

**Testing field mode and offline without devtools** (the desktop pane has no Sensors or Network panel):
```js
// fake GPS: start field mode, then feed positions
Object.defineProperty(navigator, 'geolocation', { configurable:true, value:{ watchPosition(ok, err) { window.__geo = { ok, err }; return 1; }, clearWatch() {}, getCurrentPosition() {} } });
openField(); fieldStart(); __geo.ok({ coords:{ latitude:-17.29, longitude:145.63, accuracy:10 } });
// compass: Android-style absolute heading (alpha 90 = phone top pointing west) …
dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute', { alpha:90, absolute:true }));
// … or iOS-style
const ev = new DeviceOrientationEvent('deviceorientation'); Object.defineProperty(ev, 'webkitCompassHeading', { value:200 }); dispatchEvent(ev);
// app-level offline (the service worker still sees the network)
Object.defineProperty(navigator, 'onLine', { configurable:true, get:() => false }); dispatchEvent(new Event('offline'));
// back: delete navigator.onLine; dispatchEvent(new Event('online'));
```
The pane's Chromium exposes `DeviceOrientationEvent.requestPermission` and refuses it even on a real click, which conveniently tests
the "compass refused" path. For the service worker's offline path, stop the preview server (`preview_stop`) and reload: the shell,
libraries, viewed tiles and photos come from Cache Storage (fetch a non-shell file such as `/HANDOVER.md` to confirm the server is down;
`/index.html` will answer from cache). In real Chrome, devtools → Application shows the manifest, icons and worker, and Network → Offline
does the rest. Clear old caches with `caches.keys().then(ks => ks.forEach(k => caches.delete(k)))` if a test needs a cold start.

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
- **Compass**: the Android heading is 360 − alpha, which is accurate with the phone held roughly flat (tilting it upright drifts).
  On iOS, refusing motion access sticks until the page is reloaded (Safari only asks again after a reload). Field mode's scan and
  needle use ~25 km squares on purpose (§9).
- Field mode wasn't tested on a physical phone yet (only with faked GPS/orientation in the desktop pane); see §12.
- **Events are deterministic up to the data each viewer has**: everyone reads the same records, but ★ rarity comes from each browser's
  cached regional tree (refreshed weekly), so two viewers can differ by a star until their caches agree; a record can also be inked
  between one viewer's refresh and another's. Once final, each browser stops refreshing and keeps its last reading (trophies come
  from it). Open bioblitzes are re-read from the current top-25 observers each refresh, so a 26th-ranked player can drop out.
- Event records are attributed by `user.login`; a renamed iNat account breaks old links (its records stop matching the roster).
- iNat's `/places/autocomplete` also returns user-made places (e.g. private properties); the event form lists whatever iNat returns.

## 12. Backlog and ideas (owner-approved or discussed; not built)

**Before posting publicly (discussed 2026-09-28)**:
- **Usage analytics**: DONE in v1.11 (GoatCounter, see §5 "analytics"). Stats: https://themoojuice.goatcounter.com (owner signs in).
- **Mobile navigation**: group the 11 tabs into ~4 sections (e.g. Collection / Explore / Social / Quests).
- **Test outside Australia**; consider showing progress as a % of the regional total for low-diversity regions (e.g. the UK has ~20 genera).
- **Full-photo share cards** via an image proxy (see §11).

**Awaiting the owner's decision (v1.20, spood frenzy)**:
- **Pitch** (top of the landing page). Using the first; alternatives:
  1. "A Pokédex for jumping spiders, filled in from your own iNaturalist photos." (yours, lightly kept)
  2. "Collect every jumping spider genus. Your iNaturalist photos fill in the cards."
  3. "Photograph a jumping spider, post it on iNaturalist, and its card lights up here."
  "Pokédex" is a Nintendo trademark; using it descriptively in a tagline is common, and 2 and 3 avoid it if that worries you.
- **Landing genera** (`LAND`, proposed): the world's most-recorded salticid genera on iNat plus favourites: *Maratus*, *Phidippus*,
  *Portia*, *Mopsus*, *Cosmophasis*, *Myrmarachne*, *Salticus*, *Menemerus*, *Plexippus*, *Hasarius*, *Evarcha*, *Zenodorus*. Your
  research-grade photos cover 10 of them (your most-faved record of each; pin a favourite per genus in `LAND_PIN`). You have no
  research-grade *Phidippus* (no records) or *Salticus* (one casual record), so those two use the most-faved CC BY-NC research-grade photo
  by someone else (currently Lily Fulton and Thomas Shahan), credited on the card. Swap either genus out if you'd rather show only yours.
  Your photos are all rights reserved; they're shown because you asked for them, credited "© themoojuice".
- **One line per genus** (`wowLine`): of your 54 genera, 24 get a Wikipedia line, and only about 5 say something about the animal
  (*Maratus* courtship colours, *Myrmarachne* waving its front legs as antennae, *Portia* eating other spiders, *Abracadabrella*
  "appear to mimic flies", *Menemerus* "found worldwide in warmer climates"); most of the rest say where the genus lives, and 30 get
  nothing. Hand-written lines would be better for kids: write them into `GENUS_NOTES` (genus id → one sentence) and they replace
  Wikipedia's. They're quoted as written on Wikipedia, so a line can say "endemic" or "native"; tell me if you'd rather skip those.
- **Photo checklist** (`PHOTO_TIPS`, "📸 Photos that get a genus ID"; please check the wording):
  1. 👁 **Face on**: the big front eyes and the face
  2. ⬆ **From above**: the whole body and its pattern
  3. ↔ **From the side**: the legs and the body in profile
  4. 📏 **Something for scale**: a fingertip, coin or ruler beside it
  5. 📸 **Several sharp shots**: all in the same iNaturalist record
- **Mystery spood actions**: "Ask for an ID ↗" opens the record (where you'd @mention an identifier); "Add photos ↗" opens
  `inaturalist.org/observations/<id>/edit`, iNat's own edit page for the observer. Neither can be checked by automation (Cloudflare).
- **Tab levels** (`TABS[].at`, genera needed): always Profile, SPOODEX, Map & scanner, Crew, Quests; This week 3; Trip planner and
  Compare 5 (the Field Notebook tier); Bounty board and Ladder 10; Lineage tree 15 (unchanged, Mk II). The old 🔒 tab and "MODULE NOT
  INSTALLED" plate are gone: locked tabs are simply not shown.
- **Kids and the tier subtitles**: the review flagged "A slightly suspicious digital notebook" and "Everything, plus smugness" as adult
  jokes. They're your game flavour, so unchanged; phones no longer show the subtitle in the header. If you'd like plainer ones, e.g.
  Mk 0 "Your first field notebook", Research Station module "Every module installed".
- The landing page doesn't guess where a stranger is, so it always shows this global set; their own area comes with the first start.

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

**Awaiting the owner's decision (v1.15, field mode)**:
- **Spooding weather thresholds** (all in the `WX` constant, first guesses): warmth 0 at 18 °C → 1 at 24 °C, flat to 32 °C, 0.8 at
  35 °C, 0 at 40 °C; sun = shortwave 100 → 500 W/m², or 0.7 × clear sky, whichever is higher; dry = rain chance 20 → 70% and
  0.1 → 1 mm/h; calm = wind 15 → 35 km/h; a dull hour keeps 40% and a windy hour 50% of its score; a good hour scores ≥ 0.6; windows
  rank by mean score + 0.03 per hour (up to 4 h). Sky words: < 30% cloud "sunny", < 70% "partly cloudy", else "cloudy" or "hazy sun".
  With these, a typical October week in Cairns gives 9 am–5 pm windows almost every day (mornings < 18 °C and showery afternoons drop out).
- **Compass privacy (open question)**: the needle points at 25 km square centres, which makes it a driving compass rather than a walking
  radar. Pointing at other people's unobscured public records more precisely would be more fun but breaks the 25 km rule. Kept the rule.
- **Trip weather**: trips have a month, not a date, so the Trip planner has no weather. Would need a trip date (and the forecast only
  reaches 7 days, so it would only help for imminent trips).
- **App icons**: `icon-192.png`/`icon-512.png` are placeholders for the owner's sticker art.
- Field mode also sits in the header now (🧭 Field); fold it into the tab regrouping below if that happens.

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
