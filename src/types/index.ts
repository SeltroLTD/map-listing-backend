import { ListingStatus } from '@prisma/client';

// ─── Re-export Prisma enum so the rest of the app doesn't import Prisma directly ───
export { ListingStatus };

// ─── Standard API Response shapes ───────────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown; // Validation errors, stack traces (dev only), etc.
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Listing DTOs ────────────────────────────────────────────────────────────────

/**
 * Shape of a listing returned to external callers.
 * Matches the Prisma model; could be narrowed in the future
 * (e.g. hide internal fields) without touching controllers.
 */
export interface ListingDto {
  id: string;
  title: string;
  address: string;
  pricePerBed: number;
  beds: number;
  description: string;
  whatsappNumber: string;
  latitude: number;
  longitude: number;
  metroStation: string;
  metroDistance: string;
  images: string[];
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Request Bodies ───────────────────────────────────────────────────────────────

/**
 * Payload sent by the frontend when creating a new listing.
 * Either (latitude + longitude) OR (address) must be present —
 * the service resolves whichever is missing.
 */
export interface CreateListingBody {
  title: string;
  address?: string;
  pricePerBed: number;
  beds: number;
  description: string;
  whatsappNumber: string;
  latitude?: number;
  longitude?: number;
  images: string[]; // Cloudinary URLs
}

// ─── Google Maps API response shapes (subset of what we use) ─────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
}

export interface PlaceResult {
  placeId: string;
  name: string;
  location: LatLng;
}

export interface DistanceResult {
  text: string;  // e.g. "850 m"
  value: number; // metres
}
