# SPOODEX — handover

**As of 2026-10-05 · v1.16 (branch `feature/crew-games`, not yet on main) · live at https://themoojuice.github.io/spoodex/?u=themoojuice**

> **Three unmerged branches**, each built on main v1.13 and independent of the others: v1.14 3D map (`feature/3d-map`), v1.15 field
> mode (`feature/field-mode`: Spooding weather, field compass, offline/installable) and v1.16 crew games (`feature/crew-games`, this
> file). Merging them will conflict in this file (§3–§7, §9, §10, §12, §13) and in `spoodex.html` (`render`, `PERSISTED`, the CSS
> block before `@media (max-width:600px)`, the click dispatcher, `updateUrl`/`boot`). Keep every side. Field mode's `sw.js` needs no
> change for events (event data lives in IndexedDB, never in the service worker).

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
  5. Privacy: ~25 km squares at finest, no exact coordinates. Share links carry usernames; event links (`?ev=`) may also carry
     dates, taxon ids and iNat **place ids** (owner-approved, v1.16), never coordinates (§9).
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
| **Crew** (`crew`) | **Events** first (v1.16): active event cards (name, mode, your rank, time left), ＋ New event, finished events; the automatic monthly **🏆 Crew Cup**. Then the crew: you + ≤5 friends, genus matrix and a feed (which also carries event news). An open event replaces the tab's content, with "← All events" |
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
| crew mode | `setCrew`, `loadCrew`, `crewMembers`, `viewCrew` (broken link / one event / events + `viewCrewMain`), `crewFeedHtml`, `crewUnseen` | One all-time `taxonomy` call (`captive=false`) each; 6 h refresh; feed = diff vs previous snapshot, plus event news entries `{kind:'ev', id, n, m, txt}` (they light the tab's ● too) |
| events (crew games) | Link: `evCheck`, `evParse`, `evEncode`, `evLink`, `evId`, `b64u`/`unb64u`, `hash32`, `rng` (mulberry32), `shuffle`. Fetch: `loadEvent(id, force)` (queued, one event at a time) → `evFetch`, `evTrim`. Score (pure): `evScore`, `starsAt`, `evResult`, `evBingo`/`bingoCard`/`sqTest`/`sqTicks`, `evTurf`, `evDare`, `evAfter`, `evPost`. Flow: `openEventCode`, `evStart`, `evRematch`, `evDareBack`, `bingoPool`, `cupEv`/`cupEnsure`/`loadCups`/`cupDue`. Views: `eventsHtml`, `evCardHtml`, `cupHtml`, `viewEvent`, `evBoardHtml`, `evBlitzHtml`, `evDuelHtml`, `evBingoHtml`, `evTurfHtml` + `mountEventMap`, `evDareHtml`, `evAnimate`, `evPodium`, `openEventCard`/`drawEventCard`, `trophies`/`trophyHtml`, `evDraftNew`/`evPreset`/`evFormHtml`/`evCreate` | **The link is the rulebook and iNaturalist is the referee**: `?ev=<base64url JSON>` (format in §9); every viewer fetches the same public records and scores them with the same pure functions, so there's no server. **Per refresh**: one v1 `taxonomy` for the whole roster in the window (names/ranks), then v2 `/observations` with `user_login=a,b,…` (comma list works, §7), `d1`/`d2`, `place_id`, `captive=false`, `fields=EV_FIELDS`, paged by `id_above`. **Once per player**: a `taxonomy` call with `d2` = the day before the event (their collection before it; kept for good, since it can't change once the event has started). Open bioblitz: one `observers` call per refresh finds the top 25 for the place and window. TTL 30 min (`EV_TTL`), ⟳ Refresh button, no refreshes once final. **What counts** (`evTrim`): observed in the window, uploaded (`created_at`) by `d2`+2 days, not captive, in the place. **Inked**: a current identification by someone who isn't a player, at or below the record's genus (`taxon.id` or its `ancestor_ids`; v2 identification ancestors exclude the taxon itself). Not reusing `community_taxon_id`: it's null when the only ID is the observer's (checked, §7), and a fellow player's agreeing ID would set it. Other records show **✏️ pencilled** points. A named species (dare) needs an outside ID at the species. **Final** at `d2` + 7 days (`EV_FINAL_DAYS`); before that "Provisional · final in N days". **Points** (`EV_POINTS`, §12): per distinct inked genus 3, +2 per ★ in the event's scope (`starsAt`, record-count tertiles like `rarityTier`, in the place if set, else the state carried in the link as `sc`), +5 new to the player's pre-event collection, +3 if no player had it, +2 for an inked ♂ and ♀, ×2 for bioblitz targets. Behaviour keywords score nothing except as bingo squares. **Bingo**: the creator's browser draws the pool (11 fixed challenge squares `SQ_FIXED` + 19 genera, 10 ★ / 7 ★★ / 2 ★★★, in season during the window by `peakInfo` where known) into the link; each card = 24 of them shuffled by `rng(hash32(seed + ':' + login))` + a free centre, so cards are identical on every device. Every square needs an inked record (genus at least); `q` ticks on the third distinct 25 km square of inked records. Line 10, blackout +50, first line of the event +5 (earliest completing record by observed date, upload date, id). **Turf**: each 0.25° square goes to the player with most inked genera there (ties: first to reach that count); obscured records don't claim squares; colours `turfColours` (hash into `TURF_COLS`, probing so a roster never shares one). **Payoffs** (`evAfter`, silent on the first read): lead changes (toast + event news + crew feed), turf takeovers/holdings, completed dares; changed scores count up once (`E.from` → `evAnimate`); the first read after the final date shows the podium (`#reveal` style) then the 1080×1350 result card (card kit). **Crew Cup**: a synthetic monthly event `cup:YYYY-MM` for you + the saved crew (no link), scored like a bioblitz; current and last month load when the Crew tab opens; last month's winner gets a 🏆 in the trophy cabinet (Profile) |
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
| boot / flows | `loadUser`, `updateUrl`, `copyLink`, `doSync`, `onboard`, `enterApp`, `startGuest`, `toast`, `settings`, event handlers, `PERSISTED`, `boot()` | `boot()` awaits `store.init()`, re-reads `PERSISTED`, then opens a cached user (and syncs quietly) or onboards `?u=`. `?ev=` is kept in `S.pendingEv` and opened by `enterApp` (before `vs`/`crew`); someone with no saved user who opens an event link becomes a guest. `updateUrl()` writes `ev` while an event with a link is open on the Crew tab (instead of `crew`) |

