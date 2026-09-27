# SPOODEX — architecture

> A living Pokédex built from the jumping spiders you've actually found.
> Your iNaturalist account is the save file. The game should make you close it and go spooding.

## Shape: one static file, no backend (v1)

`spoodex.html` is the whole app: HTML, CSS and JS in one file, plus Leaflet (cdnjs) for the map and
Google Fonts. It talks straight to the public iNaturalist API from the browser. No login, no server,
no build step. Host it anywhere static (GitHub Pages, Netlify), or serve it locally:

```
python -m http.server 8765   →   http://localhost:8765/spoodex.html
```

(Opening it via `file://` works in most browsers. Some sandboxed previews block localStorage.)

```
┌────────────┐   ┌───────────────┐   ┌──────────────┐   ┌───────────┐
│ api        │ → │ sync          │ → │ model        │ → │ views     │
│ throttled  │   │ full import + │   │ pure derive: │   │ Profile   │
│ 1 req/s,   │   │ updated_since │   │ genera,      │   │ SPOODEX   │
│ 429 backoff│   │ incremental;  │   │ states, XP,  │   │ Tree      │
└────────────┘   │ trims obs →   │   │ mastery,     │   │ Map/scan  │
                 │ localStorage  │   │ quests       │   │ Quests    │
                 └───────────────┘   └──────────────┘   └───────────┘
```

### iNaturalist calls (all public and read-only)

| Purpose | Endpoint | When |
|---|---|---|
| User's salticids | `/v1/observations?taxon_id=48139&user_login=X&per_page=200&order_by=id&id_above=…` | First import. After that, `&updated_since=lastSync` |
| Names/ranks of every ancestor | `/v1/observations/taxonomy?taxon_id=48139&user_login=X` | Each sync (1 call) |
| Denominator ("53 / 80 in Australia") | `/v1/observations/taxonomy?taxon_id=48139&place_id=P&verifiable=true` | Weekly per scope (country/state/world) |
| Nearby undiscovered genera | `/v1/observations/taxonomy?…&lat&lng&radius=25` | On demand ("scan") |
| Portraits + natural-history blurb | `/v1/taxa/{30 ids}` (default photo + Wikipedia summary) | Background, cached |
| Observer-based rarity | `/v1/observations/observers?taxon_id=G&place_id=P` | On genus page open, cached |
| Region names | `/v1/places/{ids}` | For new place ids only |

The `observations/taxonomy` endpoint is the key trick. One call returns the whole Salticidae tree
(subfamily › tribe › subtribe › genus) with record counts for any user, place or radius. So the
denominators, the lineage tree and the nearby scanner cost one request each.

A first import for a user with ~1,500 salticid observations is about 20 requests (~25 s). Later syncs
are usually 3 requests. A full resync runs automatically every 14 days, because incremental sync
can't see deletions or records re-identified out of Salticidae.

## Game rules (as implemented)

**Collectible unit = genus.** Each observation's `taxon.ancestor_ids` is intersected with nodes of
rank `genus`. Species are kept as secondary stats and never drive progression.

**Discovery states**
- **Unknown**: a blurred glimpse of iNat's default photo and `???`, numbered in taxonomic order.
- **Glimpsed**: an observation stuck above genus (Salticidae, Euophryini, …). These are shown as
  "something is lurking" leads and as 👁 markers on the lineage tree.
- **Discovered**: the observation taxon is at or below genus.
- **Supported**: the *community taxon* falls within the genus. This comes from `community_taxon_id`
  resolved through the identification's ancestry, not from Research Grade. The UI keeps
  "your ID" separate from "community-supported".
- **Mastered**: 7 of 10 naturalist criteria:
  ♂, ♀, juvenile (iNat annotations) · feeding, courtship/display, silk & brood (keywords in the
  description, tags and observation fields, plus Evidence annotations) · 3+ localities (~10 km grid) ·
  3+ months · community-supported · a species-level ID.

**Level = genus count.** XP is secondary and rewards sampling breadth, not repetition: new genus 100,
behaviour 80, new species 60, community support 50, new sex/juvenile/locality 40, new month 20, and
plain duplicates give diminishing returns (10, 5, 3, …).

**Chassis evolution** (the UI reskins itself: kraft field notebook → herbarium field guide → walnut-and-brass museum cabinet):
0 Mk 0 · 5 Field Notebook (map + scanner) · 15 Mk II (region stats) · 30 Mk III (lineage tree) ·
50 Naturalist Cabinet (rarity ledgers) · 75 Arachnologist Rig (XP ledger) · 100 Research Station.
Locked modules show a plate with a "peek" override for prototyping.

**Rarity is labelled honestly**: your encounter rate · iNat record frequency in scope (tertiles) ·
number of *observers* who have recorded the genus. Counting observers means one enthusiast with
900 photos can't make a genus look common. None of these is conservation status.

**Quests** are generated from real gaps and check themselves on every sync: Genus Hunt (nearby
scan), Unexplored Lineage (a tribe with zero finds), Something Is Lurking (resolve above-genus
records), Towards Mastery, Behaviour, Off-Season (a month you've never recorded), Change of Scenery
(new 25 km square), The Other Half (the missing sex). One quest per day is the seeded "field quest".

**Streaks** count consecutive *field days* that produced a new genus. Calendar days don't matter.

**Privacy**: the map uses 25 km squares only. Obscured records are already coarse in the public API.
The scanner aggregates by genus and never shows coordinates.

## Known limits of v1
- Behaviour detection is keyword-based. It will miss unlabelled behaviour and occasionally
  false-positive.
- There is no habitat data in iNat, so habitat collections ("Bark runners", "Leaf-litter spoods")
  need a curated genus→guild table. That's the next content task and wants expert curation, not
  guessing.
- The lineage tree is iNat's classification, not a dated phylogeny.
- localStorage holds ~1 MB per 1,500 observations. Move to IndexedDB past ~5,000.

## Roadmap
1. **v1.1 content**: a curated `guilds.json` (habitat/ecology sets), per-genus field notes and
   diagnostic clues, Australian genus checklist as an optional denominator (beyond "on iNat").
2. **v2 split into a small codebase** once the single file passes ~2,000 lines: Vite + TypeScript,
   same four layers as modules, IndexedDB via `idb`, a service worker for offline field use (PWA).
3. **v3 optional backend** (only for social features): a tiny serverless function + KV store that
   records `{login, genusIds[]}` per opted-in player. That enables "0.7% of SPOODEX players have
   Huntiglennia", public profiles and leaderboards by region. iNat OAuth is only needed for private
   coordinates or writing back (e.g. adding annotations from inside SPOODEX).
