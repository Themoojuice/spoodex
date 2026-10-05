# SPOODEX

A living Pokédex built from the jumping spiders (Salticidae) you have actually found.
Enter an iNaturalist username; SPOODEX reads the public records, collapses them to genus,
and turns them into a collection, a lineage tree, a nearby-genus scanner and quests.

- **Share a profile:** `spoodex.html?u=<inat_login>`
- **Share a comparison:** `spoodex.html?u=<you>&vs=<them>`
- **No records yet?** Choose "Explore near me" and set a home base to see what lives around you.
- **Going somewhere?** The Trip planner shows what you'd add at any destination, what's in season, and where the records are.
- **In the field:** the Map tab lists this week's best spooding hours near home; 🧭 Field points you at the nearest recent records of genera you're missing. Install it from Settings to use it offline.
- **Play with friends:** the Crew tab makes bioblitzes, Spood Bingo, turf wars, duels and dares. The link carries the rules, and everyone's browser scores the same public iNaturalist records, so there's no server and no sign-up.

Single static file (plus a service worker and manifest for offline use), no backend, public read-only iNaturalist API. Anonymous visit counts via [GoatCounter](https://www.goatcounter.com) (no cookies; usernames and locations are never sent). Weather by [Open-Meteo](https://open-meteo.com/) (CC BY 4.0), sent only your home base rounded to ~10 km. See [ARCHITECTURE.md](ARCHITECTURE.md).

Run locally: `python -m http.server 8765` then open http://localhost:8765/
