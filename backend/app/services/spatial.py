"""
Geospatial analysis utilities using H3 hexagonal binning
"""
import h3
import geopandas as gpd
import pandas as pd
from typing import List, Dict
from shapely.geometry import Polygon
import h3pandas
from shapely.ops import unary_union
import shapely
import h3
from shapely.geometry import mapping
from shapely.geometry import Point
from pathlib import Path


def generate_county_hex_grid(
    county_boundary: gpd.GeoDataFrame,
    resolution: int = 7,
    buffer_m: float = 0.0,
    inside_ratio: float = 0.0,
) -> gpd.GeoDataFrame:
    if county_boundary.crs is None:
        raise ValueError("county_boundary must have a CRS set.")

    # 1) dissolve + valid
    boundary = county_boundary.dissolve()
    boundary_geom = unary_union(boundary.geometry)
    if not boundary_geom.is_valid:
        boundary_geom = shapely.make_valid(boundary_geom)

    # 2) meters CRS for buffer/area (SD = UTM 11N)
    boundary_m = gpd.GeoSeries([boundary_geom], crs=county_boundary.crs).to_crs("EPSG:26911").iloc[0]
    if buffer_m and buffer_m != 0:
        boundary_m = boundary_m.buffer(buffer_m)

    # 3) back to 4326 for polyfill
    boundary_4326_geom = gpd.GeoSeries([boundary_m], crs="EPSG:26911").to_crs("EPSG:4326").iloc[0]
    boundary_4326 = gpd.GeoDataFrame(geometry=[boundary_4326_geom], crs="EPSG:4326")

    # 4) polyfill and EXTRACT HEX IDS robustly
    poly = boundary_4326.h3.polyfill(resolution)

    # Extract raw ids
    if hasattr(poly, "columns"):
        for col in ("h3_polyfill", "h3_index", "hex_id", "h3"):
            if col in poly.columns:
                s = poly[col]
                # explode if cells contain lists/sets
                try:
                    s = s.explode()
                except Exception:
                    pass
                hex_ids = s.dropna().tolist()
                break
        else:
            if getattr(poly.index, "name", None) in ("h3", "h3_index", "hex_id"):
                hex_ids = list(poly.index)
            else:
                raise ValueError(f"Couldn't find H3 id column in polyfill result. Columns: {list(poly.columns)}")
    else:
        first = poly.iloc[0]
        hex_ids = list(first) if isinstance(first, (list, tuple, set)) else poly.tolist()

    # ✅ FLATTEN in case we still have list-in-cell
    flat = []
    for x in hex_ids:
        if isinstance(x, (list, tuple, set)):
            flat.extend(list(x))
        else:
            flat.append(x)
    hex_ids = flat

    # Normalize to H3 strings
    cleaned = []
    for hid in hex_ids:
        if isinstance(hid, int):
            cleaned.append(h3.int_to_str(hid))
        else:
            cleaned.append(hid)  # keep as string; do NOT str(list) anymore
    hex_ids = cleaned


    # 6) build hex polygons in 4326
    rows = []
    for hid in hex_ids:
        boundary_coords = [(lng, lat) for lat, lng in h3.cell_to_boundary(hid)]
        poly_geom = Polygon(boundary_coords)
        center_lat, center_lng = h3.cell_to_latlng(hid)
        rows.append((hid, poly_geom, center_lat, center_lng))

    hex_gdf = gpd.GeoDataFrame(rows, columns=["hex_id", "geometry", "center_lat", "center_lng"], crs="EPSG:4326")

    # 7) strict inside filtering in meters
    hex_m = hex_gdf.to_crs("EPSG:26911")
    inter_area = hex_m.geometry.intersection(boundary_m).area
    hex_area = hex_m.geometry.area
    ratio = inter_area / hex_area

    hex_m = hex_m[ratio >= inside_ratio].copy()

    return hex_m.to_crs(county_boundary.crs).reset_index(drop=True)





