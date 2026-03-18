import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "./config";

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

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    adapter,
    log: config.isDev ? ["query", "warn", "error"] : ["error"],
  });

if (config.isDev) {
  global.__prisma = prisma;
}

export default prisma;
