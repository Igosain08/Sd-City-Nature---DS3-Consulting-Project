"""
Priority zone scoring and recommendation generation
"""
import geopandas as gpd
from typing import List, Dict, Union
import random
from shapely.geometry import mapping
from shapely.geometry.base import BaseGeometry
import numpy as np
import pandas as pd
from typing import List, Dict, Union, Optional, Tuple
import h3
import h3pandas


def calculate_priority_score(hex_stats: gpd.GeoDataFrame, gap_power: float = 1.7) -> gpd.GeoDataFrame:
    """


    Definitions:
      cnc_ratio = C / (C + N)
      gap = (1 - cnc_ratio) ** gap_power

    Raw (dampened):
      raw_score = log1p(N) * gap * log1p(U)

    Then:
      raw_log = log1p(raw_score)
      priority_score = min-max(raw_log) scaled to [0,100]
    """
    needed = [
        "non_cnc_observation_count",
        "cnc_observation_count",
        "non_cnc_unique_species",
    ]
    for c in needed:
        if c not in hex_stats.columns:
            raise ValueError(f"hex_stats missing '{c}'")

    df = hex_stats.copy()

    # --- base columns ---
    N = df["non_cnc_observation_count"].fillna(0).astype(float)
    C = df["cnc_observation_count"].fillna(0).astype(float)
    U = df["non_cnc_unique_species"].fillna(0).astype(float)

    # --- cnc ratio ---
    total = N + C
    cnc_ratio = np.where(total > 0, C / total, 0.0)
    cnc_ratio = np.clip(cnc_ratio, 0.0, 1.0)
    df["cnc_ratio"] = cnc_ratio

    # --- dampened components (prevents N blow-up) ---
    N_eff = np.log1p(np.clip(N, 0.0, None))
    U_eff = np.log1p(np.clip(U, 0.0, None))

    # emphasize "underused during CNC" a bit more than linear
    gap = np.power(1.0 - cnc_ratio, gap_power)

    # --- raw score ---
    raw = N_eff * gap * U_eff
    raw = np.where(np.isfinite(raw), raw, 0.0)
    raw = np.clip(raw, 0.0, None)
    df["raw_priority_score"] = raw.astype(float)

    # --- log transform then normalize to 0..100 ---
    df["raw_log"] = np.log1p(df["raw_priority_score"])

    min_v = float(df["raw_log"].min())
    max_v = float(df["raw_log"].max())

    df["priority_score"] = np.where(
        max_v > min_v,
        (df["raw_log"] - min_v) / (max_v - min_v) * 100.0,
        0.0,
    ).astype(float)

    df["priority_score_norm"] = (df["priority_score"] / 100.0).astype(float)

    return df


def _compute_best_time_bucket_per_hex(
    joined: gpd.GeoDataFrame,
    *,
    hex_col: str = "hex_id",
    user_col: str = "user_id",
    id_col: str = "id",
    time_col: str = "time_observed_at",
    cnc_flag_col: str = "during_competition",
    use_non_cnc_only: bool = True,
    min_users: int = 6,
    min_obs: int = 30,
) -> Dict[str, str]:
    """
    Returns {hex_id: 'Morning (6–10 AM)'} for hexes where we have enough data.
    If a hex doesn't meet thresholds, it will not appear in the dict (caller can fallback).
    """

    # 4 buckets
    bins = [0, 6, 10, 14, 18, 22, 24]
    labels = [
        "Late night (12–6 AM)",
        "Morning (6–10 AM)",
        "Midday (10 AM–2 PM)",
        "Afternoon (2–6 PM)",
        "Evening (6–10 PM)",
        "Late night (10 PM–12 AM)",
    ]
    df = joined.copy()

    if use_non_cnc_only and cnc_flag_col in df.columns:
        df = df[df[cnc_flag_col] == False].copy()

    # parse time -> hour
    t = pd.to_datetime(df[time_col], errors="coerce")
    # tz-aware convert; tz-naive assume already local
    if getattr(t.dt, "tz", None) is not None:
        t = t.dt.tz_convert("America/Los_Angeles")
    df["hour"] = t.dt.hour

    df = df.dropna(subset=[hex_col, user_col, id_col, "hour"])
    df["hour"] = df["hour"].astype(int)

    # bucket hours
    df["time_bucket"] = pd.cut(
        df["hour"],
        bins=bins,
        labels=labels,
        right=False,
        include_lowest=True,
    )
    df = df.dropna(subset=["time_bucket"])

    # aggregate per (hex, bucket)
    agg = (
        df.groupby([hex_col, "time_bucket"], observed=True)
          .agg(obs=(id_col, "count"), users=(user_col, "nunique"))
          .reset_index()
    )

    # obs/user + stabilizer
    agg["obs_per_user"] = agg["obs"] / agg["users"].replace(0, np.nan)
    agg["score"] = agg["obs_per_user"] * np.log1p(agg["users"])

    # pick best per hex
    best_map: Dict[str, str] = {}
    for hid, grp in agg.groupby(hex_col, observed=True):
        top = grp.sort_values("score", ascending=False).iloc[0]
        if int(top["users"]) >= min_users and int(top["obs"]) >= min_obs:
            best_map[str(hid)] = str(top["time_bucket"])

    

    return best_map



