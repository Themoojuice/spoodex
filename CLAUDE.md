# SPOODEX

Gamified iNaturalist Salticidae collection: a single-file web app (`spoodex.html`), live on GitHub Pages.

**Before doing any work, read [HANDOVER.md](HANDOVER.md), at least §0.** It has setup from a fresh clone, the code map,
the state/storage model, verified iNaturalist API facts, test accounts, the owner's guardrails, a smoke test and the backlog.

Quick rules:
- Keep it one self-contained HTML file; all iNat calls go through the throttled `api()` helper.
- `esc()` every interpolated string; syntax-check the script with `node --check` after edits (command in HANDOVER.md §10).
- New field read by `trimObs` → add it to `OBS_FIELDS`. New persisted module-level `store.get` → add the key to `PERSISTED`.
- Naturalist aesthetic (no terminal/matrix look); rarity is "few iNat records" (never "conservation status"), say "on iNat" not "endemic";
  **no filler captions**: no quips, disclaimers or reassurances that don't help the user act (owner's explicit request);
  no exact coordinates, and never put locations in share links (event links may carry an iNat place id, never coordinates; HANDOVER §9).
  Propose hand-picked taxon lists to the owner rather than asserting them.
- Test via the `spoodex` preview server (port 8765; recreate `.claude/launch.json` from HANDOVER.md §2 if missing) with
  `?u=themoojuice` and `&vs=laz`. Check phone width (375 px) too.
- Ship: `cp index.html spoodex.html site/`, then `git commit`, then `git push` (Pages updates in ~30 s). Update HANDOVER.md in the same commit.
