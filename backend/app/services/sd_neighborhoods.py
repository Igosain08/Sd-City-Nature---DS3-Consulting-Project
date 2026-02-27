"""
San Diego city neighborhoods for breaking down observations within the City of San Diego.
Uses approximate bounding polygons (lon, lat) for point-in-polygon assignment.
"""
from shapely.geometry import Polygon, Point
from typing import List, Tuple, Dict, Any
import pandas as pd
import geopandas as gpd

# (lon, lat) rings for Shapely. Approximate boundaries for City of San Diego neighborhoods.
# Order: smaller/more specific areas first so we can assign "first match" for overlaps.
SD_NEIGHBORHOODS: List[Tuple[str, List[Tuple[float, float]]]] = [
    ("Downtown", [(-117.175, 32.705), (-117.135, 32.705), (-117.135, 32.728), (-117.175, 32.728), (-117.175, 32.705)]),
    ("Little Italy", [(-117.175, 32.718), (-117.162, 32.718), (-117.162, 32.728), (-117.175, 32.728), (-117.175, 32.718)]),
    ("East Village", [(-117.155, 32.705), (-117.135, 32.705), (-117.135, 32.718), (-117.155, 32.718), (-117.155, 32.705)]),
    ("Gaslamp Quarter", [(-117.165, 32.708), (-117.152, 32.708), (-117.152, 32.718), (-117.165, 32.718), (-117.165, 32.708)]),
    ("University City", [(-117.235, 32.855), (-117.185, 32.855), (-117.185, 32.895), (-117.235, 32.895), (-117.235, 32.855)]),
    ("La Jolla", [(-117.285, 32.82), (-117.24, 32.82), (-117.24, 32.88), (-117.285, 32.88), (-117.285, 32.82)]),
    ("Pacific Beach", [(-117.265, 32.77), (-117.24, 32.77), (-117.24, 32.81), (-117.265, 32.81), (-117.265, 32.77)]),
    ("Mission Beach", [(-117.265, 32.76), (-117.245, 32.76), (-117.245, 32.78), (-117.265, 32.78), (-117.265, 32.76)]),
    ("Ocean Beach", [(-117.265, 32.74), (-117.245, 32.74), (-117.245, 32.76), (-117.265, 32.76), (-117.265, 32.74)]),
    ("Point Loma", [(-117.265, 32.70), (-117.235, 32.70), (-117.235, 32.75), (-117.265, 32.75), (-117.265, 32.70)]),
    ("Hillcrest", [(-117.175, 32.74), (-117.155, 32.74), (-117.155, 32.755), (-117.175, 32.755), (-117.175, 32.74)]),
    ("North Park", [(-117.145, 32.725), (-117.12, 32.725), (-117.12, 32.75), (-117.145, 32.75), (-117.145, 32.725)]),
    ("South Park", [(-117.145, 32.71), (-117.12, 32.71), (-117.12, 32.725), (-117.145, 32.725), (-117.145, 32.71)]),
    ("Golden Hill", [(-117.155, 32.705), (-117.135, 32.705), (-117.135, 32.72), (-117.155, 32.72), (-117.155, 32.705)]),
    ("Mission Valley", [(-117.195, 32.765), (-117.165, 32.765), (-117.165, 32.795), (-117.195, 32.795), (-117.195, 32.765)]),
    ("Clairemont", [(-117.235, 32.82), (-117.195, 32.82), (-117.195, 32.86), (-117.235, 32.86), (-117.235, 32.82)]),
    ("Kearny Mesa", [(-117.195, 32.82), (-117.165, 32.82), (-117.165, 32.86), (-117.195, 32.86), (-117.195, 32.82)]),
    ("Mira Mesa", [(-117.21, 32.91), (-117.17, 32.91), (-117.17, 32.94), (-117.21, 32.94), (-117.21, 32.91)]),
    ("Alta Vista", [(-117.07, 32.68), (-117.04, 32.68), (-117.04, 32.71), (-117.07, 32.71), (-117.07, 32.68)]),
    ("Encanto", [(-117.08, 32.68), (-117.04, 32.68), (-117.04, 32.72), (-117.08, 32.72), (-117.08, 32.68)]),
    ("City Heights", [(-117.12, 32.72), (-117.08, 32.72), (-117.08, 32.75), (-117.12, 32.75), (-117.12, 32.72)]),
    ("Normal Heights", [(-117.13, 32.75), (-117.11, 32.75), (-117.11, 32.77), (-117.13, 32.77), (-117.13, 32.75)]),
    ("Kensington", [(-117.11, 32.755), (-117.08, 32.755), (-117.08, 32.775), (-117.11, 32.775), (-117.11, 32.755)]),
    ("Midway", [(-117.22, 32.74), (-117.195, 32.74), (-117.195, 32.765), (-117.22, 32.765), (-117.22, 32.74)]),
    ("Linda Vista", [(-117.21, 32.78), (-117.18, 32.78), (-117.18, 32.82), (-117.21, 32.82), (-117.21, 32.78)]),
    ("Serra Mesa", [(-117.165, 32.80), (-117.13, 32.80), (-117.13, 32.83), (-117.165, 32.83), (-117.165, 32.80)]),
    ("Allied Gardens", [(-117.08, 32.82), (-117.05, 32.82), (-117.05, 32.85), (-117.08, 32.85), (-117.08, 32.82)]),
    ("College Area", [(-117.075, 32.77), (-117.04, 32.77), (-117.04, 32.80), (-117.075, 32.80), (-117.075, 32.77)]),
    ("San Carlos", [(-117.10, 32.80), (-117.07, 32.80), (-117.07, 32.84), (-117.10, 32.84), (-117.10, 32.80)]),
    ("Tierrasanta", [(-117.10, 32.83), (-117.06, 32.83), (-117.06, 32.88), (-117.10, 32.88), (-117.10, 32.83)]),
]

