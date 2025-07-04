Mission: starting from parks.csv (names + capacities), produce two GeoJSON files—parks.geojson (point layer) and regions_capacity.geojson (10‑region polygons with summed MWp)—and publish them in a form that Windy.com can display and drill into.



🎯 End‑state

Artefact

Where it lives

What Windy shows

parks.geojson

GitHub ➜ Raw URL OR bundled inside plugin

Clicking a point reveals park name + capacity.

regions_capacity.geojson

GitHub ➜ Raw URL OR bundled

Coloured regions; popup lists total MWp + park count and links to drill‑down.

windy-plugin-nlsolar.zip

Releases/./plugin

Loads both layers; when a region is clicked the region layer hides and only its parks show (↩︎ Back button restores).



🗺  Workflow graph

graph TD
    A[parks.csv] -->|clean names| B(geocode.py)
    B --> C{Nominatim}
    C -->|ok| D[parks_geocoded.csv]
    C -->|no match| E[manual_review.csv]
    D --> F[parks.geojson]
    D --> G{spatial join to regions_10.geojson}
    G --> H[regions_capacity.geojson]
    F & H --> I[Windy uploader *or* plugin]
    I --> J[Interactive map]



🛠  Agent tasks (chronological)

#

Responsible

Script / Action

Output

1

geocode.py

Read data/parks.csv, call Nominatim (1 req/s), cache results locally (sqlite).

data/parks_geocoded.csv status ∈ {OK, NO_MATCH, MULTIPLE}.

2

Human‑in‑loop (optional)

Open NO_MATCH lines, fix typos or add lat/lon manually.

Updated parks_geocoded.csv.

3

geocode.py --export-geojson

Convert CSV → GeoJSON points.

parks.geojson.

4

regions.py

Spatial‑join points to data/regions_10.geojson, sum MWp, write polygon layer.

regions_capacity.geojson.

5a

Quick demo

Drag both GeoJSONs onto https://windy.com/uploader.

Public Windy share‑link.

5b

Production

Build windy-plugin-nlsolar (fork of windy-plugin-template) that loads layers from GitHub raw URLs, toggles on click.

plugin/windy-plugin-nlsolar.zip.

6

GitHub Action

Nightly cron: rerun Steps 1–4 with latest CSV, commit changed artefacts, trigger plugin rebuild.

Always‑fresh map.



🔑 Nominatim guidelines (must‑follow)

Unique User‑Agent; configure via --user-agent CLI flag or OSM_UA env var.

≥ 1 second between requests (--sleep flag; default 1.1 s).

Heavy use → self‑host: https://nominatim.org/release-docs/latest/admin/.



🪜 Setup commands (local dev)

# 1. install deps
pip install -r requirements.txt

# 2. geocode (idempotent, cached)
python src/geocode.py --csv data/parks.csv --sleep 1.1 \
       --user-agent "nl-solar-dev/0.1 (me@example.com)"

# 3. summarise per region
python src/regions.py --parks data/parks_geocoded.csv \
                      --regions data/regions_10.geojson

# 4. open Windy uploader – drop parks.geojson + regions_capacity.geojson



💡 Extending the agent

Footprints instead of points – replace centroids with polygons from OSM or BAG; regions.py still works.

Additional metrics – add year, developer to CSV; GeoJSON inherits properties automatically.

CI badge – show last geocode run status in README.

Windy colour ramp – in plugin, style polygons by MWp (d3.scaleQuantize).



📝 File glossary

Path

Purpose

data/parks.csv

Source list, 2 cols: name,capacity_mwp.

data/regions_10.geojson

Custom regional boundaries in EPSG 4326.

data/nominatim_cache.sqlite

On‑disk cache of API hits (speed + politeness).

parks.geojson

Point FeatureCollection.

regions_capacity.geojson

Polygon FeatureCollection.

plugin/

Windy plugin scaffold.

