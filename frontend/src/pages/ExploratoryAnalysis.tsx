import { useApi } from '../hooks/useApi';
import { ChartCard } from '../components/ChartCard';
import { MapWrapper } from '../components/MapWrapper';
import { Observation, SpeciesSummary, TemporalTrend } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';

/**
 * Exploratory Analysis Page
 * TODO: [Team Member] — Implement detailed exploratory data analysis
 */
export function ExploratoryAnalysis() {
  const { data: observations, loading: loadingObs, error: errorObs } = useApi<Observation[]>('/api/exploratory/observations');
  const { data: taxonomySummary, loading: loadingTax, error: errorTax } = useApi<SpeciesSummary[]>('/api/exploratory/taxonomy-summary');
  const { data: temporalTrends, loading: loadingTemp, error: errorTemp } = useApi<TemporalTrend[]>('/api/exploratory/temporal-trends');

  // Convert observations to map markers
  const markers = observations?.slice(0, 500).map(obs => ({
    lat: obs.latitude,
    lng: obs.longitude,
    popup: `${obs.common_name} (${obs.species_name})`,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Exploratory Analysis</h2>
        <p className="text-gray-600 mt-2">
          Spatial, taxonomic, and user-based exploratory data analysis of iNaturalist observations
        </p>
      </div>

      {/* Observation Map */}
      <ChartCard
        title="Observation Distribution Map"
        subtitle="Geographic distribution of observations across San Diego"
        loading={loadingObs}
        error={errorObs}
      >
        <MapWrapper markers={markers} height="600px" />
      </ChartCard>

      {/* Taxonomic Breakdown */}
      <ChartCard
        title="Taxonomic Breakdown"
        subtitle="Distribution of observations across taxonomic groups"
        loading={loadingTax}
        error={errorTax}
      >
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={taxonomySummary || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="taxon_group" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total_species" fill="#0ea5e9" name="Unique Species" />
            <Bar dataKey="total_observations" fill="#84cc16" name="Total Observations" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Temporal Trends */}
      <ChartCard
        title="Observations Over Time"
        subtitle="Daily observation counts during the challenge period"
        loading={loadingTemp}
        error={errorTemp}
      >
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={temporalTrends || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} name="Observations" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* TODO: Add user contribution distribution histogram */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <p className="text-blue-700">
          <strong>TODO:</strong> Implement user contribution distribution analysis
        </p>
      </div>
    </div>
  );
}
