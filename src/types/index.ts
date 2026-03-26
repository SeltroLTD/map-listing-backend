import { ListingStatus } from '@prisma/client';

// ─── Re-export Prisma enums ────────────────────────────────────────────────
export { ListingStatus };

/**
 * Role string-literal union type, matching the Prisma schema Role enum values.
 * We define this locally because @prisma/client in Prisma 7 does not re-export
 * enum types directly. The const object provides runtime values for comparisons.
 */
export type Role = 'ADMIN' | 'CUSTOMER' | 'HOTEL';
export const Role = {
  ADMIN: 'ADMIN' as Role,
  CUSTOMER: 'CUSTOMER' as Role,
  HOTEL: 'HOTEL' as Role,
} as const;

// ─── Standard API Response shapes ─────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Listing DTOs ──────────────────────────────────────────────────────────

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
  userId?: string | null;
}

// ─── Auth DTOs ─────────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  name: string;
  email: string;
  provider: string;
  role: Role;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;   // userId
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

// ─── Request Bodies ────────────────────────────────────────────────────────

export interface CreateListingBody {
  title: string;
  address?: string;
  pricePerBed: number;
  beds: number;
  description: string;
  whatsappNumber: string;
  latitude?: number;
  longitude?: number;
  images: string[];
}

export interface RegisterBody {
  name: string;
  email: string;
  password: string;
  role?: 'CUSTOMER' | 'HOTEL';
}

export interface LoginBody {
  email: string;
  password: string;
}

// ─── Google Maps API response shapes ──────────────────────────────────────

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
  text: string;
  value: number;
}
