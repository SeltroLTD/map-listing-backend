import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { config } from './config/config';
import { errorHandler } from './middlewares/errorHandler';
import listingsRouter from './routes/listings.routes';
import adminRouter from './routes/admin.routes';
import authRouter from './routes/auth.routes';
import { passport } from './controllers/auth.controller';

export function createApp(): Application {
  const app = express();

  // ── Security headers ──────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: config.cors.origins,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    }),
  );

  // ── Body parsing & cookies ────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ── Passport (stateless — no session) ────────────────────────────────────
  app.use(passport.initialize());

  // ── HTTP request logging ──────────────────────────────────────────────────
  if (config.isDev) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // ── Health-check ──────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── API Routes ────────────────────────────────────────────────────────────
  app.use('/api/auth', authRouter);
  app.use('/api/listings', listingsRouter);
  app.use('/api/admin', adminRouter);

  // ── 404 fallthrough ───────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  // ── Global error handler (MUST be last) ──────────────────────────────────
  app.use(errorHandler);

  return app;
}
