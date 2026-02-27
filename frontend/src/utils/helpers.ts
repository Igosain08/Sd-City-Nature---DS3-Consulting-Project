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
// gets the color gradients
export function getPriorityColor(score: number) {
  const s = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;

  // 4 buckets => 5 breakpoints (last is exclusive)
  const breaks = [0, 25, 50, 75, 101];

  let k = 0;
  while (k < breaks.length - 1 && s >= breaks[k + 1]) k++; // k = 0..3

  // Low = light cyan, High = dark navy
  const hueSteps =        [180, 200, 210, 220];
  const saturationSteps = [96, 94, 92, 88];
  const lightnessSteps =  [74, 58, 40, 22];

  return `hsl(${hueSteps[k]} ${saturationSteps[k]}% ${lightnessSteps[k]}%)`;
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
