# SPOODEX

Gamified iNaturalist Salticidae collection: a web app (`spoodex.html`), live on GitHub Pages, installable and offline-capable
via two approved sidecars (`sw.js`, `manifest.webmanifest`) plus `icon-192.png`/`icon-512.png` and (v2.7) `og.png`, the link-preview image, built by `tools/og.py`.
Since v2.8 there is also a small server in `server/` (a Cloudflare Worker; `node server/dev.mjs` runs it locally on port 8787).

**Before doing any work, read [HANDOVER.md](HANDOVER.md), at least §0.** It has setup from a fresh clone, the code map,
the state/storage model, verified iNaturalist API facts, test accounts, the owner's guardrails, a smoke test and the backlog.

Quick rules:
- App code stays in `spoodex.html` (more files and the server are allowed since v2.8, owner 2026-10-13); all iNat calls go through the throttled `api()` helper.
- Keep the layout stable: when a section, view or button moves or changes, add a line to `CHANGES` (HANDOVER §9).
- `esc()` every interpolated string; syntax-check the script with `node --check` after edits (command in HANDOVER.md §10).
- New field read by `trimObs` → add it to `OBS_FIELDS`. New persisted module-level `store.get` → add the key to `PERSISTED`.
- Naturalist aesthetic (no terminal/matrix look); rarity is "few iNat records" (never "conservation status"), say "on iNat" not "endemic";
  **no filler captions**: no quips, disclaimers or reassurances that don't help the user act (owner's explicit request);
  no exact coordinates, and never put locations in share links (event links may carry an iNat place id, never coordinates; HANDOVER §9);
  field mode's live position never leaves memory.
  Propose hand-picked taxon lists to the owner rather than asserting them.
  Other people's photos only under CC0 / CC BY / CC BY-NC, credited and linked; prefer the owner's own (`themoojuice`).
- Test via the `spoodex` preview server (port 8765; recreate `.claude/launch.json` from HANDOVER.md §2 if missing) with
  `?u=themoojuice` and `&vs=laz`. Check phone width (375 px) too.
- Ship: bump `VERSION` in `sw.js`, `cp index.html spoodex.html sw.js manifest.webmanifest icon-192.png icon-512.png og.png site/`, then `git commit`,
  then `git push` (Pages updates in ~30 s). Update HANDOVER.md in the same commit.
