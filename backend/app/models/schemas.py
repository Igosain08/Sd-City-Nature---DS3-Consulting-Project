"""
Pydantic response models for API endpoints
"""
from pydantic import BaseModel
from typing import List, Optional, Any, Literal


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


class TimingWindowResponse(BaseModel):
    """Optimal timing window for observations"""
    day_of_week: str
    hour: int
    observation_count: int
    unique_species: int
    efficiency_score: float


PriorityCategory = Literal[
    "HIGH_PRIORITY", "MEDIUM_PRIORITY", "LOW_PRIORITY", "NO_DATA", "INSUFFICIENT_DATA"
]


class PriorityZoneOut(BaseModel):
    zone_id: str
    name: Optional[str] = None

    center_lat: float
    center_lng: float

    priority_score: float
    priority_category: PriorityCategory = "NO_DATA"

    non_cnc_observation_count: int = 0
    non_cnc_unique_species: int = 0
    non_cnc_biodiversity_yield: float = 0.0

    cnc_observation_count: int = 0
    cnc_unique_species: int = 0
    cnc_biodiversity_yield: float = 0.0

    mobilization_gap: float = 0.0
    rationale: str = ""

    recommended_time: Optional[str] = None
    target_taxa: List[str] = []
    radius_km: Optional[float] = None
    recommended_actions: List[str] = []

    geometry: Any

class PriorityZonesBundle(BaseModel):
    hexes: List[PriorityZoneOut]   # map
    top: List[PriorityZoneOut]     # cards
