import dotenv from 'dotenv';

// Load .env file before anything else reads process.env
dotenv.config();

/**
 * Returns the value of a required environment variable.
 *
 * IMPORTANT — Vercel Serverless note:
 * We do NOT call this at module-load time (i.e. outside a function body).
 * If a required env var is missing and this throws during the cold-start
 * module evaluation, the entire serverless function crashes *before* any
 * request arrives, which Vercel surfaces as a 502 with no useful log entry.
 *
 * Instead, call `requireEnv` lazily inside a getter or at request time so
 * the error reaches the global error handler and returns a proper 500.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

/**
 * Application configuration.
 *
 * google.mapsApiKey and database.url are exposed as getters so that
 * `requireEnv` is evaluated lazily (on first access) rather than at
 * module-import time.  This prevents a cold-start crash on Vercel when
 * env vars have not yet been propagated.
 */
export const config = {
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  isDev: (process.env['NODE_ENV'] ?? 'development') === 'development',

  database: {
    get url() {
      return requireEnv('DATABASE_URL');
    },
  },

  google: {
    get mapsApiKey() {
      return requireEnv('GOOGLE_MAPS_API_KEY');
    },
    get clientId() {
      return requireEnv('GOOGLE_CLIENT_ID');
    },
    get clientSecret() {
      return requireEnv('GOOGLE_CLIENT_SECRET');
    },
  },

  jwt: {
    get secret() {
      return requireEnv('JWT_SECRET');
    },
    get refreshSecret() {
      return requireEnv('JWT_REFRESH_SECRET');
    },
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },

  app: {
    get frontendUrl() {
      return process.env['FRONTEND_URL'] ?? 'http://localhost:5173';
    },
  },

  cors: {
    // Accept comma-separated list; fall back to localhost dev origins
    get origins() {
      return (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000,http://localhost:5173')
        .split(',')
        .map((o) => o.trim());
    },
  },
} as const;
