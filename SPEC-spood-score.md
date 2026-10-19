# Spood score: finding the high-value spoods SPOODEX misses

Status: **Proposal A built in v2.10** (2026-10-20, not shipped yet): SPOODEX › 🏅 Best finds, the score sheet, Mystery spoods sorting and the genus page's best finds. Proposal B and §7 steps 5–6 are not built. The prototype is `tools/spood_score.py` (same rules as the app).

## 1. The short answer

**Doable? Kinda-sorta, leaning yes.** No API field says "this is an undescribed species". But iNat holds a lot of indirect evidence,
and when you combine it, the high-value records rise to the top. The prototype found them in the owner's 1,585 records with about 20 API calls:

| Score | Record | Why (each reason comes from a named field) |
|---|---|---|
| 84 | *Phintella bifurcilinea* | 1 iNat record of it in Australia; the notes say "undescribed" |
| 84 | Euophryini | experienced identifiers left it at tribe; notes say "new species" |
| 83 | *Opisthoncus* | an experienced identifier stopped at genus; a comment says "probably undescribed" |
| 82 | *Psenuc courti* | 3 iNat records in Australia; specimen collected "in case it is an undescribed species" |
| 77 | *Maratus* | an experienced identifier stopped at *Maratus*, where only 6% of records stop |
| 76 | *Apricia* | an experienced identifier stopped at *Apricia*, where only 2% of records stop |

The last two rows matter most. They contain no keyword: the score found them only because the ID stopped where IDs almost never stop.
That is the "secret spood" signal you asked for.

A score out of 100 can't be *objectively* right, and it shouldn't pretend to be. It can be **consistent, explainable and tunable**,
and that's enough for sorting someone's records from most to least amazing.

## 2. Signals: what the API can tell us (brainstorm, with what was checked)

✅ = checked on live data on 2026-10-20 · 🔸 = feasible but untested · ✖ = not possible from the app

**The undescribed or unplaceable spood ("secret")**
- ✅ **Stuck-ratio surprise.** One `/v1/observations/taxonomy` call per region returns `direct_obs_count` (records stopped at exactly
  that taxon) next to `descendant_obs_count`. That gives each genus's normal stop rate: *Simaethula* 99% stop at genus, *Cytaea* 58%,
  *Cosmophasis* 29%, *Maratus* 6%. A genus-level record of a genus whose records usually reach species is a surprise.
- ✅ **An experienced identifier stopped there.** One `/v1/observations/identifiers` call gives the top 50 salticid identifiers for the
  region. If one of them has a current ID at genus, the record isn't "nobody has looked yet". It means "someone who knows looked and
  couldn't go further". 374 of the owner's genus-level records have this; 178 of those are *Cytaea*, which is why it's weighted by the surprise.
- ✅ **Words in the notes.** Description, ID remarks and comments (`comments:(body)` on v2, 1 call per 100 records that have comments):
  "undescribed", "new species", "sp. nov", "unnamed", "morphospecies". A weaker list ("never seen", "first record", "range extension")
  marks a surprise. Found 15+ such records for the owner, several written by other identifiers.
- ✅ **Experts left it above genus.** A Salticinae or Euophryini record that experienced identifiers have looked at, but none could place.
- 🔸 **Old and still unplaced.** Record age vs. number of identifiers: years old with 4 IDs and still at tribe is a puzzle, not a backlog.
- 🔸 **Observation fields**: other users fill in "Morphospecies", "Specimen collected", "Voucher". The owner uses none (checked).
- 🔸 **Projects**: membership in undescribed-species or museum projects (needs a check of v2 `project_observations`).

**Rare and unusual (the parts the app already half-knows)**
- ✅ Records of the taxon in the region (as in the rarity tiers): *Phintella bifurcilinea* 1, *Maddisonia whytei* 1, *Simaethula auronitens* 1.
- 🔸 Unusual lineage: anything outside Salticinae (Spartaeinae, Lyssomaninae…), as in the "Beyond Salticinae" set.
- 🔸 Out of place: no other record of the taxon in its 25 km square or within 100 km (the map grid tile the app already reads; only for the top ~50 candidates, to save calls).
- 🔸 Out of season: observed outside the genus's peak months (`peakInfo`, already cached). Out of range up: above the genus's usual height (the app already has `S.elev`).

