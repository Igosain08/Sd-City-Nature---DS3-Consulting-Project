"""
Exploratory Analysis API Router
"""
from fastapi import APIRouter
from typing import List
from app.models.schemas import ObservationResponse, SpeciesSummaryResponse, TemporalTrendResponse
from app.services.data_loader import DataLoader
from app.services.taxonomy import summarize_by_taxon, get_temporal_trends

router = APIRouter(prefix="/exploratory", tags=["exploratory"])


@router.get("/observations", response_model=List[ObservationResponse])
async def get_observations():
    """
    Get all observations for exploratory analysis
    TODO: [Team Member] — Add filtering parameters (date range, taxon, quality grade)
    """
    gdf = DataLoader.get_cached_data()
    
    # Convert to list of dicts
    observations = []
    for _, row in gdf.head(1000).iterrows():  # Limit to first 1000 for performance
        observations.append({
            'id': int(row['id']),
            'species_name': row['species_name'],
            'common_name': row['common_name'],
            'taxon_group': row['taxon_group'],
            'latitude': float(row['latitude']),
            'longitude': float(row['longitude']),
            'observed_on': row['observed_on'],
            'time_of_day': row['time_of_day'],
            'user_id': row['user_id'],
            'quality_grade': row['quality_grade'],
            'city': row['city']
        })
    
    return observations


@router.get("/taxonomy-summary", response_model=List[SpeciesSummaryResponse])
async def get_taxonomy_summary():
    """
    Get taxonomic breakdown of observations
    """
    gdf = DataLoader.get_cached_data()
    summary = summarize_by_taxon(gdf)
    return summary


@router.get("/temporal-trends", response_model=List[TemporalTrendResponse])
async def get_temporal_trends():
    """
    Get time-series observation trends
    """
    gdf = DataLoader.get_cached_data()
    trends = get_temporal_trends(gdf)
    return trends
