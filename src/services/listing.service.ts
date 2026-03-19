import prisma from '../config/prisma';
import { ListingStatus, CreateListingBody, ListingDto } from '../types';
import { AppError } from '../middlewares/errorHandler';
import { googleMapsService } from './googleMaps.service';
import { metroService } from './metro.service';
import { Listing } from '@prisma/client';

/**
 * Maps a Prisma Listing record to the external ListingDto shape.
 * Having this transform in one place means we can safely add/remove
 * internal DB fields without touching controllers.
 */
function toDto(listing: Listing): ListingDto {
  return {
    id: listing.id,
    title: listing.title,
    address: listing.address,
    pricePerBed: listing.pricePerBed,
    beds: listing.beds,
    description: listing.description,
    whatsappNumber: listing.whatsappNumber,
    latitude: listing.latitude,
    longitude: listing.longitude,
    metroStation: listing.metroStation,
    metroDistance: listing.metroDistance,
    images: listing.images,
    status: listing.status,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}

/**
 * ListingService
 *
 * Contains all business logic for listings.
 * Controllers are thin — they only parse the HTTP request and
 * delegate to this service layer.
 */
export class ListingService {
  // ─── Public Read Methods ──────────────────────────────────────────────────────

  /**
   * Returns all APPROVED listings for the public map view.
   * Ordered newest first.
   */
  async getListings(): Promise<ListingDto[]> {
    const listings = await prisma.listing.findMany({
      where: { status: ListingStatus.approved },
      orderBy: { createdAt: 'desc' },
    });
    return listings.map(toDto);
  }

  /**
   * Returns a single listing by ID regardless of status.
   * Throws 404 if not found.
   */
  async getListingById(id: string): Promise<ListingDto> {
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      throw new AppError('Listing not found', 404);
    }
    return toDto(listing);
  }

  // ─── Admin Read Methods ───────────────────────────────────────────────────────

  /**
   * Returns listings filtered by status (defaults to ALL statuses when
   * status param is undefined — useful for a future "all listings" admin view).
   */
  async getListingsByStatus(status?: ListingStatus): Promise<ListingDto[]> {
    const listings = await prisma.listing.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return listings.map(toDto);
  }

  // ─── Mutation Methods ─────────────────────────────────────────────────────────

  /**
   * Creates a new listing.
   *
   * Location resolution logic:
   *   - If only address provided  → geocode to get lat/lng
   *   - If only lat/lng provided  → reverse geocode to get address
   *   - If both provided          → use as-is (frontend confirmed them)
   *
   * After coordinates are resolved, metro station detection runs before save.
   */
  async createListing(body: CreateListingBody): Promise<ListingDto> {
    let { address, latitude, longitude } = body;

    // ── Step 1: Resolve missing location data ──────────────────────────────────

    if (latitude === undefined || longitude === undefined) {
      // Only address supplied → geocode it
      if (!address) {
        throw new AppError('Address is required when coordinates are not provided', 400);
      }
      const geocoded = await googleMapsService.geocodeAddress(address);
      address = geocoded.address; // Use the normalised/formatted address from Google
      latitude = geocoded.lat;
      longitude = geocoded.lng;
    } else if (!address) {
      // Only coordinates supplied → reverse geocode to get address
      const geocoded = await googleMapsService.reverseGeocode(latitude, longitude);
      address = geocoded.address;
    }

    // TypeScript narrowing — at this point all three are definitely set
    const resolvedLat: number = latitude;
    const resolvedLng: number = longitude;
    const resolvedAddress: string = address;

    // ── Step 2: Detect nearest metro station ───────────────────────────────────

    const { metroStation, metroDistance } =
      await metroService.findNearestMetroAndDistance(resolvedLat, resolvedLng);

    // ── Step 3: Persist ────────────────────────────────────────────────────────

    const listing = await prisma.listing.create({
      data: {
        title: body.title,
        address: resolvedAddress,
        pricePerBed: body.pricePerBed,
        beds: body.beds,
        description: body.description,
        whatsappNumber: body.whatsappNumber,
        latitude: resolvedLat,
        longitude: resolvedLng,
        images: body.images,
        metroStation,
        metroDistance,
        status: ListingStatus.pending, // New listings always start as pending
      },
    });

    return toDto(listing);
  }

  /**
   * Updates a listing's moderation status.
   * Used by both approve and reject admin actions.
   *
   * @throws AppError(404) when listing doesn't exist
   */
  async updateListingStatus(id: string, status: ListingStatus): Promise<ListingDto> {
    // Verify listing exists before attempting update
    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Listing not found', 404);
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: { status },
    });

    return toDto(updated);
  }
}

// Export a singleton
export const listingService = new ListingService();
