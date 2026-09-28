# SPOODEX — handover (as of 2026-09-28, v1.7)

Read this before touching the code. It covers what exists, how it's wired, how to test and ship,
the owner's preferences, and a spec for the next piece of work: the **regional ladder** and the
rest of the **envy engine**.

---

## 1. What SPOODEX is

A "living Pokédex" of jumping spiders (Salticidae) built from a person's **real iNaturalist records**.
Enter an iNat username; the app pulls their public salticid observations, collapses them to
**genus** (the collectible unit), and builds a collection, lineage tree, nearby-genus scanner, quests
and comparisons. Core principle from the owner: *the game should make you close it and go spooding.*

- **Owner**: Brendan, iNat login `themoojuice` (Cairns, QLD; about 1,535 salticid obs, 54 genera, 87 species).
  An experienced spider naturalist, so be taxonomically careful. Uses "spood/spooding" affectionately.
- **Live site**: https://themoojuice.github.io/spoodex/?u=themoojuice (GitHub Pages, `main` / root)
- **Repo**: https://github.com/Themoojuice/spoodex (public)

## 2. Files

| File | What it is |
|---|---|
| `spoodex.html` | **The entire app**: HTML + CSS + JS in one file (~2,950 lines). No build step. |
| `index.html` | Redirects to `spoodex.html`, keeping `?query` (so `/spoodex/?u=x` works). |
| `ARCHITECTURE.md` | Original v1 design doc. Mostly still right, but **the tier table and roadmap there are stale**; trust this file and the code. |
| `README.md` | Public blurb for the repo. |
| `site/` | Git-ignored copy of `index.html` + `spoodex.html` for drag-and-drop hosting (Netlify Drop). Refresh with `cp index.html spoodex.html site/`. |
| `.claude/launch.json` | Preview server config `spoodex` → `python -m http.server 8765`. Git-ignored. |

External deps (CDN): Leaflet 1.9.4 (cdnjs), Google Fonts (Special Elite, Fraunces, IBM Plex Mono,
Caveat). Map tiles: **Esri World_Topo_Map + World_Imagery (keyless)**. OSM's tile servers blocked us
(tile usage policy) and CARTO now needs an API key, so don't switch back.

## 3. Code map (`spoodex.html` script, by section marker)

Search for `/* ---------------- <name>` to jump to a section. Line numbers drift.

