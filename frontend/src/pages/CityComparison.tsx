import { useApi } from '../hooks/useApi';
import { ChartCard } from '../components/ChartCard';
import { CityStats } from '../types';
import { formatNumber } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * City Comparison Page
 * TODO: [Team Member] — Implement comparative analysis across cities
 */
export function CityComparison() {
  const { data: cityStats, loading: loadingStats, error: errorStats } = useApi<CityStats[]>('/api/comparison/city-stats');
  const { data: yearlyTrends, loading: loadingTrends, error: errorTrends } = useApi<CityStats[]>('/api/comparison/yearly-trends');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">City Comparison</h2>
        <p className="text-gray-600 mt-2">
          Comparative analysis of San Diego vs. San Antonio vs. Los Angeles
        </p>
      </div>

      {/* City Stats Table */}
      <ChartCard
        title="City Statistics Overview"
        subtitle="Comparison of key metrics across participating cities"
        loading={loadingStats}
        error={errorStats}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  City
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Observations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unique Species
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participants
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Species/Observer
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cityStats?.map((stat, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {stat.city}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {stat.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {formatNumber(stat.total_observations)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {formatNumber(stat.unique_species)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {formatNumber(stat.total_participants)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {stat.species_per_observer.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Yearly Trends Chart */}
      <ChartCard
        title="Multi-Year Trends"
        subtitle="Unique species counts over time by city"
        loading={loadingTrends}
        error={errorTrends}
      >
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={yearlyTrends || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="unique_species" fill="#0ea5e9" name="Unique Species" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* TODO: Add spatial distribution comparison maps */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <p className="text-blue-700">
          <strong>TODO:</strong> Add side-by-side spatial distribution maps for each city
        </p>
      </div>
    </div>
  );
}
