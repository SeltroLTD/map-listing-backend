import { Router } from 'express';
import { listingsController } from '../controllers/listings.controller';
import {
  validateCreateListing,
  handleValidationErrors,
} from '../middlewares/validation';

const router = Router();

/**
 * Public Listings Routes
 *
 * GET  /api/listings          → returns only approved listings
 * GET  /api/listings/:id      → returns a single listing (any status)
 * POST /api/listings          → creates a new listing (status = pending)
 */

router.get(
  '/',
  (req, res, next) => listingsController.getListings(req, res, next),
);

router.get(
  '/:id',
  (req, res, next) => listingsController.getListingById(req, res, next),
);

router.post(
  '/',
  // Validation chain runs first; handleValidationErrors aborts with 400 on failure
  ...validateCreateListing,
  handleValidationErrors,
  (req, res, next) => listingsController.createListing(req, res, next),
);

export default router;
