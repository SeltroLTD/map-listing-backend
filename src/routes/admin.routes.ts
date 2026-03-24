import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import {
  validateListingId,
  validateStatusQuery,
  handleValidationErrors,
} from '../middlewares/validation';

const router = Router();

/**
 * Admin Routes
 *
 * GET   /api/admin/listings?status=pending  → filter listings by status
 * PATCH /api/admin/listings/:id/approve     → approve a listing
 * PATCH /api/admin/listings/:id/reject      → reject a listing
 * DELETE /api/admin/listings/:id            → permanently delete a listing
 *
 * Phase 2 note: Add auth middleware here before delegating to the controller:
 *   router.use(authMiddleware);
 */

router.get(
  '/listings',
  ...validateStatusQuery,
  handleValidationErrors,
  (req, res, next) => adminController.getAdminListings(req, res, next),
);

router.patch(
  '/listings/:id/approve',
  ...validateListingId,
  handleValidationErrors,
  (req, res, next) => adminController.approveListing(req, res, next),
);

router.patch(
  '/listings/:id/reject',
  ...validateListingId,
  handleValidationErrors,
  (req, res, next) => adminController.rejectListing(req, res, next),
);

router.delete(
  '/listings/:id',
  ...validateListingId,
  handleValidationErrors,
  (req, res, next) => adminController.deleteListing(req, res, next),
);

export default router;
