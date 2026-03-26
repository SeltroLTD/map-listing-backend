import { Router } from "express";
import { listingsController } from "../controllers/listings.controller";
import {
  validateCreateListing,
  handleValidationErrors,
} from "../middlewares/validation";
import { authMiddleware, roleMiddleware } from "../middlewares/auth.middleware";
import { Role } from "../types";

const router = Router();

/**
 * Public Listings Routes
 *
 * GET  /api/listings          → returns only approved listings (public)
 * GET  /api/listings/:id      → returns a single listing (public)
 * POST /api/listings          → creates a new listing — HOTEL or ADMIN only
 * DELETE /api/listings/:id    → delete a listing — HOTEL or ADMIN only
 */

// Public
router.get("/", (req, res, next) =>
  listingsController.getListings(req, res, next),
);

router.get("/:id", (req, res, next) =>
  listingsController.getListingById(req, res, next),
);

// Protected – HOTEL or ADMIN
router.post(
  "/",
  authMiddleware,
  roleMiddleware([Role.HOTEL, Role.ADMIN]),
  ...validateCreateListing,
  handleValidationErrors,
  (req, res, next) => listingsController.createListing(req, res, next),
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware([Role.HOTEL, Role.ADMIN]),
  (req, res, next) => listingsController.deleteListing(req, res, next),
);

export default router;
