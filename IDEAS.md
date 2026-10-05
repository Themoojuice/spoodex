# SPOODEX ideas

Ideas noted while building, for the owner to pick from later. None of these is built or promised; each has a rough cost and the reason it came up.

## From the v1.17 Map & scanner build (2026-10-06)

**Weather**
- **Tap a day for its hours.** The stripe already scores every daylight hour; a tap could list them ("10 am · 26° · sunny · 0.98") so you can see why a window starts or stops. No extra calls.
- **Weather for the scan, not just home.** The Atherton Tablelands run several degrees cooler than Cairns, so home's forecast misleads for a scan up there. One Open-Meteo call per scanned 0.1° cell would put "this week here" at the top of the scan panel.
- **Humidity in the rebound rules.** Open-Meteo also has `relative_humidity_2m`; warm, humid mornings after rain are when insects (and so salticids) are busiest. One more field, one more rule in `WX.rebound`.
- **Too much rain.** A 100 mm deluge probably isn't a rebound; a cap or a penalty above a heavy-rain threshold would stop flood days scoring as "after rain".

**Map**
- **Scan exactly a grid square.** Tapping a coloured square could offer "scan this square" snapped to the 0.25° grid, so the scan matches the square's outline exactly instead of a square centred on the tap.
- **A "frontier" layer.** Shade squares by how few salticid records *anyone* has there: the places where a first record (and a pioneer badge) is most likely. One `taxonomy` call per square in view, or a coarse grid from a single bounding-box query.
- **Recent scans as chips.** Keep the last five scans and show them as one-tap chips above the panel, so you can flip between two areas you're deciding between. Stored in the browser like the current scan.
- **2D parity.** The 2D (Leaflet) map still shows your squares by count; it could get the rarity squares and the layer switches too, for phones without WebGL2.
- **Sort the scan list.** Rarest first is the default; "in season first" and "most records first" would help on a 100 km scan with dozens of new genera.

**Rarity**
- **One rarity language everywhere.** The six coloured tiers now live on the map and in the scanner, while cards, sets, Compare and prestige still use ★1–3. Moving everything to tiers (with prestige weighted by tier) would make the app read as one system; it changes the prestige numbers people already know, so it's the owner's call.
- **A floor for Legendary.** A genus with one stray record just across a state border counts as Legendary here; requiring a few records anywhere on iNat would keep the orange for genuinely rare finds.

**Elsewhere**
- **Trips with dates.** Now that the weather rates whole days, a trip with dates (rather than a month) could show the same day cards for the destination, when the dates are within the 7-day forecast.
- **A scan as a Bounty board filter.** "Needs ID records in this square" would turn a scan into a to-do list for IDs, using the same bounding box.
