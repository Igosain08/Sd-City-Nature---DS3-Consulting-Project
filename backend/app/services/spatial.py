"""
Geospatial analysis utilities using H3 hexagonal binning
"""
import h3
import geopandas as gpd
import pandas as pd
from typing import List, Dict
from shapely.geometry import Polygon


def hex_bin_observations(gdf: gpd.GeoDataFrame, resolution: int = 7) -> gpd.GeoDataFrame:
    """
    Bin observations into H3 hexagons and aggregate statistics
    
    Args:
        gdf: GeoDataFrame with observation points
        resolution: H3 resolution level (7 = ~5.16 km² per hex)
        
    Returns:
        GeoDataFrame with hex bins and aggregated stats
    """
    # Assign H3 hex IDs to each observation
    gdf['hex_id'] = gdf.apply(
        lambda row: h3.latlng_to_cell(row.geometry.y, row.geometry.x, resolution),
        axis=1
    )
    
    # Aggregate by hex
    hex_stats = gdf.groupby('hex_id').agg({
        'id': 'count',
        'species_name': 'nunique',
    }).reset_index()
    
    hex_stats.columns = ['hex_id', 'observation_count', 'unique_species']
    
    # Calculate biodiversity yield
    hex_stats['biodiversity_yield'] = (
        hex_stats['unique_species'] / hex_stats['observation_count']
    )
    
    # Get hex geometries and centers
    hex_stats['center_lat'] = hex_stats['hex_id'].apply(
        lambda h: h3.cell_to_latlng(h)[0]
    )
    hex_stats['center_lng'] = hex_stats['hex_id'].apply(
        lambda h: h3.cell_to_latlng(h)[1]
    )
    
    # Create polygon geometries
    hex_stats['geometry'] = hex_stats['hex_id'].apply(
        lambda h: Polygon(h3.cell_to_boundary(h, geo_json=True))
    )
    
    # Add placeholder fields
    hex_stats['habitat_type'] = 'Mixed'
    hex_stats['priority_score'] = 50.0
    
    return gpd.GeoDataFrame(hex_stats, crs="EPSG:4326")


def identify_gaps(hex_gdf: gpd.GeoDataFrame, threshold: int = 10) -> List[Dict]:
    """
    Identify under-sampled gaps with low observation counts
    
    Args:
        hex_gdf: GeoDataFrame with hex bin statistics
        threshold: Minimum observation count threshold
        
    Returns:
        List of gap hexes with priority scores
    """
    gaps = hex_gdf[hex_gdf['observation_count'] < threshold].copy()
    
    # Calculate priority score based on surrounding context
    gaps['priority_score'] = 100 - (gaps['observation_count'] * 5)
    gaps['priority_score'] = gaps['priority_score'].clip(0, 100)
    
    return gaps.to_dict('records')


def compute_biodiversity_yield(hex_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Compute biodiversity yield (unique species / observations) for each hex
    
    Args:
        hex_gdf: GeoDataFrame with hex bin statistics
        
    Returns:
        GeoDataFrame with biodiversity_yield column added
    """
    hex_gdf['biodiversity_yield'] = (
        hex_gdf['unique_species'] / hex_gdf['observation_count']
    )
    return hex_gdf
