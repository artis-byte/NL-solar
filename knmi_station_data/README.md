# KNMI Station Metrics Export

This helper script downloads the most recent 10-minute observations from the
KNMI Open Data platform (dataset `10-minute-in-situ-meteorological-observations`,
version `1.0`) and writes a CSV file with the `qg` (global solar radiation mean)
and wind direction/speed aggregates the project depends on.

## Usage

```bash
python knmi_station_data/fetch_station_metrics.py
```

- API key: the script embeds a KNMI Data Platform key by default, so you can run
  it without passing flags. Update the `API_KEY` constant inside the file if you
  need to use different credentials. The script automatically prepends `Bearer`
  to the value if it is missing, matching KNMI's required authorization header.
- Output: adjust `DEFAULT_OUTPUT` in the script to change the CSV path. The script
  creates the output folder if it does not exist and prints how many
  stations were exported.

The resulting CSV contains one row per station with the following columns:

`station`, `source_filename`, `latitude`, `longitude`,
`qg`, `dd`, `dn`, `dx`, `dsd`, `dr`, `ff`, `ffs`, `fsd`, `fx`, `fxs`, `gff`, `gffs`.

## Mapping utilities

Convert the CSV to GeoJSON and render an interactive Leaflet map (requires `folium`):

```bash
pip install folium  # once per environment
python knmi_station_data/build_station_map.py  # uses the default CSV output
```

This writes the following artifacts to `knmi_station_data/`:

- `station_metrics.geojson`: point features for each station with the latest metrics
- `station_metrics_map.html`: Leaflet map with clustered markers and popups listing the metrics
