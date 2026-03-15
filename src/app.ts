import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config/config';
import { errorHandler } from './middlewares/errorHandler';
import listingsRouter from './routes/listings.routes';
import adminRouter from './routes/admin.routes';

/**
 * Creates and configures the Express application.
 *
 * Separating app creation from server startup (server.ts) lets us
 * import `app` in tests without actually binding to a port.
 */
export function createApp(): Application {
  const app = express();

  // ── Security headers (helmet sets X-Content-Type-Options, CSP, etc.) ──────────
  app.use(helmet());

  // ── CORS ──────────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: config.cors.origins,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    }),
  );

  // ── Body parsing ──────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── HTTP request logging ──────────────────────────────────────────────────────
  if (config.isDev) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // ── Health-check endpoint — useful for load balancers / Docker healthchecks ───
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── API Routes ────────────────────────────────────────────────────────────────
  app.use('/api/listings', listingsRouter);
  app.use('/api/admin', adminRouter);

  // ── 404 fallthrough handler ───────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  // ── Global error handler (MUST be last) ──────────────────────────────────────
  app.use(errorHandler);

  return app;
}
