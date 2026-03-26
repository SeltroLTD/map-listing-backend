import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { authService } from '../services/auth.service';
import { config } from '../config/config';
import { sendSuccess } from '../utils/response';
import { Role } from '../types';
import type { RegisterBody, LoginBody } from '../types';

// ── Configure Google Passport Strategy ────────────────────────────────────

passport.use(
  new GoogleStrategy(
    {
      clientID: (() => {
        try { return config.google.clientId; } catch { return 'NOT_SET'; }
      })(),
      clientSecret: (() => {
        try { return config.google.clientSecret; } catch { return 'NOT_SET'; }
      })(),
      callbackURL: `${(() => { try { return config.app.frontendUrl.replace('3000', '3001'); } catch { return 'http://localhost:3001'; }})()}/api/auth/google/callback`,
      scope: ['profile', 'email'],
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
        const { user, tokens } = await authService.upsertGoogleUser(profile);
        done(null, { user, tokens });
      } catch (err) {
        done(err as Error);
      }
    },
  ),
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user as Express.User));

export class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, role } = req.body as RegisterBody & { role?: 'CUSTOMER' | 'HOTEL' };
      const assignedRole = role === 'HOTEL' ? Role.HOTEL : Role.CUSTOMER;
      const { user, tokens } = await authService.register(name, email, password, assignedRole);
      res.status(201).json({
        success: true,
        data: { user, ...tokens },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as LoginBody;
      const { user, tokens } = await authService.login(email, password);
      res.json({ success: true, data: { user, ...tokens } });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/refresh
   * Body: { refreshToken: string }
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body as { refreshToken: string };
      if (!refreshToken) {
        res.status(400).json({ success: false, error: 'refreshToken is required' });
        return;
      }
      const tokens = await authService.refreshAccessToken(refreshToken);
      res.json({ success: true, data: tokens });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/logout
   * Requires authMiddleware
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await authService.logout(req.user.id);
      }
      res.json({ success: true, data: { message: 'Logged out' } });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me
   * Requires authMiddleware
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getUserById(req.user!.id);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/google — initiates OAuth flow
   */
  googleLogin = passport.authenticate('google', { scope: ['profile', 'email'], session: false });

  /**
   * GET /api/auth/google/callback — OAuth callback
   */
  googleCallback(req: Request, res: Response, next: NextFunction): void {
    passport.authenticate('google', { session: false }, (err: Error | null, data: { user: unknown; tokens: { accessToken: string; refreshToken: string } } | null) => {
      if (err || !data) {
        const frontendUrl = (() => { try { return config.app.frontendUrl; } catch { return 'http://localhost:3000'; }})();
        res.redirect(`${frontendUrl}/auth/login?error=oauth_failed`);
        return;
      }
      const frontendUrl = (() => { try { return config.app.frontendUrl; } catch { return 'http://localhost:3000'; }})();
      const params = new URLSearchParams({
        token: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
      });
      res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
    })(req, res, next);
  }
}

export const authController = new AuthController();
export { passport };
