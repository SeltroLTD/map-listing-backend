import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import {
  validateListingId,
  validateStatusQuery,
  handleValidationErrors,
} from '../middlewares/validation';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/auth.middleware';
import { Role } from '../types';

const router = Router();

/**
 * Admin Routes — all protected by authMiddleware + ADMIN role
 *
 * GET   /api/admin/listings?status=pending  → filter listings by status
 * PATCH /api/admin/listings/:id/approve     → approve a listing
 * PATCH /api/admin/listings/:id/reject      → reject a listing
 * DELETE /api/admin/listings/:id            → permanently delete a listing
 */

// Apply auth + ADMIN role guard to all admin routes
router.use(authMiddleware, roleMiddleware([Role.ADMIN]));

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
