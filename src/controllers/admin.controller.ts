import { Request, Response, NextFunction } from 'express';
import { listingService } from '../services/listing.service';
import { ListingStatus } from '../types';
import { sendSuccess } from '../utils/response';

/**
 * AdminController
 *
 * Handles admin-only listing management endpoints.
 *
 * Note: Authentication / authorization middleware is intentionally NOT
 * included in the Phase 1 MVP — the routes are wired directly.
 * Phase 2 will add a JWT auth middleware that wraps these routes.
 * The controller itself will not need to change.
 */
export class AdminController {
  /**
   * GET /api/admin/listings?status=pending
   * Returns listings filtered by status query param.
   * Defaults to returning ALL listings when status is omitted.
   */
  async getAdminListings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawStatus = req.query['status'] as string | undefined;

      // Parse status string into the enum (already validated by middleware)
      const status = rawStatus
        ? (rawStatus as ListingStatus)
        : undefined;

      const listings = await listingService.getListingsByStatus(status);
      sendSuccess(res, listings);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/admin/listings/:id/approve
   * Sets listing status to "approved".
   */
  async approveListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const listing = await listingService.updateListingStatus(id, ListingStatus.approved);
      sendSuccess(res, listing);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/admin/listings/:id/reject
   * Sets listing status to "rejected".
   */
  async rejectListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const listing = await listingService.updateListingStatus(id, ListingStatus.rejected);
      sendSuccess(res, listing);
    } catch (err) {
      next(err);
    }
  }
}

// Export singleton
export const adminController = new AdminController();
