/**
 * Utility helper functions for SD City Nature Challenge app
 */

/**
 * Formats a number with commas for better readability
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Formats a date string to a more readable format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculates biodiversity yield (unique species per observation)
 */
export function calculateBiodiversityYield(
  uniqueSpecies: number,
  totalObservations: number
): number {
  if (totalObservations === 0) return 0;
  return uniqueSpecies / totalObservations;
}

/**
 * Gets color for priority score (0-100)
 */
export function getPriorityColor(score: number): string {
  if (score >= 75) return '#dc2626'; // high priority - red
  if (score >= 50) return '#f97316'; // medium-high - orange
  if (score >= 25) return '#eab308'; // medium - yellow
  return '#22c55e'; // low priority - green
}

/**
 * Gets color for biodiversity yield
 */
export function getBiodiversityYieldColor(yield_value: number): string {
  if (yield_value >= 0.7) return '#059669'; // excellent - green
  if (yield_value >= 0.5) return '#84cc16'; // good - lime
  if (yield_value >= 0.3) return '#eab308'; // fair - yellow
  return '#ef4444'; // poor - red
}

/**
 * Truncates text to a specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
