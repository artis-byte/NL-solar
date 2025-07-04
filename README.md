# NL-solar

This repository contains a dataset of Dutch solar parks and a helper script to look up their coordinates via OpenStreetMap's Nominatim API.

## Files

- `solar_parks.csv` – list of Dutch solar parks with capacity information
- `fetch_coordinates.py` – script that appends latitude and longitude to the CSV

## Installation

Install the required dependency:

```bash
pip install requests
```

## Usage

Run the script:

```bash
python fetch_coordinates.py
```

By default the script reads `solar_parks.csv` and creates `solar_parks_with_coords.csv` containing latitude/longitude columns. You can specify custom input and output files:

```bash
python fetch_coordinates.py input.csv output.csv
```