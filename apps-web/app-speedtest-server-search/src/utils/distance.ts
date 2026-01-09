/**
 * Calculate the distance between two geographic points using the Haversine formula.
 * @returns Distance in kilometers
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/**
 * Format distance for display.
 * Shows km for distances >= 1km, otherwise shows meters.
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm >= 1) {
    return `${numberFormatter.format(Math.round(distanceKm))} km`;
  }
  return `${numberFormatter.format(Math.round(distanceKm * 1000))} m`;
}

export interface GeoCoordinate {
  lat: number;
  lon: number;
}

export type WithDistance<T> = T & { distance: number | null };

/**
 * Calculate distances from a reference point to each item and sort by distance.
 * @param items - Items with lat/lon properties (as strings or numbers)
 * @param from - Reference point to calculate distances from, or null to skip distance calculation
 * @param getCoords - Function to extract lat/lon from each item
 * @returns Items with distance property added, sorted by distance (nearest first) if `from` is provided
 */
export function withDistancesSorted<T>(
  items: T[],
  from: GeoCoordinate | null,
  getCoords: (item: T) => { lat: string | number; lon: string | number }
): WithDistance<T>[] {
  const withDistance = items.map((item) => {
    if (!from) {
      return { ...item, distance: null };
    }
    const coords = getCoords(item);
    const lat = typeof coords.lat === 'string' ? parseFloat(coords.lat) : coords.lat;
    const lon = typeof coords.lon === 'string' ? parseFloat(coords.lon) : coords.lon;
    const distance = haversineDistance(from.lat, from.lon, lat, lon);
    return { ...item, distance };
  });

  if (from) {
    withDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }

  return withDistance;
}
