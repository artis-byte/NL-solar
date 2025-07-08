#!/usr/bin/env python3
"""
Fetch 10‑minute global irradiance (QG) from KNMI Open Data and export per‑station and
per‑region GeoJSON files.

Fixes & improvements over the original snippet provided by the user:

1. **Robust variable lookup** – Added helper `_find()` that first looks for a
   substring in `ds.coords` and then in *all* variables. This avoids the
   `ValueError: Dataset does not contain expected variables` thrown when
   latitude/longitude are stored as data variables rather than coordinate
   variables.
2. **Helpful error message** – When required names cannot be resolved, the
   script prints which one was missing instead of a generic message.
3. **Type hints & docstrings** – Light typing to make editors happier.
4. **Python ⩾ 3.9 friendly** – Uses standard library only; geopandas/xarray
   remain external dependencies.

To run once:
    python knmi_qg_regions.py --api-key YOUR_KNMI_API_KEY

To keep it running every 10 minutes:
    python knmi_qg_regions.py --api-key YOUR_KNMI_API_KEY --loop
"""
from __future__ import annotations

import argparse
import io
import sys
import time
from datetime import datetime
from typing import Any

import geopandas as gpd
import pandas as pd
import requests
import xarray as xr
from shapely.geometry import Point  # noqa: F401  # used by GeoPandas

# -----------------------------------------------------------------------------
# CONFIGURATION CONSTANTS
# -----------------------------------------------------------------------------
BASE_URL = "https://api.dataplatform.knmi.nl/open-data/v1"
DATASET = "Actuele10mindataKNMIstations"  # will be deprecated 2025‑09‑29
VERSION = "2"
# If/when you migrate to the new dataset, change the two lines above to e.g.:
# DATASET = "10-minute-in-situ-meteorological-observations"
# VERSION = "1"
# -----------------------------------------------------------------------------


def latest_file(api_key: str) -> str:
    """Query KNMI Open Data catalogue and return the newest NetCDF filename."""
    headers = {"Authorization": api_key}
    params = {"maxKeys": 1, "orderBy": "created", "sorting": "desc"}
    r = requests.get(
        f"{BASE_URL}/datasets/{DATASET}/versions/{VERSION}/files",
        headers=headers,
        params=params,
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["files"][0]["filename"]


def download_file(api_key: str, filename: str) -> bytes:
    """Download a file from KNMI Open Data and return raw bytes."""
    headers = {"Authorization": api_key}
    # Step 1: get a temporary download URL
    r = requests.get(
        f"{BASE_URL}/datasets/{DATASET}/versions/{VERSION}/files/{filename}/url",
        headers=headers,
        timeout=30,
    )
    r.raise_for_status()
    url = r.json()["temporaryDownloadUrl"]
    # Step 2: fetch the actual file
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.content


# -----------------------------------------------------------------------------
# DATA PARSING
# -----------------------------------------------------------------------------

def _find(ds: xr.Dataset, substring: str) -> str | None:
    """Return the first variable/coord name containing *substring* (case‑insensitive).

    Priority: coordinates first, then data variables.
    """
    lower = substring.lower()
    for name in ds.coords:
        if lower in name.lower():
            return name
    for name in ds.variables:
        if lower in name.lower():
            return name
    return None


def parse_qg(data: bytes) -> pd.DataFrame:
    """Extract station coordinates and 10‑minute GHI (QG) values from NetCDF bytes.

    Returns a DataFrame with columns: station, lat, lon, qg
    """
    with xr.open_dataset(io.BytesIO(data)) as ds:
        lat_name = _find(ds, "lat")
        lon_name = _find(ds, "lon")
        station_dim = next(
            (d for d in ds.dims if "station" in d.lower() or d.lower() == "stn"),
            None,
        )
        qg_var = next(
            (v for v in ds.data_vars if v.lower().startswith("qg")),
            None,
        )

        if not (lat_name and lon_name and station_dim and qg_var):
            raise ValueError(
                "Could not resolve required names → "
                f"lat:{lat_name}, lon:{lon_name}, "
                f"station_dim:{station_dim}, qg_var:{qg_var}"
            )

        # Build DataFrame (one row per station)
        df: pd.DataFrame = ds[[qg_var]].to_dataframe().reset_index()
        df = df[[station_dim, lat_name, lon_name, qg_var]].dropna()
        df.columns = ["station", "lat", "lon", "qg"]
    return df


# -----------------------------------------------------------------------------
# GEO SPATIAL HELPERS
# -----------------------------------------------------------------------------

def station_geojson(df: pd.DataFrame, path: str) -> gpd.GeoDataFrame:
    """Write point GeoJSON for KNMI stations and return the GeoDataFrame."""
    gdf = gpd.GeoDataFrame(
        df,
        geometry=gpd.points_from_xy(df["lon"], df["lat"]),
        crs="EPSG:4326",
    )
    gdf.to_file(path, driver="GeoJSON")
    return gdf


def aggregate_regions(gdf: gpd.GeoDataFrame, regions_path: str) -> gpd.GeoDataFrame:
    """Spatially join QG stations to regions and compute mean irradiance per region.

    If *regions* has a column `solar_capacity_mw`, an extra column
    `estimated_output_mw` is added:

        estimated_output_mw = solar_capacity_mw × qg_mean ÷ 1000
    """
    regions = gpd.read_file(regions_path)

    # Ensure CRS consistency
    if regions.crs is None:
        regions = regions.set_crs(epsg=4326, allow_override=True)
    elif regions.crs.to_epsg() != 4326:
        regions = regions.to_crs(epsg=4326)

    # Spatial join – keep station attributes, attach region attrs
    joined = gpd.sjoin(gdf, regions, how="left", predicate="within")

    # Aggregate irradiance per region name
    agg = joined.groupby("name")["qg"].mean().reset_index(name="qg_mean")
    out = regions.merge(agg, on="name", how="left")
    out["qg_mean"].fillna(0.0, inplace=True)

    # Optional PV output estimate
    if "solar_capacity_mw" in out.columns:
        out["estimated_output_mw"] = out["solar_capacity_mw"] * out["qg_mean"] / 1000.0

    return out


# -----------------------------------------------------------------------------
# RUNTIME WRAPPER
# -----------------------------------------------------------------------------

def run_once(api_key: str, regions_path: str, stations_out: str, regions_out: str) -> None:
    """Fetch newest file, regenerate GeoJSONs, print timestamp."""
    fname = latest_file(api_key)
    data = download_file(api_key, fname)
    df = parse_qg(data)
    gdf = station_geojson(df, stations_out)
    agg = aggregate_regions(gdf, regions_path)
    agg.to_file(regions_out, driver="GeoJSON")
    ts = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    print(f"Updated {stations_out} and {regions_out} at {ts}")


# -----------------------------------------------------------------------------
# CLI ENTRYPOINT
# -----------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Fetch KNMI QG data and update GeoJSON files",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--api-key", required=True, help="KNMI API key")
    parser.add_argument("--regions", default="data/regions_with_capacity.geojson")
    parser.add_argument("--stations-out", default="data/qg_stations.geojson")
    parser.add_argument("--regions-out", default="data/qg_regions.geojson")
    parser.add_argument("--loop", action="store_true", help="Run every 10 minutes")
    args = parser.parse_args(argv)

    while True:
        try:
            run_once(args.api_key, args.regions, args.stations_out, args.regions_out)
        except Exception as exc:
            print(f"Error: {exc}", file=sys.stderr)
        if not args.loop:
            break
        time.sleep(600)  # 10 minutes


if __name__ == "__main__":
    main()
