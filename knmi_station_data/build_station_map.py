#!/usr/bin/env python3
"""Convert KNMI station metrics to GeoJSON and an interactive HTML map.

The script reads the CSV produced by ``fetch_station_metrics.py`` and emits:

* A GeoJSON FeatureCollection with one point per station (default path
  ``knmi_station_data/station_metrics.geojson``)
* An interactive Leaflet map (via Folium) with tooltips showing the
  latest metric values (default path
  ``knmi_station_data/station_metrics_map.html``)
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable, List, Tuple

import pandas as pd

try:
    import folium
    from folium.plugins import MarkerCluster
    from branca.colormap import linear
except ImportError as exc:
    raise SystemExit(
        "Missing folium dependency. Install it with 'pip install folium'."
    ) from exc


DEFAULT_CSV = Path("knmi_station_data/station_metrics.csv")
DEFAULT_GEOJSON = Path("knmi_station_data/station_metrics.geojson")
DEFAULT_MAP = Path("knmi_station_data/station_metrics_map.html")

# Order in which metric columns will appear in the GeoJSON properties and popup.
METRIC_COLUMNS: Tuple[str, ...] = (
    "qg",
    "dd",
    "dn",
    "dx",
    "dsd",
    "dr",
    "ff",
    "ffs",
    "fsd",
    "fx",
    "fxs",
    "gff",
    "gffs",
)


def _nan_to_none(value):
    return None if pd.isna(value) else value


def _load_dataframe(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    required_cols = {"station", "latitude", "longitude", *METRIC_COLUMNS}
    missing = required_cols.difference(df.columns)
    if missing:
        raise ValueError(
            f"CSV is missing required columns: {', '.join(sorted(missing))}"
        )
    return df


def _build_geojson(df: pd.DataFrame) -> dict:
    features: List[dict] = []
    for row in df.itertuples(index=False):
        properties = {
            "station": row.station,
            "source_filename": getattr(row, "source_filename", None),
        }
        for col in METRIC_COLUMNS:
            properties[col] = _nan_to_none(getattr(row, col))
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [_nan_to_none(row.longitude), _nan_to_none(row.latitude)],
            },
            "properties": properties,
        }
        features.append(feature)
    return {"type": "FeatureCollection", "features": features}


def _popup_rows(row: pd.Series) -> Iterable[str]:
    yield f"<tr><th>Station</th><td>{row.station}</td></tr>"
    if "source_filename" in row:
        yield f"<tr><th>Source</th><td>{row.source_filename}</td></tr>"
    for col in METRIC_COLUMNS:
        value = row[col]
        if pd.isna(value):
            display = "&mdash;"
        else:
            display = f"{value:.2f}" if isinstance(value, (int, float)) else str(value)
        yield f"<tr><th>{col}</th><td>{display}</td></tr>"


def _build_popup_html(row: pd.Series) -> str:
    rows_html = "\n".join(_popup_rows(row))
    return f"""
    <table class="station-popup">
        <tbody>
            {rows_html}
        </tbody>
    </table>
    """


def _configure_colormap(values: pd.Series):
    finite_values = values.dropna()
    if finite_values.empty:
        return None, None, None

    vmin = float(finite_values.min())
    vmax = float(finite_values.max())
    if vmin == vmax:
        vmax = vmin + 1e-6  # avoid zero span
    colormap = linear.YlOrRd_09.scale(vmin, vmax)
    colormap.caption = "Global Solar Radiation Mean (qg, W/m²)"
    return colormap, vmin, vmax


def _create_map(df: pd.DataFrame, output_path: Path) -> None:
    midpoint = [df["latitude"].mean(), df["longitude"].mean()]
    the_map = folium.Map(location=midpoint, zoom_start=7)
    cluster = MarkerCluster().add_to(the_map)

    colormap, _, _ = _configure_colormap(df["qg"])
    if colormap is not None:
        the_map.add_child(colormap)

    for _, row in df.iterrows():
        color = "#888888"
        if colormap is not None and not pd.isna(row["qg"]):
            color = colormap(row["qg"])

        popup = folium.Popup(_build_popup_html(row), max_width=300)
        folium.CircleMarker(
            location=(row["latitude"], row["longitude"]),
            radius=6,
            stroke=True,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.85,
            popup=popup,
        ).add_to(cluster)

    the_map.save(output_path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CSV,
        help=f"Input station metrics CSV (default: {DEFAULT_CSV})",
    )
    parser.add_argument(
        "--geojson",
        type=Path,
        default=DEFAULT_GEOJSON,
        help=f"Output GeoJSON path (default: {DEFAULT_GEOJSON})",
    )
    parser.add_argument(
        "--html",
        type=Path,
        default=DEFAULT_MAP,
        help=f"Output interactive map HTML path (default: {DEFAULT_MAP})",
    )
    args = parser.parse_args()

    df = _load_dataframe(args.csv)

    geojson = _build_geojson(df)
    args.geojson.parent.mkdir(parents=True, exist_ok=True)
    args.geojson.write_text(json.dumps(geojson, indent=2), encoding="utf-8")

    _create_map(df, args.html)
    print(f"Wrote GeoJSON to {args.geojson}")
    print(f"Wrote interactive map to {args.html}")


if __name__ == "__main__":
    main()
