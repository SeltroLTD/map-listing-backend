import dotenv from 'dotenv';

// Load .env file before anything else reads process.env
dotenv.config();

/**
 * Validates that a required env variable exists and is non-empty.
 * Throws at startup so misconfiguration surfaces immediately.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

export const config = {
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  isDev: (process.env['NODE_ENV'] ?? 'development') === 'development',

  database: {
    url: requireEnv('DATABASE_URL'),
  },

  google: {
    mapsApiKey: requireEnv('GOOGLE_MAPS_API_KEY'),
  },

  cors: {
    // Accept comma-separated list; fall back to localhost dev origins
    origins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000,http://localhost:5173')
      .split(',')
      .map((o) => o.trim()),
  },
} as const;
