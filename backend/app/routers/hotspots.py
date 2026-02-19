"""
Hotspot & Gap Analysis API Router
"""
from fastapi import APIRouter
from typing import List
from app.models.schemas import HexBinResponse
from app.services.data_loader import DataLoader
from app.services.spatial import hex_bin_observations, identify_gaps
from app.config import HEX_RESOLUTION

router = APIRouter(prefix="/hotspots", tags=["hotspots"])


@router.get("/hexbins", response_model=List[HexBinResponse])
async def get_hexbins():
    """
    Get H3 hexagonal bins with observation density
    TODO: [Team Member] — Add resolution parameter and filtering options
    """
    gdf = DataLoader.get_cached_data()
    hex_gdf = hex_bin_observations(gdf, resolution=HEX_RESOLUTION)
    
    # Convert to response format
    hexbins = []
    for _, row in hex_gdf.iterrows():
        # Convert geometry to GeoJSON format
        geom = row['geometry']
        geojson_geom = {
            'type': 'Polygon',
            'coordinates': [list(geom.exterior.coords)]
        }
        
        hexbins.append({
            'hex_id': row['hex_id'],
            'center_lat': float(row['center_lat']),
            'center_lng': float(row['center_lng']),
            'observation_count': int(row['observation_count']),
            'unique_species': int(row['unique_species']),
            'biodiversity_yield': float(row['biodiversity_yield']),
            'habitat_type': row['habitat_type'],
            'priority_score': float(row['priority_score']),
            'geometry': geojson_geom
        })
    
    return hexbins


@router.get("/gaps", response_model=List[HexBinResponse])
async def get_gaps():
    """
    Get under-sampled gap areas with high biodiversity potential
    """
    gdf = DataLoader.get_cached_data()
    hex_gdf = hex_bin_observations(gdf, resolution=HEX_RESOLUTION)
    
    gaps_list = identify_gaps(hex_gdf, threshold=5)
    
    # Convert to response format
    gaps = []
    for gap in gaps_list[:20]:  # Return top 20 gaps
        geom = gap['geometry']
        geojson_geom = {
            'type': 'Polygon',
            'coordinates': [list(geom.exterior.coords)]
        }
        
        gaps.append({
            'hex_id': gap['hex_id'],
            'center_lat': float(gap['center_lat']),
            'center_lng': float(gap['center_lng']),
            'observation_count': int(gap['observation_count']),
            'unique_species': int(gap['unique_species']),
            'biodiversity_yield': float(gap['biodiversity_yield']),
            'habitat_type': gap['habitat_type'],
            'priority_score': float(gap['priority_score']),
            'geometry': geojson_geom
        })
    
    return gaps
