/**
 * Approximate boundaries for major San Diego parks and trails.
 * Coordinates are [lng, lat] (GeoJSON order) for each polygon ring (closed).
 * Used to filter observations to "Parks and Trails" only on the distribution map.
 */

export interface SDParkPolygon {
  name: string;
  /** Ring as [lng, lat][] (closed: first point need not repeat at end) */
  ring: [number, number][];
}

/** Approximate polygons for major SD parks/trails (bounding outlines). */
export const SD_PARKS_AND_TRAILS: SDParkPolygon[] = [
  {
    name: 'Balboa Park',
    ring: [
      [-117.155, 32.726],
      [-117.135, 32.726],
      [-117.135, 32.738],
      [-117.155, 32.738],
      [-117.155, 32.726],
    ],
  },
  {
    name: 'Mission Trails Regional Park',
    ring: [
      [-117.08, 32.77],
      [-116.96, 32.77],
      [-116.96, 32.85],
      [-117.08, 32.85],
      [-117.08, 32.77],
    ],
  },
  {
    name: 'Torrey Pines State Natural Reserve',
    ring: [
      [-117.27, 32.91],
      [-117.24, 32.91],
      [-117.24, 32.94],
      [-117.27, 32.94],
      [-117.27, 32.91],
    ],
  },
  {
    name: 'Cabrillo National Monument',
    ring: [
      [-117.245, 32.67],
      [-117.23, 32.67],
      [-117.23, 32.68],
      [-117.245, 32.68],
      [-117.245, 32.67],
    ],
  },
  {
    name: 'Los Peñasquitos Canyon Preserve',
    ring: [
      [-117.23, 32.91],
      [-117.18, 32.91],
      [-117.18, 32.95],
      [-117.23, 32.95],
      [-117.23, 32.91],
    ],
  },
  {
    name: 'Presidio Park',
    ring: [
      [-117.178, 32.756],
      [-117.172, 32.756],
      [-117.172, 32.76],
      [-117.178, 32.76],
      [-117.178, 32.756],
    ],
  },
  {
    name: 'Tecolote Canyon Natural Park',
    ring: [
      [-117.21, 32.81],
      [-117.17, 32.81],
      [-117.17, 32.84],
      [-117.21, 32.84],
      [-117.21, 32.81],
    ],
  },
  {
    name: 'Mission Bay Park',
    ring: [
      [-117.235, 32.76],
      [-117.19, 32.76],
      [-117.19, 32.79],
      [-117.235, 32.79],
      [-117.235, 32.76],
    ],
  },
];

/**
 * Ray-casting point-in-polygon: returns true if (lat, lng) is inside the polygon ring.
 * Ring is [lng, lat][] (x = lng, y = lat).
 */
function pointInRing(lng: number, lat: number, ring: [number, number][]): boolean {
  const n = ring.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat) {
      const x = ((lat - yj) * (xi - xj)) / (yi - yj) + xj;
      if (lng < x) inside = !inside;
    }
  }
  return inside;
}

/**
 * Returns true if the point (latitude, longitude) lies inside any of the major SD parks/trails.
 */
export function isInSDParkOrTrail(latitude: number, longitude: number): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return false;
  }
  return SD_PARKS_AND_TRAILS.some((p) => pointInRing(longitude, latitude, p.ring));
}
