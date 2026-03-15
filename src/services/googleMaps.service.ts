import axios from 'axios';
import { config } from '../config/config';
import { AppError } from '../middlewares/errorHandler';
import { GeocodeResult, PlaceResult, DistanceResult, LatLng } from '../types';

/**
 * GoogleMapsService
 *
 * Wraps four Google Maps Platform APIs:
 *   1. Geocoding API       – address → lat/lng
 *   2. Reverse Geocoding   – lat/lng → formatted address
 *   3. Places Nearby Search – find nearby subway stations
 *   4. Distance Matrix API  – walking distance between two points
 *
 * All methods throw AppError so errors bubble cleanly through the
 * centralised error handler without reaching raw catch blocks in services.
 */
export class GoogleMapsService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor() {
    this.apiKey = config.google.mapsApiKey;
  }

  // ─── Helper ────────────────────────────────────────────────────────────────────

  /**
   * Appends the API key to any params object before dispatching the request.
   */
  private async get<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}/json`;
    const response = await axios.get<T>(url, {
      params: { ...params, key: this.apiKey },
      timeout: 10_000, // 10 s – prevents hanging requests from blocking the server
    });
    return response.data;
  }

  // ─── Geocoding ─────────────────────────────────────────────────────────────────

  /**
   * Converts a human address string into latitude/longitude coordinates.
   *
   * @throws AppError(400) when address cannot be geocoded
   * @throws AppError(502) when Google API returns an error status
   */
  async geocodeAddress(address: string): Promise<GeocodeResult> {
    interface GeoResponse {
      status: string;
      results: Array<{
        formatted_address: string;
        geometry: { location: LatLng };
      }>;
    }

    const data = await this.get<GeoResponse>('geocode', { address });

    if (data.status === 'ZERO_RESULTS') {
      throw new AppError(`Could not geocode address: "${address}"`, 400);
    }

    if (data.status !== 'OK' || !data.results[0]) {
      throw new AppError(`Geocoding API error: ${data.status}`, 502);
    }

    const result = data.results[0];
    return {
      address: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    };
  }

  // ─── Reverse Geocoding ─────────────────────────────────────────────────────────

  /**
   * Converts latitude/longitude into a human-readable formatted address.
   *
   * @throws AppError(400) when coordinates have no matching address
   * @throws AppError(502) when Google API returns an error status
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
    interface ReverseGeoResponse {
      status: string;
      results: Array<{
        formatted_address: string;
        geometry: { location: LatLng };
      }>;
    }

    const data = await this.get<ReverseGeoResponse>('geocode', {
      latlng: `${lat},${lng}`,
    });

    if (data.status === 'ZERO_RESULTS') {
      throw new AppError(`No address found for coordinates (${lat}, ${lng})`, 400);
    }

    if (data.status !== 'OK' || !data.results[0]) {
      throw new AppError(`Reverse Geocoding API error: ${data.status}`, 502);
    }

    const result = data.results[0];
    return {
      address: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    };
  }

  // ─── Nearby Metro Stations ─────────────────────────────────────────────────────

  /**
   * Finds nearby subway stations using the Places Nearby Search API.
   *
   * @param lat     - Listing latitude
   * @param lng     - Listing longitude
   * @param radius  - Search radius in metres (default: 2000 m)
   * @returns Array of places sorted by distance (closest first), capped at 5
   */
  async nearbyMetroStations(
    lat: number,
    lng: number,
    radius = 2000,
  ): Promise<PlaceResult[]> {
    interface PlacesResponse {
      status: string;
      results: Array<{
        place_id: string;
        name: string;
        geometry: { location: LatLng };
      }>;
    }

    const data = await this.get<PlacesResponse>('place/nearbysearch', {
      location: `${lat},${lng}`,
      radius: String(radius),
      type: 'subway_station',
    });

    // ZERO_RESULTS just means no stations nearby — not an error we should throw
    if (data.status === 'ZERO_RESULTS') {
      return [];
    }

    if (data.status !== 'OK') {
      throw new AppError(`Places API error: ${data.status}`, 502);
    }

    return data.results.slice(0, 5).map((r) => ({
      placeId: r.place_id,
      name: r.name,
      location: r.geometry.location,
    }));
  }

  // ─── Distance Matrix ───────────────────────────────────────────────────────────

  /**
   * Calculates the walking distance between two lat/lng points using the
   * Distance Matrix API.
   *
   * @param origin      - Starting point (listing location)
   * @param destination - End point (metro station location)
   * @returns DistanceResult with human-readable text and numeric metres value
   */
  async distanceMatrix(origin: LatLng, destination: LatLng): Promise<DistanceResult> {
    interface DistanceMatrixResponse {
      status: string;
      rows: Array<{
        elements: Array<{
          status: string;
          distance: { text: string; value: number };
          duration: { text: string; value: number };
        }>;
      }>;
    }

    const data = await this.get<DistanceMatrixResponse>('distancematrix', {
      origins: `${origin.lat},${origin.lng}`,
      destinations: `${destination.lat},${destination.lng}`,
      mode: 'walking',
      units: 'metric',
    });

    if (data.status !== 'OK') {
      throw new AppError(`Distance Matrix API error: ${data.status}`, 502);
    }

    const element = data.rows[0]?.elements[0];

    if (!element || element.status !== 'OK') {
      throw new AppError('Could not calculate walking distance', 502);
    }

    return {
      text: element.distance.text,
      value: element.distance.value,
    };
  }
}

// Export a singleton to avoid multiple instantiations
export const googleMapsService = new GoogleMapsService();
