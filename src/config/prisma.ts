import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "./config";

/**
 * Singleton Prisma client.
 *
 * In development, ts-node-dev causes module hot-reloads which would
 * open multiple DB connections. We cache the instance on `global` to prevent that.
 *
 * NOTE: We intentionally do NOT annotate the variable as `: PrismaClient` because
 * the driver-adapter constructor returns a *narrower* generic type that carries
 * all the generated model methods (.user, .listing, …). An explicit annotation
 * would widen it back to the base type and make model methods invisible to TS.
 */

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

function createPrismaClient() {
  return new PrismaClient({
    adapter,
    log: config.isDev ? ["query", "warn", "error"] : ["error"],
  });
}

type PrismaClientSingleton = ReturnType<typeof createPrismaClient>;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClientSingleton | undefined;
}

const prisma = global.__prisma ?? createPrismaClient();

if (config.isDev) {
  global.__prisma = prisma;
}

export default prisma;
