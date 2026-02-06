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
    summary = gdf.groupby('taxon_group').agg({
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
            .head(3)
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
    Bin observations by date and return time-series data
    
    Args:
        gdf: GeoDataFrame with observation data
        
    Returns:
        List of temporal trend records
    """
    # Group by date
    trends = gdf.groupby('observed_on').agg({
        'id': 'count'
    }).reset_index()
    
    trends.columns = ['date', 'count']
    
    return trends.to_dict('records')


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