def generate_recommendations(
    scored_hex_gdf: gpd.GeoDataFrame,
    obs_gdf: gpd.GeoDataFrame,
    top_n: int = 10,
    *,
    cnc_flag_col: str = "during_competition",
    iconic_col: str = "iconic_taxon_name",
    radius_km: float = 2.0,
) -> List[Dict]:
    """
    Returns top N zones as List[Dict] matching your frontend schema.
    target_taxa = top 2-3 iconic_taxon_name values among NON-CNC observations in that hex.
    """
    if scored_hex_gdf is None or len(scored_hex_gdf) == 0:
        return []
    if "hex_id" not in scored_hex_gdf.columns or "priority_score" not in scored_hex_gdf.columns:
        raise ValueError("scored_hex_gdf must include 'hex_id' and 'priority_score'")
    if obs_gdf.crs is None or scored_hex_gdf.crs is None:
        raise ValueError("Both obs_gdf and scored_hex_gdf must have CRS set.")
    if cnc_flag_col not in obs_gdf.columns:
        raise ValueError(f"obs_gdf missing '{cnc_flag_col}'")
    if iconic_col not in obs_gdf.columns:
        raise ValueError(f"obs_gdf missing '{iconic_col}'")

    # Work in 4326 for geometry + centers
    hex_top = scored_hex_gdf.to_crs("EPSG:4326").sort_values("priority_score", ascending=False).head(top_n).reset_index(drop=True)

    taxon_col = "taxon_id"  # adjust if your column name differs
    common_col = "common_name"   # CHANGE if your column is named differently

    needed_cols = [cnc_flag_col, iconic_col, common_col, "geometry", "user_id", "id", "time_observed_at"]
    missing = [c for c in needed_cols if c not in obs_gdf.columns]
    if missing:
        raise ValueError(f"obs_gdf missing columns needed for common-name taxa: {missing}")
    
    obs = obs_gdf[needed_cols].copy().to_crs("EPSG:4326")
        

    # Join obs -> top hexes only
    joined = gpd.sjoin(
        obs,
        hex_top[["hex_id", "geometry"]],
        how="inner",
        predicate="within",
    )

    time_map = _compute_best_time_bucket_per_hex(
    joined,
    hex_col="hex_id",
    user_col="user_id",
    id_col="id",
    time_col="time_observed_at",
    cnc_flag_col=cnc_flag_col,
    use_non_cnc_only=True,   # baseline timing, not event schedule timing
    min_users=6,
    min_obs=30,
    )

    # generic fallback if this hex is too sparse
    GENERIC_FALLBACK = "Morning (6–10 AM)"

    # Compute top iconic taxa from NON-CNC only
    non_cnc = joined[joined[cnc_flag_col] == False].copy()
    
    taxa_map: Dict[str, Dict[str, List[str]]] = {}
    
    if len(non_cnc) > 0:
        for hid, grp in non_cnc.groupby("hex_id"):
            # Clean strings
            grp2 = grp.copy()
    
            grp2[iconic_col] = (
                grp2[iconic_col]
                .dropna()
                .astype(str)
                .str.strip()
            )
    
            grp2[common_col] = (
                grp2[common_col]
                .dropna()
                .astype(str)
                .str.strip()
            )
    
            # Drop rows missing either iconic group or common name
            grp2 = grp2.dropna(subset=[iconic_col, common_col])
            grp2 = grp2[(grp2[iconic_col] != "") & (grp2[common_col] != "")]
            grp2 = grp2[grp2[common_col].str.lower() != "unknown"]
    
            if len(grp2) == 0:
                continue
    
            # 1) top 3 iconic groups
            top_groups = grp2[iconic_col].value_counts().head(3).index.tolist()
    
            # 2) within each group, top 5 common names (rank by unique observers to reduce spam)
            group_to_common: Dict[str, List[str]] = {}
            for gname in top_groups:
                sub = grp2[grp2[iconic_col] == gname]
    
                top_common = (
                    sub.groupby(common_col)["user_id"]
                       .nunique()
                       .sort_values(ascending=False)
                       .head(5)
                       .index
                       .tolist()
                )
                group_to_common[str(gname)] = [str(x) for x in top_common]
    
            taxa_map[str(hid)] = group_to_common

    recs: List[Dict] = []
    for i, row in hex_top.iterrows():
        hid = str(row["hex_id"])

        # center
        if "center_lat" in row and "center_lng" in row and pd.notnull(row["center_lat"]) and pd.notnull(row["center_lng"]):
            center_lat = float(row["center_lat"])
            center_lng = float(row["center_lng"])
        else:
            c = row["geometry"].centroid
            center_lat = float(c.y)
            center_lng = float(c.x)

        score = float(row["priority_score"])
        cnc_ratio = float(row.get("cnc_ratio", 0.0))
        non_cnc_count = int(row.get("non_cnc_observation_count", 0))
        cnc_count = int(row.get("cnc_observation_count", 0))

        rationale = (
            f"High baseline activity outside CNC ({non_cnc_count} obs) but low CNC share "
            f"({cnc_ratio:.0%}), suggesting missed mobilization potential."
        )

        recs.append({
            "zone_id": hid,
            "name": f"Priority Zone {i + 1}",
            "center_lat": center_lat,
            "center_lng": center_lng,
            "radius_km": float(radius_km),
            "priority_score": float(score),
            "recommended_time": time_map.get(hid, GENERIC_FALLBACK),
            "target_taxa": taxa_map.get(hid, {}),
            "rationale": rationale,
            "geometry": mapping(row["geometry"]) if row.get("geometry") is not None else {},
            # Optional extras your cards might want:
            "non_cnc_observation_count": non_cnc_count,
            "cnc_observation_count": cnc_count,
            "habitat": row.get("habitat", None)
        })

    return recs


def calculate_timing_efficiency():

    return [
        {
            "day_of_week": "Saturday",
            "hour": 9,
            "observation_count": 420,
            "unique_species": 185,
            "efficiency_score": 78.4,
        }]