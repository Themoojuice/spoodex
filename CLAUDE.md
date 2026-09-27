# SPOODEX

Gamified iNaturalist Salticidae collection: a single-file web app (`spoodex.html`), live on GitHub Pages.

**Before doing any work, read [HANDOVER.md](HANDOVER.md).** It has the code map, state/storage model,
verified iNaturalist API facts, test accounts, the owner's design guardrails, and the spec for the
next task (regional ladder + envy engine).

Quick rules:
- Keep it one self-contained HTML file; all iNat calls go through the throttled `api()` helper.
- `esc()` every interpolated string; syntax-check the script with `node --check` after edits (command in HANDOVER.md §8).
- Naturalist aesthetic (no terminal/matrix look); honest rarity labels (never "conservation status");
  no exact coordinates, and never put locations in share links.
- Test via the `spoodex` preview server (port 8765) with `?u=themoojuice` and `&vs=laz`.
- Ship: `cp index.html spoodex.html site/`, then `git commit`, then `git push` (Pages updates in ~30 s).
