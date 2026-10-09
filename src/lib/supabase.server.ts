import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = () =>
  Boolean(
    supabaseUrl &&
    !supabaseUrl.includes("your-project-ref") &&
    (supabaseServiceKey || supabaseAnonKey)
  );

// Server-side Supabase client with Service Role privileges (bypasses RLS for trusted server logic)
export const getSupabaseAdmin = () => {
  if (!isSupabaseConfigured()) return null;
  return createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

// Client-compatible Supabase client using Anon Key
export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
};

import { verifyAdminSessionToken } from "./security/session.server";

// Comprehensive Auth & Session verification for protected admin server functions
export async function verifyAdminSession(token?: string | null): Promise<{ valid: boolean; user?: any; error?: string }> {
  if (!token || typeof token !== "string" || !token.trim()) {
    return { valid: false, error: "Missing administrative authorization token. Access denied." };
  }

  const cleanToken = token.trim();

  // 1. Check if token is a server-signed HMAC session token
  if (cleanToken.startsWith("msh.")) {
    const sessionCheck = verifyAdminSessionToken(cleanToken);
    if (sessionCheck.valid) {
      return sessionCheck;
    }
  }

  // 2. Check Supabase Auth JWT if Supabase is configured
  if (isSupabaseConfigured()) {
    const client = getSupabaseAdmin();
    if (client) {
      try {
        const { data: { user }, error } = await client.auth.getUser(cleanToken);
        if (!error && user) {
          return { valid: true, user: { id: user.id, email: user.email, role: "admin" } };
        }
      } catch (err: any) {
        console.warn("[verifyAdminSession] Supabase JWT verification error:", err?.message);
      }
    }
  }

  // 3. Isolated Development Fallback — strictly disabled in production
  if (process.env.NODE_ENV === "development" && cleanToken === "dev-admin-session-token") {
    return { valid: true, user: { email: "admin@mshaies.com", id: "dev-admin", role: "admin" } };
  }

  // 4. Default: Fail closed
  return { valid: false, error: "Invalid or expired administrative credentials." };
}