**What the record shows ("story")**
- ✅ Annotations: male (worth most), female, adult, Evidence (egg sac, moult, retreat). 🔸 Behaviour keywords (`BEH_RX` already exists). Photo count ≥ 4, research grade.

**Other people noticing ("notice")**
- ✅ Faves, comments from others and the number of people who identified it. Weak on its own (the owner's most-faved record has 4)
  but useful as a tie-breaker. Faves measure photos and popularity, and the owner picks `OWNER_PICKS` by eye, never by faves, so this signal stays small.

**Disagreement ("puzzle")**
- ✅ `num_identification_disagreements` (27 of the owner's records).

**Ruled out**
- ✖ iNat's computer vision ("does this look like anything known?") needs a signed-in token: fine in a private script, not in a public app.
- ✖ Comparing photos to find look-alike clusters (needs image processing, not just API calls).
- ✖ An AI reading the notes: costs money per record, needs the server, and conflicts with "nothing invented".

## 3. Proposal A: a transparent Spood score (recommended)

Five parts, each from 0 to 1, weighted to a raw total out of 100, then put on a display curve:

| Part | Weight | Built from |
|---|---|---|
| **Secret** | 30 | stuck-ratio surprise × experienced-identifier stop; secret words (1.0); surprise words (0.5); experts left it above genus (0.45) |
| **Rare** | 30 | `1 − log10(records in region) / 3.5` for species and genus; a strong secret stands in for rarity above species (an unnamed species has few records) |
| **Story** | 15 | male 0.3, female 0.15, adult 0.1, Evidence 0.3, ≥ 4 photos 0.15, research grade 0.2 (capped at 1) |
| **Notice** | 15 | 0.25 per fave + 0.15 per comment from others + 0.05 per other identifier (capped) |
| **Puzzle** | 10 | disagreeing IDs, 2 or more = full |

`score = round(100 × (1 − e^(−raw / 40)))`. The curve keeps everyday records low and lets the best few percent reach the 80s.
For the owner: twelve records in the 80s, 41 at 70 or more, most in the 20s and 30s, captive records 0.

- **Same numbers for everyone.** Rarity uses a fixed region (the viewer's state, as the rarity tiers do), so Compare and Crew can rank
  two people's best finds fairly. Scores are computed in the browser from public data; nothing new is stored on the server.
- **Always explained.** Tapping a score opens its breakdown: five bars and the reasons, each from a named field, with a link to the
  record. A number with no reasons would break "nothing invented".
- **Pros**: cheap, offline once fetched, auditable, no training. **Cons**: the weights are the owner's taste baked in; keyword matching
  can't read sarcasm ("not undescribed, just blurry" would count).

## 4. Proposal B: a score trained on your taste ("Which is cooler?")

Same signals, but the weights are learned. The app shows two of your records side by side and you tap the better one.
After ~25 picks, a small Bradley-Terry / logistic fit over the score parts learns your weights. Only five numbers to learn, so few picks
are needed, and it runs in plain JS with no server. Your weights stay in `S.prefs`. Your view is sorted by your taste, while
social views keep using the shared default.

- **Pros**: it truly is "high value to *you*"; it's fun (a game loop of its own); the duel picks also give us data to tune the default.
- **Cons**: more UI; scores drift as you pick; two people's personal scores can't be compared, so social views need Proposal A anyway.

(Plain Elo on single records doesn't work here: it ranks only records you've seen in duels and says nothing about new ones.
Learning *weights* is what makes it generalise.)

## 5. My opinion

Build **A first, then add B as a tuning layer later**, not as an alternative. Reasons:

1. The prototype shows A already works: its top 20 is almost all real "secret spoods" (undescribed, unplaced, or stopped where IDs
   never stop), which is exactly the gap the owner described. That is the high-value part. The 0–100 number is a by-product.
2. Explanations matter more than precision. "77: an experienced identifier stopped at *Maratus*, where only 6% of records stop" is a fact the owner
   can check and act on (chase a species ID, collect a specimen, email a taxonomist). An opaque score is not.
3. Subjectivity is handled in two cheap steps: first presets for the weights (Taxonomist / Photographer / Storyteller), then the duels from B.

What I'd keep away from: claiming a record **is** undescribed. The wording should say what the data shows ("an experienced identifier
stopped at genus"; "notes say 'undescribed'"), as the rarity wording already does.

## 6. Spec sheet (Proposal A in the app)

**Name**: "Spood score" (working name; the owner picks). Shown as a small round stamp with the number, coloured by band
(≥ 80, 60–79, 40–59, < 40) using the rarity palette so it fits the naturalist look.

**Where it shows**
- Genus page, each record row: the stamp.
- **SPOODEX › 🏅 Best finds** (a new layer, after ❓ Mystery spoods): every record sorted by score, photo, stamp, the top reason,
  and a filter for "secret only" (secret part ≥ 0.6, `SECRET_MIN`). Sort by score, date, or genus. The owner's main ask.
- Mystery spoods tiles: the stamp, plus a "secret spoods first" sort (the high-value Needs ID records are the ones worth chasing).
- Compare / Crew: each player's top 5 side by side. Wrapped: "your best find this year".
- Tap a stamp → a breakdown sheet: five bars, the reasons, "Open on iNaturalist ↗".
- The new layer is a layout change → one `CHANGES` line.

**Data** (all public, all through `api()`)
| Need | Call | Cost | Cache |
|---|---|---|---|
| `faves_count`, `comments_count`, `num_identification_disagreements`, identifications `current`, `body`, `user:(login)` | add to `OBS_FIELDS` (`trimObs` reads them) | 0 extra on import; the records get a little larger | with the records |
| Faves, comments and IDs change without a new record | v2 `/observations?id=…&fields=(score fields only)` | 1 per 200 records | 7 days |
| Comment text | v2 `comments:(body,user:(login))` for records with comments | 1 per 100 such records (owner: 3) | 7 days |
| Stop rate per genus | keep `direct_obs_count` from the region taxonomy tree the app already fetches | 0 | as today |
| Experienced identifiers | v1 `/observations/identifiers?taxon_id=48139&place_id=<state>&per_page=50` | 1 | 30 days |

For the owner, about 15 calls in total on first open, then nothing for a week.

**Code** (in `spoodex.html`, model section): `SCORE_W`, `SECRET_RX`, `ODD_RX`, `SCORE_CURVE`, `spoodScore(rec, ctx) → {s, parts, why[]}` (pure),
`loadScoreData(redraw)`, `scoreStamp(s)`, `scoreSheet(rec)`, `viewBestFinds`. New `trimObs` fields → `OBS_FIELDS`; new persisted keys → `PERSISTED`.
`esc()` every reason (they quote comment words). How it works (`howTo`) explains the five parts from `SCORE_W`, so the explanation can't drift from the weights.

**Guardrails**
- Wording: "few iNat records", never conservation status; never "new species" as a claim, only as a quote from the notes.
- Privacy: no coordinates. The out-of-place signal reports squares only.
- No filler captions on the breakdown: only the reasons and what to do next.

## 7. Implementation plan

1. **Owner review of the prototype** (now): run `python tools/spood_score.py` (add `--csv scores.csv` for the full list), then mark any
   record ranked too high or too low. Tune `W`, the word lists and `CURVE` until the top 30 match your judgement. Try `laz` too.
2. **Data plumbing**: the new fields in `OBS_FIELDS`/`trimObs`, `direct_obs_count` kept in the region tree, the identifiers call,
   and the 7-day refresh. Check the payload size on a fresh import of the owner's records.
3. **`spoodScore` + breakdown sheet + stamp on the genus page.** Smoke test against the prototype's numbers (they should match).
4. **🏅 Best finds layer** + Mystery spoods sort + `CHANGES` line. Test at 375 px.
5. **Social**: Compare/Crew top 5, Wrapped line.
6. **Later**: the out-of-place / out-of-season / elevation signals (top 50 candidates only); weight presets; then Proposal B's duels.

## 8. Open questions for the owner

- Do the prototype's top 30 match your own sense of your best spoods? Which are wrong, and why?
- Is "experienced identifier" right as the top 50 for the state, or should you hand-pick a list of trusted salticid identifiers?
- Should your own description count as much as someone else's comment saying "undescribed"?
- Should captive records be scored at all (bred-out undescribed species are high value too), or stay at 0?
- Name: Spood score, Find score, or something else?
