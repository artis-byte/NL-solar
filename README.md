# NL-solar

This repository contains a small dataset of Dutch solar parks and scripts to generate GeoJSON layers for use with Windy.com.

## Files

- `data/parks.csv` – list of Dutch solar parks with capacity information
- `src/geocode.py` – geocode parks via OpenStreetMap and cache the results
- `src/regions.py` – aggregate capacities per 10 regions

## Installation

```bash
pip install -r requirements.txt
```

## Usage

1. Geocode the park list (adds latitude/longitude columns and caches queries):

```bash
python src/geocode.py --csv data/parks.csv --output data/parks_geocoded.csv \
       --user-agent "nl-solar-dev/0.1 (me@example.com)" --sleep 1.1 \
       --export-geojson parks.geojson
```

2. Summarise capacity per region and write a polygon GeoJSON file:

```bash
python src/regions.py --parks data/parks_geocoded.csv \
                      --regions data/regions_10.geojson \
                      --output regions_capacity.geojson
```

The generated `parks.geojson` and `regions_capacity.geojson` can be uploaded to the [Windy uploader](https://windy.com/uploader) for visualisation.

The geocoding script stores responses in `data/nominatim_cache.sqlite` so that reruns are faster and gentler on the API. This cache file is ignored by Git.

## Hosting QG GeoJSON for Windy

The `knmi_qg_regions.py` script writes its outputs to the `docs/` folder by
default. Enabling GitHub Pages for this repository exposes files in `docs/` at a
predictable URL such as:

```
https://<username>.github.io/NL-solar/qg_regions.geojson
```

Configure your Windy plugin to load the GeoJSON from that URL so it always has
the latest data.
