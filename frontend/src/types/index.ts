// Shared TypeScript interfaces for SD City Nature Challenge

export interface Observation {
  id: number;
  species_name: string;
  common_name: string;
  taxon_group: string; // "Plants" | "Birds" | "Insects" | "Reptiles" | ...
  latitude: number;
  longitude: number;
  observed_on: string; // ISO date
  time_of_day: string; // "morning" | "afternoon" | "evening" | "night"
  user_id: string;
  quality_grade: string; // "research" | "needs_id" | "casual"
  city: string; // "San Diego" | "San Antonio" | "Los Angeles"
  contributor_tier?: string | null; // "1" | "2-5" | "6-20" | "21+" for map color-by
}

export interface HexBin {
  hex_id: string;
  center_lat: number;
  center_lng: number;
  observation_count: number;
  unique_species: number;
  biodiversity_yield: number; // unique_species / observation_count
  habitat_type: string;
  priority_score: number; // 0–100
  geometry: GeoJSON.Polygon;
}

export interface SpeciesSummary {
  taxon_group: string;
  total_species: number;
  total_observations: number;
  top_species: string[];
}

export interface CityStats {
  city: string;
  year: number;
  total_observations: number;
  unique_species: number;
  total_participants: number;
  species_per_observer: number;
}

export interface PriorityZone {
  zone_id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  priority_score: number;
  recommended_time: string;
  target_taxa: string[];
  rationale: string;
  geometry: GeoJSON.Polygon;
}

export interface MarkerData {
  lat: number;
  lng: number;
  popup?: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface TemporalTrend {
  date: string;
  count: number;
  research_count?: number;
  taxon_group?: string;
}

export interface HourlyByDowItem {
  day_of_week: number;
  day_name: string;
  hour: number;
  count: number;
}

/** Histogram bucket for user contribution: observations per user (e.g. "1", "2–5", "6–10") */
export interface UserContributionBucket {
  bucket_label: string;
  user_count: number;
}

export interface TimingWindow {
  day_of_week: string;
  hour: number;
  observation_count: number;
  unique_species: number;
  efficiency_score: number;
}

// Exploratory dashboard (Page 1)
export interface ExploratoryKPIs {
  total_observations: number;
  unique_species: number;
  unique_observers: number;
  date_range_start: string | null;
  date_range_end: string | null;
  research_grade_pct: number | null;
}

export interface QualityGradeItem {
  grade: string;
  count: number;
  pct: number;
}

export interface CaptiveWild {
  captive_count: number;
  wild_count: number;
  captive_pct: number;
  wild_pct: number;
}

export interface ByCommunityItem {
  community: string;
  count: number;
}

export interface ByHourItem {
  hour: number;
  count: number;
}

export interface UserContributionDashboard {
  buckets: { bucket_label: string; user_count: number; total_obs?: number; segment_name?: string }[];
  pareto_pct: number | null;
  pareto_label: string | null;
  mean_obs_per_user?: number | null;
  median_obs_per_user?: number | null;
  mode_obs_per_user?: number | null;
  mode_bucket?: string | null;
  pareto_curve?: { user_pct: number; obs_pct: number }[];
  research_rate_by_segment?: { bucket_label: string; research_pct: number }[];
}

export interface UserRetention {
  users_2024: number;
  users_2025: number;
  users_both: number;
  users_2024_only: number;
  retention_pct: number | null;
}

export interface TopSpeciesItem {
  species: string;
  count: number;
}

export interface UploadDelayResponse {
  same_day_pct: number;
  median_hours: number;
  histogram: { bucket: string; count: number }[];
}

export interface ResearchRateByTaxonItem {
  taxon_group: string;
  total: number;
  research_pct: number;
}

export interface ExploratoryDashboard {
  kpis: ExploratoryKPIs;
  quality_grade: QualityGradeItem[];
  captive_wild: CaptiveWild | null;
  by_community: ByCommunityItem[];
  by_hour: ByHourItem[];
  user_contribution: UserContributionDashboard;
  top_species: TopSpeciesItem[];
  upload_delay: UploadDelayResponse | null;
  research_rate_by_taxon: ResearchRateByTaxonItem[];
  taxonomy_summary?: SpeciesSummary[];
  temporal_trends?: TemporalTrend[];
  hourly_by_dow?: HourlyByDowItem[];
  user_retention?: UserRetention | null;
}
