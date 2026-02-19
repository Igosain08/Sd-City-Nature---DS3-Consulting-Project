"""
Pydantic response models for API endpoints
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Any


class ObservationResponse(BaseModel):
    """Single iNaturalist observation"""
    id: int
    species_name: str
    common_name: str
    taxon_group: str
    latitude: float
    longitude: float
    observed_on: str
    time_of_day: str
    user_id: str
    quality_grade: str
    city: str


class HexBinResponse(BaseModel):
    """H3 hexagon bin with aggregated statistics"""
    hex_id: str
    center_lat: float
    center_lng: float
    observation_count: int
    unique_species: int
    biodiversity_yield: float
    habitat_type: str
    priority_score: float
    geometry: dict  # GeoJSON Polygon


class SpeciesSummaryResponse(BaseModel):
    """Taxonomic group summary statistics"""
    taxon_group: str
    total_species: int
    total_observations: int
    top_species: List[str]


class TemporalTrendResponse(BaseModel):
    """Time-series observation data"""
    date: str
    count: int
    taxon_group: Optional[str] = None


class CityStatsResponse(BaseModel):
    """City-level statistics"""
    city: str
    year: int
    total_observations: int
    unique_species: int
    total_participants: int
    species_per_observer: float


class PriorityZoneResponse(BaseModel):
    """Priority observation zone recommendation"""
    zone_id: str
    name: str
    center_lat: float
    center_lng: float
    radius_km: float
    priority_score: float
    recommended_time: str
    target_taxa: List[str]
    rationale: str
    geometry: dict  # GeoJSON Polygon


class TimingWindowResponse(BaseModel):
    """Optimal timing window for observations"""
    day_of_week: str
    hour: int
    observation_count: int
    unique_species: int
    efficiency_score: float
