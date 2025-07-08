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

## Windy plugin

This repository contains a Windy plugin in `knmi-windy-plugin`. To build and upload it manually:

```bash
cd knmi-windy-plugin
npm install
npm run build  # outputs to knmi-windy-plugin/dist/

cd dist
commit_sha=$(git rev-parse HEAD)
printf '{"repositoryName":"artis-byte/NL-solar","commitSha":"%s","repositoryOwner":"artis-byte"}\n' "$commit_sha" > /tmp/plugin-info.json
mv plugin.json /tmp/orig-plugin.json
jq -s '.[0] * .[1]' /tmp/orig-plugin.json /tmp/plugin-info.json > plugin.json

tar cf ../plugin.tar .

curl -X POST 'https://node.windy.com/plugins/v1.0/upload' \
     -H "x-windy-api-key: $WINDY_API_KEY" \
     -F "plugin_archive=@../plugin.tar"
```

The built plugin files are also committed under `docs/` so they can be loaded by Windy at:

```
https://raw.githubusercontent.com/artis-byte/NL-solar/main/docs/plugin.js
```
You can also run `./publish_plugin.sh` to automate these steps.
