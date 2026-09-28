# SPOODEX

A living Pokédex built from the jumping spiders (Salticidae) you have actually found.
Enter an iNaturalist username; SPOODEX reads the public records, collapses them to genus,
and turns them into a collection, a lineage tree, a nearby-genus scanner and quests.

- **Share a profile:** `spoodex.html?u=<inat_login>`
- **Share a comparison:** `spoodex.html?u=<you>&vs=<them>`
- **No records yet?** Choose "Explore near me" and set a home base to see what lives around you.
- **Going somewhere?** The Trip planner shows what you'd add at any destination, what's in season, and where the records are.

Single static file, no backend, public read-only iNaturalist API. Anonymous visit counts via [GoatCounter](https://www.goatcounter.com) (no cookies; usernames and locations are never sent). See [ARCHITECTURE.md](ARCHITECTURE.md).

Run locally: `python -m http.server 8765` then open http://localhost:8765/
