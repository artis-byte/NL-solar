import argparse
import json

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point


def main(parks_csv: str, regions_geojson: str, output: str):
    df = pd.read_csv(parks_csv)
    df = df.dropna(subset=["Latitude", "Longitude"])
    geometry = [Point(xy) for xy in zip(df["Longitude"], df["Latitude"])]
    parks = gpd.GeoDataFrame(df, geometry=geometry, crs="EPSG:4326")
    regions = gpd.read_file(regions_geojson)
    regions = regions.set_crs("EPSG:4326")
    joined = gpd.sjoin(parks, regions, how="inner", predicate="within")
    grouped = joined.groupby("region_id").agg(
        capacity_mwp=("Output (MW)", "sum"), park_count=("Name", "count")
    )
    result = regions.merge(grouped, on="region_id", how="left")
    result["capacity_mwp"] = result["capacity_mwp"].fillna(0)
    result["park_count"] = result["park_count"].fillna(0).astype(int)
    result.to_file(output, driver="GeoJSON")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--parks", default="data/parks_geocoded.csv")
    p.add_argument("--regions", default="data/regions_10.geojson")
    p.add_argument("--output", default="regions_capacity.geojson")
    args = p.parse_args()
    main(args.parks, args.regions, args.output)
