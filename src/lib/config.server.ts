import process from "node:process";
import { z } from "zod";

/**
 * Server Configuration Schema.
 * Validates and sanitizes environment variables, providing security guarantees
 * and preventing secret leakage.
 */
const ServerConfigSchema = z.object({
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
  databaseUrl: z.string().optional(),
  supabaseUrl: z.string().url().optional().or(z.literal("")),
  supabaseAnonKey: z.string().optional(),
  supabaseServiceRoleKey: z.string().optional(),
  geminiApiKey: z.string().optional(),
  ollamaEnabled: z.string().optional(),
  ollamaBaseUrl: z.string().url().optional(),
  ollamaModel: z.string().min(1).optional(),
  sessionSecret: z.string().min(16).optional(),
  adminPin: z.string().min(4).max(12).optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).optional(),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export function getServerConfig(): ServerConfig {
  const parsed = ServerConfigSchema.safeParse({
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    ollamaEnabled: process.env.OLLAMA_ENABLED,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
    ollamaModel: process.env.OLLAMA_MODEL,
    sessionSecret: process.env.SESSION_SECRET,
    adminPin: process.env.ADMIN_PIN,
    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,
  });

  if (!parsed.success) {
    console.error("[Config Error] Invalid server environment variables:", parsed.error.format());
    return {
      nodeEnv: (process.env.NODE_ENV as any) || "development",
    };
  }

  return parsed.data;
}

/**
 * Diagnostic security posture report (safe for logging, exposes no secret values).
 */
export function getSecurityConfigurationStatus() {
  const config = getServerConfig();
  return {
    environment: config.nodeEnv,
    databaseConfigured: Boolean(config.databaseUrl && !config.databaseUrl.includes("your-project-ref")),
    supabaseConfigured: Boolean(config.supabaseUrl && !config.supabaseUrl.includes("your-project-ref") && config.supabaseServiceRoleKey),
    sessionSecretConfigured: Boolean(config.sessionSecret && config.sessionSecret.length >= 16),
    geminiAiConfigured: Boolean(config.geminiApiKey && config.geminiApiKey.length > 10 && !config.geminiApiKey.includes("your-gemini-api-key")),
    customMasterPinConfigured: Boolean(config.adminPin && config.adminPin !== "7860"),
  };
}