**UI event wiring**: one delegated `click` listener on `document` dispatches on data attributes, checked in this order:
`data-genus` (genus modal) · `data-close` · `data-tab` · `data-filter` · `data-layer` · `data-scan` · `data-base` (`lat|lng|label`) ·
`data-trip` (`lat|lng|area|label`) · `data-act` with its argument in `data-v`. Current actions:
`bountyGo bountyRefresh card cardPng cardShare clearBase crewAdd crewDel crewRefresh evBack evCancel evCard evCopy evCreate evDareBack
evDarePick evDel evMode evNew evOpen evPlaceClear evPlacePick evPreset evRefresh evRematch full geo guest ladderRefresh leadFilter lscope
lsort needsid newsDismiss peek reportRefresh sample sets share switch tripCase tripClear tripRefresh tripRetry vs wanted wantedRetry
wipe wrNext wrPrev wrYear wrapped wview`. Clicking the Crew tab button closes any open event. Because `data-tab` is checked before `data-layer`, a link that must switch tab **and**
view needs its own `data-act` (see `sets`, `needsid`, `bountyGo`).
Forms: `data-form` = `compare | crew | evDare | evPlace | placeSearch | tripSearch` (delegated `submit`). Prefs: `data-pref` on `change`; the trip
month select uses `data-tripm`. The event form keeps its state in `S.evDraft`: `data-evf` fields update it on `input` without redrawing
(so focus stays), toggles redraw on `change`; target checkboxes use `data-evt`. **Exception**: Leaflet popups stop click propagation, so popup buttons get direct `onclick`s.

## 6. State and storage

`S` (global): `login`, `u` (per-user save), `nodes` (taxon id → `{n,r,l,p}`), `places` (id → `{n,l}` admin level),
`info` (taxon id → `{p photo, s summary, w wiki, a attribution, c count}`), `ref` (`'p<place>'` or `'world'` →
`{ts, g:{genusId:count}, s:{speciesId:count}, t:familyTotal}`), `observers`, `pheno` (`'gid:place'` → `{ts, m:[12]}`),
`prefs`, `tab`, `M` (model), `cmp`, `ladder`, `crew`, `pioneer`, `report`, `haunts`, `trip`, `events`, `pendingVs`, `pendingCrew`, `pendingEv`,
`evOpen` (id of the open event), `evDraft` (the create form), `evBroken` (a malformed link was opened).

