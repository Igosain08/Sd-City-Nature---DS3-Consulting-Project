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
  // Core identifiers
  zone_id: string;  // Maps to hex_id
  hex_id?: string;  // Optional alias
  
  // Location
  center_lat: number;
  center_lng: number;
  
  // Performance metrics
  priority_score: number;
  priority_category: 'HIGH_PRIORITY' | 'MEDIUM_PRIORITY' | 'LOW_PRIORITY' | 'NO_DATA' | 'INSUFFICIENT_DATA';
  
  // Non-CNC baseline
  non_cnc_observation_count: number;
  non_cnc_unique_species: number;
  non_cnc_biodiversity_yield: number;
  
  // CNC performance
  cnc_observation_count: number;
  cnc_unique_species: number;
  cnc_biodiversity_yield: number;
  
  // Gap analysis
  mobilization_gap: number;
  
  // Recommendations
  rationale: string;
  recommended_time?: string;  // Optional, may not always have
  recommended_actions?: string[];
  target_taxa?: string[];
  
  // Geography
  geometry: GeoJSON.Geometry;
  
  // Legacy fields (optional for backwards compatibility)
  name?: string;
  radius_km?: number;
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
  taxon_group?: string;
}

export interface TimingWindow {
  day_of_week: string;
  hour: number;
  observation_count: number;
  unique_species: number;
  efficiency_score: number;
}

type MapHex = {
  zone_id: string;
  center_lat: number;
  center_lng: number;
  priority_score: number;
  geometry: GeoJSON.Geometry;
  priority_category?: PriorityZone['priority_category'];
};
type PriorityZonesBundle = { hexes: MapHex[]; top: PriorityZone[] };