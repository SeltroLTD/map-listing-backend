import { PrismaClient } from '@prisma/client';
import { config } from './config';

/**
 * Singleton Prisma client.
 *
 * In development, Next.js/ts-node-dev cause module hot-reloads which would
 * open multiple connections. We cache the client on `global` to prevent that.
 */

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: config.isDev ? ['query', 'warn', 'error'] : ['error'],
  });

if (config.isDev) {
  global.__prisma = prisma;
}

export default prisma;