| Section | Key functions | Notes |
|---|---|---|
| constants (top of script) | `SALTICIDAE=48139`, `ANN`, `BEH_RX`, `TIERS`, `CRITERIA`, `MASTERY_AT=7` | |
| utils | `$`, `esc`, `photoSize(url,size)`, `cellKey`, `cellLabel`, `store.init/get/set/del/flush/usage` | See §4 "Storage": IndexedDB behind a synchronous in-memory cache |
| api | `api(path, params, base = API)` | Global throttle ≈1 request / 1.1 s (iNat asks for ~1/s, ≤10k/day). On 429/5xx **or a network error** it pushes back the whole queue (`nextSlot`), because iNat's 429s have no CORS header and reach the browser as network errors. Pass `API2` for v2. **All iNat calls must go through `api()`.** |
| state | `S` | See §4 |
| sync | `importRecords(login, save, {full,log})`, `OBS_FIELDS`, `sync()`, `loadRefs()`, `ensureRef(scope)` → `ensureRefPlace(pid)`, `fetchPlaces()`, `placesNear(lat,lng)`, `resolveBasePlaces()`, `setBase()`, `geolocate()`, `ensureInfo(ids)` | `importRecords` is reusable for *any* login (used for rivals). Since v1.7 it uses **v2** `/observations` with `fields=OBS_FIELDS` (exactly what `trimObs` reads): ~29 KB gzipped per 200 records vs ~470 KB on v1, and verified to produce byte-identical trimmed obs (1,538/1,538 for the owner). **If `trimObs` starts reading a new field, add it to `OBS_FIELDS`**, or it will silently be missing |
| model | `buildModel(obsMap, base)` → `M`; `genusOf`, `speciesOf`, `genusOfNode`, `lineage` | Pure derivation, no network |
| scope helpers | `scopeGenera`, `taxonomicOrder`, `refCount`, `rarityTier(id,scope,kind)`, `starsFor(id,kind)`, `rarityNote`, `prestige(M)`, `moduleOn(tier)` | `kind` is `'g'` (genus) or `'s'` (species) |
| field style & titles | `fieldStyle`, `favouriteLineages`, `generatedTitle` | |
| quests | `buildQuests(M)`, `questDone(q,M)` | Quests are derived fresh; completion is detected on sync by diffing against the pre-sync quest list |
| views | `render()`, `viewProfile`, `cardHtml`, `viewDex`, `viewTree`, map (`initMap`, `showCell`, `scanCell`, `showScan`, `baseWidget`), `viewQuests` | `render()` swaps `#view` innerHTML; `TABS` controls the nav |
| species layer | `speciesInScope`, `speciesCard`, `viewDexSpecies`, `layerSwitch`, `speciesSection(gid)` | |
| active now | `scanActive(k)`, `activeHtml(k)` | |
| best months | `ensurePheno(ids)`, `peakInfo`, `phenoHtml`, `phenoTag`, `phenoChart`, `phenoUpdated()` | Placeholders `[data-pheno]` / `[data-phenochart]` are filled in place, **no re-render** |
| mastery fix-it | `fixIt(g, criterionKey)` | |
| genus page | `openGenus(id)` | Modal in `#modalRoot` |
| reveal ceremony | `revealQueue(genera)` | |
| compare | `viewCompare`, `lineageRows`, `loadCompare(login)` | |
| regional ladder | `loadLadder(force)`, `ladderRows`, `viewLadder`, `myStanding`, `starsIn`, `idPrestige` | One `observers` call + one in-place `taxonomy` call per person; streams rows, resumable, 24 h cache |
| crew mode | `setCrew(list)`, `loadCrew(force)`, `crewMembers`, `viewCrew` | You + ≤5 others; one all-time `taxonomy` call (`captive=false`) each; "you" comes from local `S.M` |
| share of the record | `recordShare(pid)`, `shareHtml`, `shareLine(g)`, `inPlace`, `pctTxt` | No extra calls: your verifiable in-place obs vs `S.ref` counts (`ref.t` = family total) |
| pioneer badges | `pioneerTargets`, `drainPioneer`, `myPioneers`, `pioneerHtml`, `pioneerLine` | Earliest verifiable record per (genus, place): your countries/states + LGA of your first record. ~180 calls for the owner, 30-day cache, runs while Profile is open |
| spood report | `loadReport(force)`, `viewReport` | "This week" tab: state taxonomy/observers/most-faved with `d1` (7 days) + a per-person weekly mini-ladder; 6 h cache. "First on iNat" = week count ≥ freshly-refreshed all-time count |
| cards (shared) | `cardKit(cv)`, `cardPhotos`, `mountCard(el, draw, name)`, `cardBlob`, `cardExport`, `rarestFirst` | 1080×1350 canvas kit; see §9 on CORS |
| title card | `drawTitleCard`, `openTitleCard` | |
| wrapped | `wrappedData(Y)`, `wrappedExtras` (most-faved obs + state total for the year), `openWrapped`, `showWrapped`, `drawWrappedCard` | 6-slide modal, last slide is a downloadable card |
| most wanted | `homeCtx()`, `wantedList(ctx)` (score), `sharpenWanted(ctx, redraw)`, `loadWanted`, `viewWanted`, `posterHtml`, `calendarHtml`, `ensureHaunts(gid, ctx)`, `hauntSummary(hn, ctx)`, `openCase(gid, ctx)`, `drawCaseMap` | Everything takes a **ctx** (`{kind, pid, centre, km, month, at, near, recent, stale, posters}`) so the same ranking serves home and trips; ctx defaults to `homeCtx()`. Ideas 5+6 combined. Score = records-near-home × season this month × reach (distance to nearest record square) × log(state count). Posters for the top 6, a 12-month calendar for the top 40, case file with a Leaflet map of 25 km squares. Haunts use **v2** `/observations?fields=id,observed_on,obscured,geojson` (≈30 KB per 200 records), radius 150 km from home, falling back to the whole state; obscured records are skipped |
| trip planner | `S.trip {cur, recent}`, `tripCtx()`, `setTrip`, `loadTrip(force)`, `tripSpots`, `viewTrip` / `viewTripPlan`, `mountTripMap` | Most Wanted for any destination. Search via `/places/autocomplete`; countries, states and places with `bbox_area > 4` are planned as a whole region (`area` = place id), anything else by what's within `TRIP_KM` = 50 km. Region for seasons/counts = the point's state (via `placesNear`). Month selector re-ranks with no calls. Record squares = union of haunts for the top 10, weighted by distance. Streamed updates only redraw `#tripPlan` (so the search box isn't wiped), and the Leaflet map element is moved between renders rather than rebuilt. ≈55 calls for a fresh destination, then cached (area 24 h, pheno 30 d, haunts 7 d) |
| crew feed | in `loadCrew`: diff vs previous snapshot → `S.crew.feed`; `row.wk` = uploads in last 7 days (`created_d1`); `crewFeedHtml`, `crewUnseen` (tab dot) | Crew refreshes every 6 h, also in the background after each sync |
| boot / flows | `loadUser`, `updateUrl`, `copyLink`, `doSync`, `onboard`, `enterApp`, `startGuest`, `settings`, global click/submit/change handlers, `boot()` | |

**UI event wiring**: one delegated `click` listener on `document` dispatches on data attributes:
`data-tab`, `data-genus` (opens genus modal), `data-close`, `data-filter`, `data-layer`, `data-scan`
(a scan-point key), `data-base` (`lat|lng|label`), `data-act` (`peek|full|share|geo|clearBase|guest|sample|switch|wipe|lscope|lsort|ladderRefresh|vs|crewAdd|crewDel|crewRefresh|card|cardPng|cardShare`, with the argument in `data-v`).
Forms use `data-form` (`compare`, `placeSearch`, `crew`) on a delegated `submit`. Prefs use `data-pref` on `change`.
**Exception**: Leaflet popups stop click propagation, so popup buttons get direct `onclick`s (see `initMap`).

## 4. State & storage

`S` (global): `login`, `u` (per-user save), `nodes` (taxon id → `{n,r,l,p}` name/rank/rank_level/parent),
`places` (id → `{n,l}` admin_level), `info` (taxon → `{p photo, s summary, w wiki, a attribution, c count}`),
`ref` (scope key → `{ts, g:{genusId:count}, s:{speciesId:count}}`), `observers`, `pheno`
(`"gid:placeId"` → `{ts, m:[12]}`), `prefs` (`scope, reveal, peek, chassis, filter, layer`),
`tab`, `M` (model), `cmp` (`{login, save, M, loading, log, error}`), `pendingVs`.

Storage keys (IndexedDB since v1.7, see below): `u:<login lowercased>`, `nodes`, `places`, `info`, `ref`, `observers`,
`pheno`, `prefs` (now also `ladderScope`, `ladderSort`), `cmp` (only the most recent rival is cached), `ladder` (`'p<place>'` → `{ts, n, icons, queue, rows:[{login, obs, g:[ids], s:[ids]}]}`, ≤4 places), `crew` (`{logins, data:{login→{ts, obs, g:{id:obs}, s:{id:obs}, wk:{obs,g[]}, err?}}, feed:[{ts, since, login, g[], s[]}], seen}`), `pioneer` (`'gid:pid'` → `{ts, u, d, id}`), `haunts` (`'gid@lat,lng'` or `'gid@p<place>'` → `{ts, n, used, skipped, wide, cells:[[cellKey, n, last]]}`, ≤80), `report` (one cached report), `trip` (`{cur:{label, lat, lng, area, pid, m, ts, g:[{id,c}], s:[ids], act:[{id,c}]}, recent:[≤6]}`, browser only, never in links). `pheno` keys are `'gid:place'` for any place (trips add other states).
localStorage keys (`spoodex:` prefix): only `prefs` and `lastLogin`.

Per-user save `S.u`: `obs` (id → trimmed obs, see `trimObs`), `meta {lastSync,lastFull}`, `seen` (genus
ids already revealed), `scans` (point key → `{ts,g:[{id,c}]}`), `active` (same, last 30 days, with `d1`),
`completed` (quests), `base` (`{lat,lng,label,places{country,state},near}`, optional home base).

Trimmed obs: `{id, d date, q quality_grade, cap captive, t{id,n,r,l}, anc ancestor ids (incl. self),
ct community-taxon ancestry|null, lat, lng, ob obscured, pg place_guess, pl place_ids, ph [≤3 photo urls],
ann ["attr|value" …, net-positive votes only], beh ['feed'|'court'|'egg' keyword hits]}`.

Model `M`: `obs, G (Map genusId → g), genera (by discovery order), S (Map speciesId → sp), species,
leads (above-genus obs grouped), xp, cells25 (Map 0.25° cells), cellsAll01, fieldDays, dayDisc,
streak, bestStreak, home{country,state}, homeCell, behObs, monthsAll, newThisYear, tier`.
A genus `g` has: `obs, first, last, sp (Set species ids), species (Set names), c01, months, years, f
(criteria flags), level 0–10, state DISCOVERED|SUPPORTED|MASTERED, xp, xpLog, photos, cover, discIndex, places`.

**Storage (v1.7)**: everything except `prefs`/`lastLogin` lives in IndexedDB database `spoodex`, object store `kv`, as JSON strings
(so `store.get` returns a fresh copy, exactly like the old localStorage behaviour). `boot()` awaits `store.init()`, which loads every
key into `store.mem`; then it re-reads the shared caches (`PERSISTED` list) because their module-level `store.get` defaults ran before
IndexedDB was open. **A new persisted `S.x = store.get('x', …)` at module level must be added to `PERSISTED`**, or it will always start empty.
`store.set` is synchronous (updates memory) and batches writes to IndexedDB after 300 ms; `flush()` also runs on `pagehide`/hidden.
On first run it moves old `spoodex:*` localStorage saves into IndexedDB and deletes them only once written (verified with the owner's save).
Without IndexedDB (some private modes) it falls back to localStorage. Settings shows usage via `navigator.storage.estimate()`.

**Scan-point keys**: a 0.25° grid cell key `"lat:lng"` (integers), or an arbitrary point `"pt:lat,lng"`.
Always resolve with `pointFor(k)`.

## 5. iNaturalist facts we rely on (verified)

- Salticidae taxon id **48139**. Taxon `ancestor_ids` include the taxon itself.
- `GET /v1/observations/taxonomy?taxon_id=48139&…` returns a whole tree (with `rank`, `parent_id`,
  `descendant_obs_count`) for any `user_login`, `place_id`, or `lat/lng/radius`, plus `d1` for a date
  window. **One call gives genus and species counts.** This powers the regional references, scanner,
  active-now, and user trees.
- `GET /v1/observations/histogram?taxon_id=G&place_id=P&interval=month_of_year&verifiable=true` → `results.month_of_year {"1":n,…}`
- `GET /v1/observations/observers?taxon_id=…&place_id=…` → top observers (`results[].user.login`,
  `observation_count`, `species_count`), `total_results` = number of observers.
- `GET /v1/places/autocomplete?q=` (has `location "lat,lng"`), `GET /v1/places/{ids}` (admin_level 0 country, 10 state, 20 county/LGA).
- `GET /v1/taxa/{≤30 ids}` includes `default_photo` and `wikipedia_summary`.
- Annotation ids: **Sex = 9** (Female 10, **Male 11**), **Life stage = 1** (Adult 2, Nymph 5, Juvenile 8),
  **Evidence = 22** (Egg 30, Molt 28, Construction 35). API filters `term_id`, `without_term_id` work.
- Pagination: `per_page=200&order_by=id&order=asc&id_above=<last id>` (avoids the 10k page cap).
- **The iNat website sits behind a Cloudflare bot check. Automated browsers get "Just a moment…". Don't try
  to bypass it.** Verify web-link filters via the API instead.
- Reference "on iNat in Australia" means **verifiable** records only (`verifiable=true`).
- Useful public test accounts: `themoojuice` (owner), `laz` (Qld, 38 genera, 60 species, active since
  2011 — the standard compare test), `natashataylor`, `rattyexplores`, `scottwgavins` (top Qld
  salticid observers per `/observations/observers?taxon_id=48139&place_id=7308`).
  Place ids: Australia **6744**, Queensland **7308**.

## 6. Game rules (current)

- **Level = number of genera.** Species are a *side collection* and never drive level (owner's explicit design choice).
- Discovery states: Unknown (blurred, greyed-out photo + `???`) → Glimpsed (records stuck above genus, "leads") →
  Discovered → Supported (community taxon falls within the genus; this is **not** Research Grade) → Mastered (7 of 10 `CRITERIA`).
- Tiers / chassis (`TIERS`, `moduleOn(i)`): 0 Mk 0 (genus records + scanner) · 5 Field Notebook (region stats) ·
  15 Mk II (lineage tree) · 30 Mk III (rarity ledgers) · 50 Naturalist Cabinet (mastery XP ledger) ·
  75 Arachnologist Rig (gilded mastered cards) · 100 Research Station. Skins: `notebook` (kraft paper),
  `kit` (herbarium field guide), `cabinet` (walnut + brass + cream labels). ⚙ → "peek" unlocks everything.
- Rarity ★1–3 = tertile of iNat record count within the selected scope; a taxon **absent** from the scope
  reference = ★★★. **Prestige ✦** = Σ genera 10×★ + Σ species 3×★ (see `prestige()`).
- Streaks count consecutive *field days* with a new genus (not calendar days: "nature doesn't owe you a spider every Tuesday").

## 7. Owner preferences & guardrails (don't regress these)

- **Aesthetic: natural-history / naturalist.** The owner explicitly rejected a green-on-black
  "matrix/terminal" look. Keep the kraft → herbarium → museum-cabinet progression.
- **Honest labelling**: rarity = iNat record frequency, *never* "conservation status". Classification
  follows iNat; it's a taxonomy, not a phylogeny. Keep caveats short and visible.
- **Privacy**: map uses ≥25 km squares only; never show exact coordinates; home base is rounded to ~0.01°,
  stays in the browser, and **never goes in share links**. Share links carry only `?u=`, `?vs=` and `?crew=a,b` (usernames only).
- **No backend** so far. Everything is public read-only iNat data; no OAuth.
- Keep it a single self-contained HTML file until it clearly outgrows that (then Vite + TS; see ARCHITECTURE.md).
- Never help find or enter the owner's credentials. GitHub pushes use Git Credential Manager, where the owner
  signs in with Google themselves.

## 8. How to work on it

**Run & test**: start the preview server `spoodex` (`.claude/launch.json`, port 8765) and open
`http://localhost:8765/spoodex.html?u=themoojuice` (and `&vs=laz` for Compare). Don't test via `file://`
or the pane's `data:` snapshot: storage is disabled there. In the browser pane you can drive state
from JS: `S`, `S.M`, `render()`, `openGenus(id)`, `loadCompare('laz')`, `S.tab='quests'; render()`.
Resetting to a new user: `localStorage.removeItem('spoodex:lastLogin')`, then load without `?u`. Inspect saves via `store.mem` (keys → JSON strings).
The pane's screenshots can time out when it's in the background; `resize_window` preset `mobile` then back to `desktop` has helped.

**Editing**: the file is large. What worked well:
- Small edits via Edit tool or Python `str.replace` with `assert s.count(old) == 1`.
- Big changes: put the new code in part files under the scratchpad and apply them with a Python patch
  script (`block(start_marker, end_marker, new)`). Inline heredocs over ~30 KB fail on Windows (ENAMETOOLONG).
- **Always syntax-check** after edits:
  `python -c "s=open('spoodex.html',encoding='utf-8').read();open('_c.js','w',encoding='utf-8').write(s[s.index('<script>\n')+9:s.rindex('</script>')])" && node --check _c.js; rm -f _c.js`
- Match the existing style: terse template-literal views, `esc()` on **every** interpolated string from
  iNat or users, 2-space indent, comments only for non-obvious "why".

**Ship**: `cp index.html spoodex.html site/`, then `git commit`, then `git push`. GitHub Pages updates in ~30 s.
Credentials are cached by Git Credential Manager. Commit messages end with the attribution line from
the session's system reminder. Commit only when the owner asks, or as part of a requested "build it" task.

## 9. Known issues / caveats

- Incremental sync uses `updated_since`. It's unconfirmed whether adding an annotation bumps `updated_at`.
  The genus page tells users to use ⚙ → Full resync if a mastery box doesn't tick. Worth verifying.
- Fix-it links use web Explore params (`without_term_id`, `hrank/lrank`, `quality_grade`). The API honours
  them; the web page couldn't be checked (Cloudflare). If the owner reports a wrong link, switch to
  explicit `id=` lists.
- Unknown-species thumbnails on a genus page may be blank until `ensureInfo` finishes; they appear on reopen.
- One Australian genus iNat hasn't placed in any tribe shows as "#001 · Salticinae"; *Frigga* sits in Aelurillini on iNat. That's iNat taxonomy, not a bug.
- `ensureInfo` has a single `infoBusy` flag; concurrent requests are dropped, not queued (fine so far).
- Behaviour detection is keyword-based (`BEH_RX`) and heuristic.
- **Photo CORS (verified 2026-09-27)**: `static.inaturalist.org` (all-rights-reserved photos, which is most of them, including all of the owner's)
  sends **no** `Access-Control-Allow-Origin`, so drawing them taints a canvas. `inaturalist-open-data.s3.amazonaws.com` (CC photos) sends `*`.
  The title card draws every photo on screen (screenshot-able); the PNG download redraws with CORS-safe photos only and uses name plates
  for the rest, and says so. A full-photo PNG would need a tiny image proxy (e.g. a Cloudflare Worker), which means adding a backend.
- Don't cache-bust S3 URLs with `?cors=…`: S3 treats `?cors` as "return the bucket CORS config" (200 + XML). The card uses `?spoodex=card`.
- Ladder = top 25 observers **by record count** in the place, re-ranked by genera; someone with many genera but few records can be missing.
  Ladder rows count **verifiable** in-place records; crew counts **all** non-captive records (so crew ≠ ladder numbers, by design).

---

## 10. NEXT: regional ladder + the rest of the envy engine

v1.5 added share of the record, pioneer badges, the weekly Spood Report, Wrapped and the crew feed (ideas 3, 4, 7, 8, 9 of the 2026-09-27 list;
v1.6 added Most Wanted (5 + 6 combined). v1.7 added IndexedDB storage, v2 imports and the Trip planner. Not yet built: 1 "often confused with" via `/identifications/similar_species` ✅, 2 identifier track ✅, 10 ID bounties).
- Testing burns API quota fast (ladder ≈26 calls, pioneer ≈180, Most Wanted ≈40 for a fresh region, a trip ≈55). If you see 429s, wait a few minutes; another local session sharing the IP counts too.

Owner-approved roadmap order: **regional ladder**, then faster imports (v2 API `fields=`) + IndexedDB,
then share cards, crew mode, and curated habitat sets / field notes.

### 10a. Regional ladder — DONE in v1.4 (core only: no envy hooks, no ladder quest, no `&ladder=` link yet)

Goal: "the single most envy-inducing feature". Rank the top salticid observers of a place by genus
count (and prestige), with the current user slotted in.

Suggested design:
1. **Candidates**: `GET /v1/observations/observers?taxon_id=48139&place_id=P&per_page=25` (P = home
   state by default, with a toggle for country). Always add the current user even if they're outside the top 25.
2. **Per-person genus/species counts**: one call each to
   `/v1/observations/taxonomy?taxon_id=48139&user_login=L&place_id=P` → count `rank==='genus'` and
   `'species'` nodes (and compute prestige from those ids with `starsFor`). About 25 calls ≈ 30 s at our
   throttle, so **stream rows in as they arrive** and cache the ladder per place for ~24 h
   (e.g. `S.ladder["p7308"] = {ts, rows:[{login, icon, genera:[ids], species:[ids], obs}]}`).
   Keep only ids, not observations, to protect storage.
   Note: this is genera *recorded in that place*. Decide whether to show "in place" or "all-time" and label it clearly.
   In-place is fairer for a regional ladder.
3. **View**: a new `TABS` entry "Ladder" (consider gating at tier 1 or leaving ungated since it's social).
   Rank badges 🥇🥈🥉, the user's row highlighted, and "N genera behind #k (login)" / "N ahead of #k" callouts.
   Sort toggle: genera | species | prestige. Each row has a **Compare** button → `loadCompare(login)`,
   which already exists, then the Compare tab.
4. **Envy hooks**: "You'd pass <login> with 2 more genera: they have X and Y, which are *in season now*
   near you" (join ladder genus ids with `S.u.scans/active` and `peakInfo`). Add a "Climb the Ladder"
   quest to `buildQuests` (kind `hunt` with `targets`, so `questDone` already works).
5. **Share**: `updateUrl()` could add `&ladder=P` so a link opens the ladder tab. Keep locations out of links
   (a place id is fine, since it's a public admin area, not a person's location).
6. Respect rate limits: reuse `api()`; don't parallelise beyond its queue.

### 10b. Other envy-engine items (after the ladder)

- **Share cards** — DONE in v1.4 as the profile "title card" (no VS card yet). Original spec: render the profile/compare summary to a PNG via `<canvas>`. Check CORS first:
  `inaturalist-open-data.s3.amazonaws.com` (CC-licensed) photos probably allow it;
  `static.inaturalist.org` (all-rights-reserved) photos may taint the canvas. Fall back to text-only cards
  or leave those photos out. Include the attribution.
- **Crew mode** — DONE in v1.4. Original spec: compare 3–6 logins: a genus × person matrix, "only X has", and "nobody in the crew has"
  (from the scope reference). Reuse `importRecords` + `buildModel(save.obs, null)`. Storage: don't cache
  every rival's full obs; keep derived id sets.
- **Faster imports** — DONE in v1.7 (v2 + `fields=`). Not done: rendering cards progressively during a first import.
- **IndexedDB** — DONE in v1.7 for every cache; localStorage keeps prefs and the last login.
- Trip planner ideas not built: a shareable trip link (would need a place id only, never coordinates), multi-stop trips, and a
  "packing list" card export via `cardKit`.
- **Content (owner to supply)**: `guilds` (habitat sets) + per-genus field notes / "often confused with".
  Build the data format + UI; leave the taxonomic content to the owner.
