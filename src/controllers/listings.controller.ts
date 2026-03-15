import { Request, Response, NextFunction } from 'express';
import { listingService } from '../services/listing.service';
import { CreateListingBody } from '../types';
import { sendSuccess } from '../utils/response';

/**
 * ListingsController
 *
 * Handles public-facing listing endpoints.
 * Controllers are intentionally thin — they:
 *   1. Extract data from the HTTP request
 *   2. Call the service layer
 *   3. Send the HTTP response
 *
 * All error handling is delegated to the global error-handler middleware
 * via next(err) or by simply letting async errors propagate (Express 5
 * auto-forwards async errors; for Express 4 we use try/catch + next).
 */
export class ListingsController {
  /**
   * GET /api/listings
   * Returns all approved listings.
   */
  async getListings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const listings = await listingService.getListings();
      sendSuccess(res, listings);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/listings/:id
   * Returns a single listing by ID.
   * Returns 404 if not found.
   */
  async getListingById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const listing = await listingService.getListingById(id);
      sendSuccess(res, listing);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/listings
   * Creates a new listing (status = pending).
   * Returns 201 with the created listing.
   */
  async createListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as CreateListingBody;
      const listing = await listingService.createListing(body);
      sendSuccess(res, listing, 201);
    } catch (err) {
      next(err);
    }
  }
}

// Export singleton
export const listingsController = new ListingsController();