def hex_bin_observations(
    gdf: gpd.GeoDataFrame,
    county_boundary: gpd.GeoDataFrame,
    resolution: int = 7,
    *,
    min_non_cnc: int = 50,
    cnc_start: str = "2025-04-25",
    cnc_end: str = "2025-04-28",
    date_col: str = "observed_on",
    cnc_flag_col: str = "during_competition",
    taxon_col: str = "taxon_id",
    iconic_col: str = "iconic_taxon_name",
    buffer_m: float = 0.0,
    inside_ratio: float = 0.0,  # keep full grid for now; no harsh filtering
    use_existing_cnc_flag: bool = True,
) -> gpd.GeoDataFrame:
    """
    Returns hex GeoDataFrame with:
      - total_observation_count
      - cnc_observation_count
      - non_cnc_observation_count
      - non_cnc_unique_species (unique taxon_id)
      - (optionally) placeholder for later: we can compute top iconic taxa in recommendations
      - keeps min_non_cnc_threshold as a column
    """
    if gdf.crs is None:
        raise ValueError("gdf must have a CRS set.")
    if county_boundary.crs is None:
        raise ValueError("county_boundary must have a CRS set.")

    # 1) Build full county hex grid (polygons)
    hex_grid = generate_county_hex_grid(
        county_boundary=county_boundary,
        resolution=resolution,
        buffer_m=buffer_m,
        inside_ratio=inside_ratio,
    )
    if "hex_id" not in hex_grid.columns:
        raise ValueError("generate_county_hex_grid must return a GeoDataFrame with 'hex_id'.")

    # 2) Make sure observations are points + same CRS for sjoin
    obs = gdf.copy()

    # ensure observed_on exists if we need to compute CNC flag
    if not use_existing_cnc_flag:
        if date_col not in obs.columns:
            raise ValueError(f"'{date_col}' not found; needed to compute CNC window.")
        # observed_on can be date or string; coerce safely
        obs[date_col] = pd.to_datetime(obs[date_col], errors="coerce").dt.date
        start = pd.to_datetime(cnc_start).date()
        end = pd.to_datetime(cnc_end).date()
        obs[cnc_flag_col] = obs[date_col].between(start, end)

    if use_existing_cnc_flag and cnc_flag_col not in obs.columns:
        raise ValueError(
            f"'{cnc_flag_col}' not found. Either set use_existing_cnc_flag=False "
            f"or ensure the column exists."
        )

    # keep only needed cols (lighter memory)
    keep_cols = [cnc_flag_col, taxon_col, iconic_col, "geometry"]
    for c in keep_cols:
        if c not in obs.columns:
            # iconic_col is optional for this stage, but required later for target taxa
            if c == iconic_col:
                obs[iconic_col] = None
            else:
                raise ValueError(f"Missing required column: {c}")
    obs = obs[keep_cols].copy()

    obs = obs.to_crs(hex_grid.crs)

    # 3) spatial join: each observation gets a hex_id
    joined = gpd.sjoin(
        obs,
        hex_grid[["hex_id", "geometry"]],
        how="inner",
        predicate="intersects",  # switch to "intersects" if you suspect edge-point misses
    )

    # 4) aggregate counts per hex
    total_counts = joined.groupby("hex_id").size().rename("total_observation_count")

    cnc_counts = (
        joined[joined[cnc_flag_col] == True]
        .groupby("hex_id")
        .size()
        .rename("cnc_observation_count")
    )

    non_cnc = joined[joined[cnc_flag_col] == False]
    non_cnc_counts = non_cnc.groupby("hex_id").size().rename("non_cnc_observation_count")

    non_cnc_unique_species = (
        non_cnc.groupby("hex_id")[taxon_col]
        .nunique()
        .rename("non_cnc_unique_species")
    )

    stats = pd.concat(
        [total_counts, cnc_counts, non_cnc_counts, non_cnc_unique_species],
        axis=1
    ).fillna(0).reset_index()

    # types
    for col in ["total_observation_count","cnc_observation_count","non_cnc_observation_count","non_cnc_unique_species"]:
        stats[col] = stats[col].astype(int)

    # 5) join stats back onto full grid (so wilderness hexes exist, counts default 0)
    out = hex_grid.merge(stats, on="hex_id", how="left")
    for col in ["total_observation_count","cnc_observation_count","non_cnc_observation_count","non_cnc_unique_species"]:
        out[col] = out[col].fillna(0).astype(int)

    out["min_non_cnc_threshold"] = int(min_non_cnc)

    BACKEND_DIR = Path(__file__).resolve().parents[2]  # services -> app -> backend
    HAB_PATH = BACKEND_DIR / "data" / "hex_habitat_res7.csv"

    if HAB_PATH.exists():
        hab = pd.read_csv(HAB_PATH)
        hab["hex_id"] = hab["hex_id"].astype(str)
        out["hex_id"] = out["hex_id"].astype(str)

        # only pull what you need
        hab = hab[["hex_id", "habitat"]]
        out = out.merge(hab, on="hex_id", how="left")
        out["habitat"] = out["habitat"].where(out["habitat"].notna(), None)
        
        out["hex_id"] = out["hex_id"].astype(str)
        hab["hex_id"] = hab["hex_id"].astype(str)

    else:
        out["habitat"] = None

    # 6) filter: keep only hexes with proven baseline potential

    out = out[out["non_cnc_observation_count"] >= min_non_cnc].copy()

    return out.reset_index(drop=True)