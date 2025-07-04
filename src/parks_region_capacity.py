#!/usr/bin/env python3
"""
Aggregate solar-park capacity per Dutch province and write result as GeoJSON.

Fixes over previous version
===========================
* **Ensures numeric aggregation** – the column *Output (MW)* is coerced to float
  with `pd.to_numeric(..., errors="coerce")` before any summing. If coercion
  fails the row is dropped, preventing the earlier string-concatenation bug.
* **More robust CSV reading** – strips whitespace in headers and handles
  alternative column names (e.g. *Output (MWh)*).
* **Verbose CLI feedback** – prints a small summary table after writing so you
  can visually confirm each province’s total.

Usage
-----
```bash
python parks_region_capacity.py \
  --regions data/regions_10.geojson \
  --parks   data/parks_geocoded.csv \
  --out     data/regions_with_capacity.geojson
```
Requires:  `pip install geopandas pandas pyogrio tabulate`
"""
from __future__ import annotations

import argparse
import pathlib
import sys
from typing import Final

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point
from tabulate import tabulate

DEFAULT_REGIONS: Final = "data/regions_10.geojson"
DEFAULT_PARKS: Final = "data/parks_geocoded.csv"
DEFAULT_OUT: Final = "data/regions_with_capacity.geojson"


# ---------------------------------------------------------------------------
# IO helpers
# ---------------------------------------------------------------------------

def load_regions(path: str | pathlib.Path) -> gpd.GeoDataFrame:
    """Load Dutch provinces GeoJSON as EPSG:4326 GeoDataFrame."""
    gdf = gpd.read_file(path)
    if gdf.crs is None:
        gdf = gdf.set_crs(epsg=4326, allow_override=True)
    elif gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)
    return gdf


def load_parks(path: str | pathlib.Path) -> gpd.GeoDataFrame:
    """Load parks CSV and return GeoDataFrame with Point geometries."""
    df = pd.read_csv(path)

    # Normalise header whitespace/case
    df.columns = df.columns.str.strip()

    # Identify capacity column (allow Output (MW) or MWh)
    capacity_col = None
    for col in df.columns:
        if col.lower().startswith("output"):
            capacity_col = col
            break
    if capacity_col is None:
        raise ValueError("CSV must contain a column starting with 'Output'.")

    # Coerce capacity to numeric – invalid entries become NaN and are dropped
    df[capacity_col] = pd.to_numeric(df[capacity_col], errors="coerce")

    # Drop rows where essential fields missing
    df = df.dropna(subset=["Latitude", "Longitude", capacity_col])

    # Build geometry
    gdf = gpd.GeoDataFrame(
        df,
        geometry=gpd.points_from_xy(df["Longitude"], df["Latitude"]),
        crs="EPSG:4326",
    )
    gdf = gdf.rename(columns={capacity_col: "capacity_mw"})
    return gdf


# ---------------------------------------------------------------------------
# Core aggregation logic
# ---------------------------------------------------------------------------

def aggregate_capacity(parks: gpd.GeoDataFrame, regions: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Spatially join parks to provinces and aggregate capacity."""
    parks_with_region = gpd.sjoin(
        parks,
        regions[["name", "geometry"]],
        how="left",
        predicate="within",
    )

    # Sum numeric capacity per province
    cap = (
        parks_with_region.groupby("name")["capacity_mw"]
        .sum()
        .round(3)  # tidy precision
        .reset_index()
        .rename(columns={"capacity_mw": "solar_capacity_mw"})
    )

    # Optional list of parks per province
    park_lists = (
        parks_with_region.groupby("name")["Name"]
        .apply(lambda s: sorted(s.dropna().unique().tolist()))
        .reset_index()
        .rename(columns={"Name": "parks"})
    )

    # Merge into regions GeoDataFrame
    out = regions.merge(cap, on="name", how="left").merge(park_lists, on="name", how="left")
    out["solar_capacity_mw"].fillna(0.0, inplace=True)
    out["parks"] = out["parks"].apply(lambda x: x if isinstance(x, list) else [])

    # Ensure numeric dtype for writing
    out["solar_capacity_mw"] = out["solar_capacity_mw"].astype(float)
    return out


# ---------------------------------------------------------------------------
# CLI wrapper
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Aggregate solar-park capacity per Dutch province")
    parser.add_argument("--regions", default=DEFAULT_REGIONS, help="Path to provinces GeoJSON")
    parser.add_argument("--parks", default=DEFAULT_PARKS, help="Path to parks CSV")
    parser.add_argument("--out", default=DEFAULT_OUT, help="Output GeoJSON path")
    args = parser.parse_args(argv)

    regions = load_regions(args.regions)
    parks = load_parks(args.parks)
    result = aggregate_capacity(parks, regions)

    # Write GeoJSON
    path_out = pathlib.Path(args.out)
    result.to_file(path_out, driver="GeoJSON")
    print(f"\n✅  Written {path_out}  (features: {len(result)})")

    # Pretty console summary
    summary = result[["name", "solar_capacity_mw"]].sort_values("solar_capacity_mw", ascending=False)
    print("\nCapacity per province (MW):")
    print(tabulate(summary, headers="keys", tablefmt="github", showindex=False))


if __name__ == "__main__":
    main(sys.argv[1:])