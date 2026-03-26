import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { handleValidationErrors } from '../middlewares/validation';

const router = Router();

// ── Validation chains ──────────────────────────────────────────────────────

const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 */
router.post(
  '/register',
  ...validateRegister,
  handleValidationErrors,
  (req, res, next) => authController.register(req, res, next),
);

/**
 * POST /api/auth/login
 */
router.post(
  '/login',
  ...validateLogin,
  handleValidationErrors,
  (req, res, next) => authController.login(req, res, next),
);

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));

/**
 * POST /api/auth/logout  (protected)
 */
router.post('/logout', authMiddleware, (req, res, next) => authController.logout(req, res, next));

/**
 * GET /api/auth/me  (protected)
 */
router.get('/me', authMiddleware, (req, res, next) => authController.me(req, res, next));

/**
 * GET /api/auth/google → redirect to Google consent screen
 */
router.get('/google', authController.googleLogin);

/**
 * GET /api/auth/google/callback → Google redirects back here
 */
router.get('/google/callback', (req, res, next) =>
  authController.googleCallback(req, res, next),
);

export default router;
