"""
Data loading and caching utilities
"""
import pandas as pd
import geopandas as gpd
from typing import Optional
from pathlib import Path
import os
from functools import lru_cache
import h3

# Module-level cache
_cached_data: Optional[gpd.GeoDataFrame] = None
_cached_county_boundary: Optional[gpd.GeoDataFrame] = None


class DataLoader:
    """Handles loading and caching of iNaturalist observation data"""
    
    @staticmethod
    def load_observations(city: str = "San Diego") -> gpd.GeoDataFrame:
        df = pd.read_csv("data/cleaned_finalized_dataset_final.csv.zip")
        gdf = gpd.GeoDataFrame(
            df,
            geometry=gpd.points_from_xy(df.longitude, df.latitude),
            crs="EPSG:4326"
        )
        
        # compute once at load time so hex observation lookups are instant
        gdf["hex7"] = gdf.apply(
            lambda row: h3.latlng_to_cell(row.geometry.y, row.geometry.x, 7)
            if row.geometry is not None else None,
            axis=1
        )

        return gdf
    
    @staticmethod
    def get_cached_data() -> gpd.GeoDataFrame:
        """
        Returns cached observation data, loading it if necessary
        
        Returns:
            Cached GeoDataFrame
        """
        global _cached_data
        
        if _cached_data is None:
            _cached_data = DataLoader.load_observations()
        
        return _cached_data
    
    
    @staticmethod
    def load_data():
        """Initialize data cache on application startup"""
        global _cached_data
        _cached_data = DataLoader.load_observations()
        print(f"Loaded {len(_cached_data)} observations into cache")
        
    

    # app/services/data_loader.py

# app/services/data_loader.py

   