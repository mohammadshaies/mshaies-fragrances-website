import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

// Global singleton cache across serverless / SSR hot-reloads
const globalForDb = globalThis as unknown as {
  dbInstance: ReturnType<typeof drizzle<typeof schema>> | null;
  sqlClient: ReturnType<typeof postgres> | null;
  dbDisabled: boolean;
};

if (globalForDb.dbInstance === undefined) {
  globalForDb.dbInstance = null;
  globalForDb.sqlClient = null;
  globalForDb.dbDisabled = false;
}

// Check if direct database is configured and not explicitly disabled
if (
  !globalForDb.dbDisabled &&
  !globalForDb.dbInstance &&
  connectionString &&
  !connectionString.includes("your-project-ref") &&
  process.env.DISABLE_DRIZZLE !== "true"
) {
  try {
    // Keep max connections low (1-2) to prevent Supabase connection pool exhaustion in serverless
    globalForDb.sqlClient = postgres(connectionString, {
      prepare: false, // Required for Supabase transaction pooler (port 6543)
      max: 2,
      idle_timeout: 10,
      connect_timeout: 5,
      onnotice: () => {}, // Suppress notice warnings
    });
    globalForDb.dbInstance = drizzle(globalForDb.sqlClient, { schema });
  } catch (err) {
    console.warn("[Database] PostgreSQL client init skipped; Supabase REST API will serve requests:", err);
    globalForDb.dbInstance = null;
    globalForDb.dbDisabled = true;
  }
}

export const db = globalForDb.dbInstance;
export { schema };
export const isDatabaseConfigured = () => Boolean(globalForDb.dbInstance && !globalForDb.dbDisabled);