# Rough City of San Diego bounding box (lon, lat) to restrict "neighborhood" view to SD proper.
SD_CITY_BBOX = Polygon([
    (-117.28, 32.53),
    (-116.92, 32.53),
    (-116.92, 32.92),
    (-117.28, 32.92),
    (-117.28, 32.53),
])


def _point_in_polygon(lon: float, lat: float, ring: List[Tuple[float, float]]) -> bool:
    try:
        poly = Polygon(ring)
        return poly.contains(Point(lon, lat))
    except Exception:
        return False


def get_by_sd_neighborhood(gdf: gpd.GeoDataFrame, top_n: int = 15) -> List[Dict[str, Any]]:
    """
    Observations by San Diego neighborhood. Only includes observations whose (lat, lon)
    fall within the rough City of San Diego boundary; each point is assigned to the first
    matching neighborhood polygon. Returns top N neighborhoods by count plus Other.
    """
    if gdf is None or len(gdf) == 0:
        return []
    if "latitude" not in gdf.columns or "longitude" not in gdf.columns:
        return []
    gdf = gdf.copy()
    # Restrict to points inside SD city bbox
    if hasattr(gdf, "geometry") and gdf.geometry is not None:
        in_sd = gdf.geometry.intersects(SD_CITY_BBOX)
    else:
        in_sd = gpd.GeoSeries(
            [Point(lon, lat) for lon, lat in zip(gdf["longitude"], gdf["latitude"])]
        ).intersects(SD_CITY_BBOX)
    gdf = gdf.loc[in_sd].copy()
    if len(gdf) == 0:
        return []
    # Build list of (name, polygon) for first-match assignment
    polys = [(name, Polygon(ring)) for name, ring in SD_NEIGHBORHOODS]
    neighborhood = []
    for _, row in gdf.iterrows():
        lon = float(row["longitude"])
        lat = float(row["latitude"])
        name = "Other"
        for n, poly in polys:
            try:
                if poly.contains(Point(lon, lat)):
                    name = n
                    break
            except Exception:
                continue
        neighborhood.append(name)
    gdf = gdf.assign(_neighborhood=neighborhood)
    counts = gdf.groupby("_neighborhood", as_index=False).size()
    counts.columns = ["community", "count"]
    counts = counts.sort_values("count", ascending=False).reset_index(drop=True)
    if len(counts) <= top_n:
        return counts.to_dict("records")
    top = counts.head(top_n)
    tail = counts.iloc[top_n:]
    other_count = int(tail["count"].sum())
    # Single "Other" row: add tail sum to existing "Other" in top if present, else append
    out = top.to_dict("records")
    if other_count <= 0:
        return out
    for i, row in enumerate(out):
        if row["community"] == "Other":
            out[i] = {"community": "Other", "count": row["count"] + other_count}
            return out
    out.append({"community": "Other", "count": other_count})
    return out
