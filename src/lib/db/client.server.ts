import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlClient: ReturnType<typeof postgres> | null = null;

if (connectionString && !connectionString.includes("your-project-ref")) {
  try {
    sqlClient = postgres(connectionString, {
      prepare: false, // Required for Supabase transaction pooler (port 6543)
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    dbInstance = drizzle(sqlClient, { schema });
  } catch (err) {
    console.warn("[Database] Failed to initialize PostgreSQL client, using fallback mode:", err);
    dbInstance = null;
  }
}

export const db = dbInstance;
export { schema };
export const isDatabaseConfigured = () => !!dbInstance;
