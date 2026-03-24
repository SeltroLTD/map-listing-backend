import { googleMapsService } from './googleMaps.service';
import { LatLng } from '../types';

/**
 * Haversine formula — computes the great-circle distance (in km) between
 * two lat/lng points. Used to pick the geometrically closest station before
 * hitting the distance Matrix API (which costs money per element).
 */
function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng *
      sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export interface MetroInfo {
  metroStation: string;
  metroDistance: string; // e.g. "650 m" or "1.2 km"
}

/**
 * MetroService
 *
 * Orchestrates the metro station detection workflow:
 *   1. Fetches nearby subway stations (Places API)
 *   2. Picks the closest by haversine distance
 *   3. Calculates the realistic walking distance (Distance Matrix API)
 *
 * Keeping this in its own service class means we can swap the
 * underlying data source (e.g. to a local DB of stations) without
 * touching any controller or listing service code.
 */
export class MetroService {
  /**
   * Finds the nearest metro station and calculates the walking distance
   * from the given coordinates.
   *
   * @param lat - Listing latitude
   * @param lng - Listing longitude
   * @returns MetroInfo with station name and formatted walking distance.
   *          Returns empty strings gracefully if no stations are found.
   */
  async findNearestMetroAndDistance(lat: number, lng: number): Promise<MetroInfo> {
    const listingLocation: LatLng = { lat, lng };

    // Step 1 — Find candidate stations within 2 km
    // Wrap in try/catch: if the Places API fails (e.g. REQUEST_DENIED due to
    // a missing/invalid API key or disabled billing), we gracefully skip metro
    // data rather than failing the entire listing-creation request.
    let stations: Awaited<ReturnType<typeof googleMapsService.nearbyMetroStations>> = [];
    try {
      stations = await googleMapsService.nearbyMetroStations(lat, lng, 2000);
    } catch (err) {
      console.error('[metro] nearbyMetroStations failed — skipping metro data:', err);
      return { metroStation: '', metroDistance: '' };
    }

    if (stations.length === 0) {
      // No metro nearby — store empty strings rather than failing the listing creation
      return { metroStation: '', metroDistance: '' };
    }

    // Step 2 — Sort candidates by haversine distance and pick the closest
    // This avoids calling Distance Matrix for every candidate (saves API quota)
    const sorted = stations
      .map((station) => ({
        station,
        distKm: haversineDistanceKm(listingLocation, station.location),
      }))
      .sort((a, b) => a.distKm - b.distKm);

    const nearest = sorted[0]!.station;

    // Step 3 — Calculate actual walking distance for the nearest station
    const distance = await this.calculateWalkingDistance(listingLocation, nearest.location);

    return {
      metroStation: nearest.name,
      metroDistance: distance,
    };
  }

  /**
   * Calculates the walking distance string between two points.
   * Returns a human-readable string such as "650 m" or "1.2 km".
   *
   * If the Distance Matrix call fails (e.g. API quota exhausted),
   * we fall back to a haversine estimate rather than failing the listing.
   */
  async calculateWalkingDistance(origin: LatLng, destination: LatLng): Promise<string> {
    try {
      const result = await googleMapsService.distanceMatrix(origin, destination);
      return result.text;
    } catch {
      // Graceful fallback: compute straight-line distance
      const km = haversineDistanceKm(origin, destination);
      return km < 1
        ? `~${Math.round(km * 1000)} m (est.)`
        : `~${km.toFixed(1)} km (est.)`;
    }
  }
}

// Export a singleton
export const metroService = new MetroService();
