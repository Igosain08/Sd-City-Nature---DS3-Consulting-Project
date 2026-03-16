"""
Pydantic response models for API endpoints
"""
from pydantic import BaseModel
from typing import List, Optional, Any, Literal, Dict



class ObservationResponse(BaseModel):
    """Single iNaturalist observation (optional contributor_tier for map color-by)."""
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
    contributor_tier: Optional[str] = None  # "1" | "2-5" | "6-20" | "21+" for map color-by


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


class SpeciesBreakdownItem(BaseModel):
    """Species name and observation count for drill-down bar chart."""
    species: str
    count: int


class SpeciesSummaryResponse(BaseModel):
    """Taxonomic group summary statistics"""
    taxon_group: str
    total_species: int
    total_observations: int
    top_species: List[str]
    species_breakdown: Optional[List[SpeciesBreakdownItem]] = None  # Top 9 species + Other


class TemporalTrendResponse(BaseModel):
    """Time-series observation data (daily counts; research_count for research-grade only)."""
    date: str
    count: int
    research_count: Optional[int] = None
    taxon_group: Optional[str] = None


class SpeciesAccumulationPoint(BaseModel):
    """One point on the species accumulation curve: observations 1..N (chronological) vs cumulative unique species."""
    observation_count: int
    unique_species: int


class HourlyByDowItem(BaseModel):
    """Hourly count for one day-of-week (for small multiples)."""
    day_of_week: int  # 0=Monday, 6=Sunday
    day_name: str
    hour: int
    count: int


class UserContributionBucketResponse(BaseModel):
    """Histogram bucket: number of users with observations in this range"""
    bucket_label: str
    user_count: int


class CityStatsResponse(BaseModel):
    """City-level statistics"""
    city: str
    year: int
    total_observations: int
    unique_species: int
    total_participants: int
    species_per_observer: float


class ComparisonMarkerResponse(BaseModel):
    """Single marker for comparison map (lat, lng, optional popup)."""
    lat: float
    lng: float
    popup: Optional[str] = None


class CitySpatialResponse(BaseModel):
    """Per-city spatial data for comparison maps (center + sample markers)."""
    city: str
    center_lat: float
    center_lng: float
    markers: List[ComparisonMarkerResponse]


class CityQualityResponse(BaseModel):
    """Research-grade and quality breakdown by city."""
    city: str
    total: int
    research_count: int
    needs_id_count: int
    casual_count: int
    research_pct: float


class CityContributorResponse(BaseModel):
    """Who contributes the most: mean observations per user by city."""
    city: str
    user_count: int
    total_observations: int
    mean_obs_per_user: float


class CityCaptiveWildResponse(BaseModel):
    """Captive vs wild share by city (Exploratory-style; only wild counts toward CNC)."""
    city: str
    wild_count: int
    captive_count: int
    wild_pct: float
    captive_pct: float


class CompetitionSplitResponse(BaseModel):
    """Comparison of metrics during vs outside the competition window."""
    window: str  # "competition" | "non_competition"
    observations: int
    unique_species: int
    participants: int
    research_pct: float
    species_per_observation: float


class CommunityRankItem(BaseModel):
    """Community ranked by observation count with biodiversity yield."""
    community: str
    observations: int
    unique_species: int
    participants: int
    species_per_observation: float


class TaxonComparisonItem(BaseModel):
    """Taxon group observation counts, optionally split by competition window."""
    taxon_group: str
    competition_count: int
    non_competition_count: int
    total: int


class TopSpeciesItem2(BaseModel):
    """A frequently observed species with observation count and common name."""
    scientific_name: str
    common_name: str
    count: int
    taxon_group: str


class CityTaxonItem(BaseModel):
    """Observation count per taxon group across comparison cities (CNC 2025).
    Uses model_config extra='allow' so any city column from the CSV is accepted."""
    model_config = {"extra": "allow"}
    taxon_group: str


class CityTopSpeciesItem(BaseModel):
    """A top species for a specific city."""
    city: str
    rank: int
    scientific_name: str
    common_name: str
    count: int
    taxon_group: str


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
    target_taxa: Optional[Dict[str, List[str]]] = None
    radius_km: Optional[float] = None
    recommended_actions: List[str] = []
    
    habitat: Optional[str] = None

    
    geometry: Any

    top_places: list[dict[str, Any]] = []


class PriorityZonesBundle(BaseModel):
    hexes: List[PriorityZoneOut]   # map
    top: List[PriorityZoneOut]     # cards


# Exploratory dashboard (Page 1) response shapes
class KPIsResponse(BaseModel):
    total_observations: int
    unique_species: int
    unique_observers: int
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    research_grade_pct: Optional[float] = None


class QualityGradeItem(BaseModel):
    grade: str
    count: int
    pct: float


class CaptiveWildResponse(BaseModel):
    captive_count: int
    wild_count: int
    captive_pct: float
    wild_pct: float


class ByCommunityItem(BaseModel):
    community: str
    count: int


class ByHourItem(BaseModel):
    hour: int
    count: int


class UserContributionDashboard(BaseModel):
    buckets: List[dict]  # [{ bucket_label, user_count, total_obs?, segment_name? }]
    pareto_pct: Optional[float] = None
    pareto_label: Optional[str] = None
    mean_obs_per_user: Optional[float] = None
    median_obs_per_user: Optional[float] = None
    mode_obs_per_user: Optional[int] = None
    mode_bucket: Optional[str] = None
    pareto_curve: List[dict] = []  # [{ user_pct, obs_pct }]
    research_rate_by_segment: List[dict] = []  # [{ bucket_label, research_pct }]


class UserRetentionResponse(BaseModel):
    users_2024: int
    users_2025: int
    users_both: int
    users_2024_only: int
    retention_pct: Optional[float] = None


class TopSpeciesItem(BaseModel):
    species: str
    count: int


class UploadDelayHistogramItem(BaseModel):
    bucket: str
    count: int


class UploadDelayResponse(BaseModel):
    same_day_pct: float
    median_hours: float
    histogram: List[UploadDelayHistogramItem]


class ResearchRateByTaxonItem(BaseModel):
    taxon_group: str
    total: int
    research_pct: float


class ExploratoryDashboardResponse(BaseModel):
    """Full dashboard for Page 1; nested fields may be null if data missing."""
    kpis: KPIsResponse
    quality_grade: List[QualityGradeItem]
    captive_wild: Optional[CaptiveWildResponse] = None
    by_community: List[ByCommunityItem]
    by_sd_neighborhood: List[ByCommunityItem] = []  # San Diego city neighborhoods (same shape as by_community)
    by_hour: List[ByHourItem]
    user_contribution: UserContributionDashboard
    top_species: List[TopSpeciesItem]
    upload_delay: Optional[UploadDelayResponse] = None
    research_rate_by_taxon: List[ResearchRateByTaxonItem]
    taxonomy_summary: List[SpeciesSummaryResponse] = []
    temporal_trends: List[TemporalTrendResponse] = []
    hourly_by_dow: List[HourlyByDowItem] = []
    user_retention: Optional[UserRetentionResponse] = None
