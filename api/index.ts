import { createApp } from '../src/app';

// ── Startup diagnostics ───────────────────────────────────────────────────────
// These logs appear in Vercel's Function Logs panel and help debug cold-start
// failures caused by missing environment variables.
console.log('[startup] NODE_ENV              :', process.env['NODE_ENV'] ?? '(not set)');
console.log('[startup] DATABASE_URL set      :', !!process.env['DATABASE_URL']);
console.log('[startup] GOOGLE_MAPS_API_KEY set:', !!process.env['GOOGLE_MAPS_API_KEY']);
console.log('[startup] CORS_ORIGINS          :', process.env['CORS_ORIGINS'] ?? '(not set — using defaults)');

const app = createApp();

export default app;
