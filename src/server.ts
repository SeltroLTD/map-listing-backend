import { createApp } from './app';
import { config } from './config/config';
import prisma from './config/prisma';

const app = createApp();

/**
 * Starts the HTTP server.
 *
 * We wrap startup in an async IIFE so we can await the Prisma connection
 * verification before binding to the port. This surfaces DB misconfiguration
 * clearly at startup rather than on the first request.
 */
async function start(): Promise<void> {
  // Verify Prisma can connect to the database
  try {
    await prisma.$connect();
    console.log('✅  Database connected');
  } catch (err) {
    console.error('❌  Failed to connect to database:', err);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`🚀  Server running on http://localhost:${config.port}`);
    console.log(`    Environment: ${config.nodeEnv}`);
    console.log(`    API base:    http://localhost:${config.port}/api`);
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────────
  // Close the server and DB connection before the process exits so that
  // in-flight requests can finish and connection pools drain cleanly.

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('👋  Server and database connection closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Catch unhandled promise rejections to prevent silent crashes
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });
}

start();
