import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain, Meta } from 'express-validator';
import { sendError } from '../utils/response';

/**
 * Runs validation rules and aborts with 400 + error list if any fail.
 * Used as the last item in a validator array.
 */
export function handleValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed', 400, errors.array());
    return;
  }
  next();
}

// ─── Listing Creation Validators ─────────────────────────────────────────────────

/**
 * Validates the POST /api/listings body.
 *
 * Location rules:
 *   - If no latitude/longitude provided  → address is required
 *   - If latitude/longitude provided     → address is optional (reverse geocoded)
 *   - Both can be provided simultaneously (backend will confirm / fill gaps)
 */
export const validateCreateListing: ValidationChain[] = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),

  body('pricePerBed')
    .notEmpty().withMessage('pricePerBed is required')
    .isInt({ min: 1 }).withMessage('pricePerBed must be a positive integer'),

  body('beds')
    .notEmpty().withMessage('beds is required')
    .isInt({ min: 1 }).withMessage('beds must be a positive integer'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 5000 }).withMessage('Description must be at most 5000 characters'),

  body('whatsappNumber')
    .trim()
    .notEmpty().withMessage('WhatsApp number is required')
    .matches(/^\+?[0-9\s\-()]{7,20}$/).withMessage('Invalid WhatsApp number format'),

  body('images')
    .isArray({ min: 1 }).withMessage('At least one image URL is required'),

  body('images.*')
    .isURL().withMessage('Each image must be a valid URL'),

  // Address required only when lat/lng are absent
  body('address').if(
    (_value: unknown, meta: Meta) =>
      (meta.req as Request).body.latitude === undefined ||
      (meta.req as Request).body.longitude === undefined,
  )
    .notEmpty().withMessage('Address is required when latitude/longitude are not provided'),

  // When address is omitted, latitude + longitude must both be present
  body('latitude').if(
    (_value: unknown, meta: Meta) => !(meta.req as Request).body.address,
  )
    .notEmpty().withMessage('Latitude is required when address is not provided')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),

  body('longitude').if(
    (_value: unknown, meta: Meta) => !(meta.req as Request).body.address,
  )
    .notEmpty().withMessage('Longitude is required when address is not provided')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
];

// ─── Admin Validators ─────────────────────────────────────────────────────────────

export const validateListingId: ValidationChain[] = [
  param('id')
    .isUUID().withMessage('Listing ID must be a valid UUID'),
];

export const validateStatusQuery: ValidationChain[] = [
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('status must be one of: pending, approved, rejected'),
];
