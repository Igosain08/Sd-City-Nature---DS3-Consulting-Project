"""
Data loading and caching utilities
"""
import pandas as pd
import geopandas as gpd
from typing import Optional
from pathlib import Path
import os

# Module-level cache
_cached_data: Optional[gpd.GeoDataFrame] = None


class DataLoader:
    """Handles loading and caching of iNaturalist observation data"""
    
    @staticmethod
    def load_observations(city: str = "San Diego") -> gpd.GeoDataFrame:
        """
        Load iNaturalist observations from CSV and convert to GeoDataFrame
        
        Args:
            city: City name ("San Diego", "San Antonio", "Los Angeles")
            
        Returns:
            GeoDataFrame with observation data
        """
        # TODO: Implement actual CSV loading
        # For now, return dummy data structure
        data = {
            'id': range(1, 101),
            'species_name': ['Quercus agrifolia'] * 100,
            'common_name': ['Coast Live Oak'] * 100,
            'taxon_group': ['Plants'] * 50 + ['Birds'] * 50,
            'latitude': [32.7 + i * 0.01 for i in range(100)],
            'longitude': [-117.1 - i * 0.01 for i in range(100)],
            'observed_on': ['2026-04-26'] * 100,
            'time_of_day': ['morning'] * 100,
            'user_id': ['user_1'] * 100,
            'quality_grade': ['research'] * 100,
            'city': [city] * 100,
        }
        
        df = pd.DataFrame(data)
        gdf = gpd.GeoDataFrame(
            df,
            geometry=gpd.points_from_xy(df.longitude, df.latitude),
            crs="EPSG:4326"
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
