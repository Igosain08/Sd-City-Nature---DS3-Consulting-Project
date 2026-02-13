"""
Taxonomic aggregation and analysis utilities
"""
import geopandas as gpd
import pandas as pd
from typing import List, Dict


def summarize_by_taxon(gdf: gpd.GeoDataFrame) -> List[Dict]:
    """
    Group observations by taxonomic group and summarize

    Args:
        gdf: GeoDataFrame with observation data

    Returns:
        List of taxonomic summaries
    """
    if "taxon_group" not in gdf.columns:
        return []
    gdf = gdf.copy()
    gdf["taxon_group"] = gdf["taxon_group"].fillna("Unknown").astype(str).replace("", "Unknown")
    summary = gdf.groupby("taxon_group").agg({
        'species_name': 'nunique',
        'id': 'count'
    }).reset_index()
    
    summary.columns = ['taxon_group', 'total_species', 'total_observations']
    
    # Get top species for each taxon group
    result = []
    for _, row in summary.iterrows():
        taxon = row['taxon_group']
        taxon_data = gdf[gdf['taxon_group'] == taxon]
        
        top_species = (
            taxon_data['species_name']
            .value_counts()
            .head(6)
            .index
            .tolist()
        )
        
        result.append({
            'taxon_group': taxon,
            'total_species': int(row['total_species']),
            'total_observations': int(row['total_observations']),
            'top_species': top_species
        })
    
    return result


def get_temporal_trends(gdf: gpd.GeoDataFrame) -> List[Dict]:
    """
    Bin observations by date and return time-series data (all counts and research-grade counts).

    Returns:
        List of { date, count, research_count } for line chart (all vs research-grade).
    """
    if "observed_on" not in gdf.columns:
        return []
    gdf = gdf.copy()
    obs = pd.to_datetime(gdf["observed_on"], errors="coerce")
    gdf["_date"] = obs.dt.strftime("%Y-%m-%d")
    gdf = gdf.dropna(subset=["_date"])
    if "quality_grade" in gdf.columns:
        gdf["_is_research"] = (gdf["quality_grade"].astype(str).str.lower() == "research").astype(int)
        agg = gdf.groupby("_date").agg({"id": "count", "_is_research": "sum"}).reset_index()
        agg.columns = ["date", "count", "research_count"]
        agg["research_count"] = agg["research_count"].astype(int)
    else:
        agg = gdf.groupby("_date").agg({"id": "count"}).reset_index()
        agg.columns = ["date", "count"]
        agg["research_count"] = 0
    agg["count"] = agg["count"].astype(int)
    return agg.sort_values("date").to_dict("records")


def get_user_contribution_buckets(gdf: gpd.GeoDataFrame) -> List[Dict]:
    """
    Compute histogram of observations per user (how many users have 1 obs, 2-5, 6-10, etc.).

    Returns:
        List of { bucket_label, user_count } for histogram.
    """
    if "user_id" not in gdf.columns:
        return []
    per_user = gdf.groupby("user_id").agg({"id": "count"}).reset_index()
    per_user.columns = ["user_id", "obs_count"]
    # Define bins: 1, 2-5, 6-10, 11-20, 21-50, 51-100, 101+
    bins = [0, 1, 5, 10, 20, 50, 100, float("inf")]
    labels = ["1", "2–5", "6–10", "11–20", "21–50", "51–100", "101+"]
    per_user["bucket"] = pd.cut(per_user["obs_count"], bins=bins, labels=labels, right=True)
    bucket_counts = per_user.groupby("bucket", observed=True).size().reset_index(name="user_count")
    bucket_counts = bucket_counts.rename(columns={"bucket": "bucket_label"})
    bucket_counts["bucket_label"] = bucket_counts["bucket_label"].astype(str)
    bucket_counts["user_count"] = bucket_counts["user_count"].astype(int)
    return bucket_counts.to_dict("records")


def get_hourly_distribution(gdf: gpd.GeoDataFrame) -> pd.DataFrame:
    """
    Get distribution of observations by hour of day
    
    Args:
        gdf: GeoDataFrame with observation data
        
    Returns:
        DataFrame with hourly counts
    """
    # TODO: Parse actual timestamps when available
    # For now, map time_of_day to hours
    time_mapping = {
        'morning': 9,
        'afternoon': 14,
        'evening': 18,
        'night': 21
    }
    
    gdf['hour'] = gdf['time_of_day'].map(time_mapping)
    
    hourly = gdf.groupby('hour').agg({
        'id': 'count',
        'species_name': 'nunique'
    }).reset_index()
    
    hourly.columns = ['hour', 'observation_count', 'unique_species']
    
    return hourly