`S.events` (persisted key `events`, shared by every user of the browser): id (`'e' + hash of the link code`, or `cup:YYYY-MM`) →
`{id, code (the ?ev= payload; null for cups), ev (decoded), ts (last opened), at (last read), players (open events), pre {login: [genus ids
before the event]}, gone {login: true if no such user}, obs [{id, u login, d observed, c uploaded date, g genus, sp species, ink, inkS,
k 25 km square or null, a annotations, b behaviour keywords, ph first photo}], st {login: score} (last snapshot), lead, ink {login: {genus:
pts}}, turf {square: login}, from (scores to count up from, once), feed [{ts, txt}], res {rows:[{login, rank, val, pts, pencil}]}, final,
shown (podium seen), justFinal, dareWon, sig (cup roster)}`. Capped at 20 (`EV_KEEP`): finished ones go first (oldest end date), then
the least recently opened; the open one is never dropped.

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
haunts report trip events`. The owner's save is ~1 MB of JSON.

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
  names and subtitles (game flavour). Event screens explain what inked/pencilled and the points mean (it's what makes the numbers
  readable); keep those, and keep everything else plain.
- **Taxonomic care**: propose curated taxon lists to the owner; don't present them as settled. Check names against the live iNat tree.
- **Privacy**: ≥25 km squares only, no exact coordinates (bounty distances rounded to 5 km), home base rounded to ~0.01° and kept in
  the browser, trips kept in the browser. Share links carry only `?u=`, `?vs=`, `?crew=` (usernames) and `?ev=` (event links, below).
- **Event links** (v1.16): `?ev=<base64url(JSON)>`, ≤ ~1,500 characters, validated by `evCheck` (anything malformed shows only "This event
  link is broken"); every decoded string is `esc()`d. Fields: `v` 1 · `m` blitz|bingo|turf|duel|dare · `n` name ≤ 40 · `d1`/`d2`
  YYYY-MM-DD (≤ 92 days; a duel 1–3 days) · `p` optional iNat **place id** · `r` roster of 1–6 iNat logins (absent = open bioblitz) ·
  `s` seed · `sc` rarity-scope place id (a state; only when there's no `p`) · `t` bioblitz target genus ids (≤ 30) · `b` bingo pool
  codes · `q` dare target code. **Place ids are allowed in event links (owner-approved, 2026-10-05)**: a named park, LGA or region
  the creator picks from `/places/autocomplete`, never coordinates, and never filled in from the home base. Square codes: `g<id>`
  genus, `s<id>` species (dares), `n` new to you, `x` no player had it, `t` tribe new to you, `M`/`F`/`J` male/female/juvenile, `s`
  species-level ID, `q` three 25 km squares, `bf`/`bc`/`be` feeding / courtship / egg sac, retreat or moult (keyword or Evidence
  annotation). GoatCounter gets only `event-created` and `event-opened`, never names, usernames or places.
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
for (const id of Object.keys(S.events)) run('ev:'+id, ()=>{S.tab='crew'; S.evOpen=id; render();});
S.evOpen=null;
for (const m of ['blitz','bingo','turf','duel','dare']) run('evform:'+m, ()=>{S.tab='crew'; S.evDraft=evDraftNew(m); render();});
S.evDraft=null;
for (const [n,f] of [['genus',()=>openGenus(S.M.genera[0].id)],['case',()=>openCase(wantedList()[0].id)],['settings',settings],['card',openTitleCard],['wrapped',()=>openWrapped()],['evcard',()=>openEventCard(Object.keys(S.events).find(id => S.events[id].obs))]]) { run('modal:'+n,f); $('#modalRoot').innerHTML=''; }
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

**Awaiting the owner's decision (v1.16, crew games)**:
- **`EV_POINTS`** (starting values): per distinct inked genus 3 · +2 per ★ (scope: the place, else the link's state) · +5 new to your
  collection · +3 if no player had it before the event · +2 for an inked ♂ and ♀ of the genus · bioblitz targets ×2 · bingo line 10,
  blackout +50, first line of the event +5. Also: uploads count until `d2` + 2 days (`EV_LATE_UPLOAD`), standings final at `d2` + 7
  (`EV_FINAL_DAYS`), events ≤ 92 days, open bioblitz = top 25 observers, duel 1–3 calendar days.
- **Bingo pool mix**: 11 fixed challenge squares + 19 genera (10 ★, 7 ★★, 2 ★★★, `BINGO_TIERS`), drawn from the 2×+2 most-recorded
  candidates of each tier and preferring ones in season during the window (peak months from `peakInfo`; "too few records" counts as
  in season). Squares considered and left out: the Highlanders square (needs the 3D branch's elevations; add `h` when merged).
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
| v1.16 | Crew games (branch `feature/crew-games`, built on v1.13): event links (`?ev=`) scored from public iNat records with inked/pencilled IDs; 🏕 Bioblitz (roster or open, targets), 🎲 Spood Bingo, 🗺 Turf War, ⚔️ Duels, 🎯 Dares; 🏆 monthly Crew Cup; lead changes, count-ups, podium and result card, trophy cabinet, rematch / dare back; `events` storage |
| v1.15 | Field mode (branch `feature/field-mode`; see the note at the top) |
| v1.14 | 3D map (branch `feature/3d-map`; see the note at the top) |
| v1.13 | 🔑 Identification aid button (Needs ID view, Bounty board) opens the owner's genus key in one reused popup window |
| v1.12 | Removed ~50 filler captions, disclaimers and quips across the app |
| v1.11 | GoatCounter analytics (hand-rolled beacon, no usernames); Spood Report leads with picks of the week |
| v1.10 | Sets: Local specialties, Ghost list, Every species in a genus, Couples, Wanderers, Celebrities; Needs ID "open these on iNaturalist" links (follow the filter); weekly ladder table fits phones; guest wording on Needs ID; this handover rewrite |
