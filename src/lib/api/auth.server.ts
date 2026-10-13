import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin, getSupabaseClient, isSupabaseConfigured, verifyAdminSession } from "../supabase.server";
import { db, schema, isDatabaseConfigured } from "../db/client.server";
import { createAdminSessionToken } from "../security/session.server";

// Rate limiting & lockout tracking for brute-force prevention
interface AttemptRecord {
  attempts: number;
  lockoutUntil: number;
}
const pinAttemptMap = new Map<string, AttemptRecord>();

function isRateLimited(identifier: string = "global_staff"): { limited: boolean; retryAfterSeconds: number } {
  const record = pinAttemptMap.get(identifier);
  if (!record) return { limited: false, retryAfterSeconds: 0 };

  const now = Date.now();
  if (record.lockoutUntil > now) {
    return { limited: true, retryAfterSeconds: Math.ceil((record.lockoutUntil - now) / 1000) };
  }

  // Lockout expired, reset if needed
  if (record.lockoutUntil > 0 && record.lockoutUntil <= now) {
    pinAttemptMap.delete(identifier);
  }

  return { limited: false, retryAfterSeconds: 0 };
}

function recordFailedAttempt(identifier: string = "global_staff"): { attemptsRemaining: number; lockedOut: boolean } {
  const now = Date.now();
  const record = pinAttemptMap.get(identifier) || { attempts: 0, lockoutUntil: 0 };
  record.attempts += 1;

  if (record.attempts >= 5) {
    record.lockoutUntil = now + 60000; // 60 seconds progressive lockout
    pinAttemptMap.set(identifier, record);
    return { attemptsRemaining: 0, lockedOut: true };
  }

  pinAttemptMap.set(identifier, record);
  return { attemptsRemaining: 5 - record.attempts, lockedOut: false };
}

function resetAttempts(identifier: string = "global_staff"): void {
  pinAttemptMap.delete(identifier);
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Server-side Master PIN authentication.
 * Replaces client-side PIN checking with server-side timing-safe comparison,
 * brute-force rate-limiting, and signed HMAC-SHA256 session token issuance.
 */
export const adminVerifyPinServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      pin: z.string().optional(),
    })
  )
  .handler(async () => {
    return {
      success: false,
      error: "Master PIN login has been permanently disabled. Please sign in with your Supabase administrator Email and Password.",
    };
  });

/**
 * Server-side Email & Password authentication for administrators using Supabase Auth.
 */
export const adminLoginServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      password: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    // 1. Supabase Auth Mode (Primary, Authoritative, & Secure)
    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const cleanEmail = data.email.trim().toLowerCase();
          const { data: authData, error } = await client.auth.signInWithPassword({
            email: cleanEmail,
            password: data.password,
          });

          if (error) {
            return {
              success: false,
              error: error.message || "Invalid email or password.",
            };
          }

          if (authData?.user && authData?.session) {
            const user = authData.user;
            const appRole = (user.app_metadata as any)?.role;
            const userRole = (user.user_metadata as any)?.role;

            let hasAdminRole =
              appRole === "admin" ||
              appRole === "superadmin" ||
              userRole === "admin" ||
              userRole === "superadmin";

            // Also check admin_users table if configured in Supabase
            if (!hasAdminRole) {
              const adminClient = getSupabaseAdmin();
              if (adminClient) {
                try {
                  const { data: adminRow } = await adminClient
                    .from("admin_users")
                    .select("role")
                    .eq("email", cleanEmail)
                    .maybeSingle();

                  if (adminRow && (adminRow.role === "admin" || adminRow.role === "superadmin")) {
                    hasAdminRole = true;
                  }
                } catch {
                  // Table might not exist yet
                }
              }
            }

            // Fallback: If explicit server env ADMIN_EMAIL matches
            const envAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
            if (!hasAdminRole && envAdminEmail && cleanEmail === envAdminEmail) {
              hasAdminRole = true;
            }

            // Strictly reject users without the admin role
            if (!hasAdminRole) {
              try {
                await client.auth.signOut();
              } catch {}
              return {
                success: false,
                error: "Access denied. Your account does not have the 'admin' role assigned in Supabase.",
              };
            }

            // Write to Supabase audit_logs table for comprehensive activity tracking
            try {
              const adminClient = getSupabaseAdmin();
              if (adminClient) {
                await adminClient.from("audit_logs").insert({
                  id: `log-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  action: "Staff Authentication",
                  category: "System",
                  details: `Administrator ${authData.user.email} signed into management portal.`,
                  user: authData.user.email || "Staff Admin",
                });
              }
            } catch (auditErr) {
              console.warn("[adminLoginServerFn] Audit log insert warning:", auditErr);
            }

            return {
              success: true,
              token: authData.session.access_token,
              user: {
                id: authData.user.id,
                email: authData.user.email,
                role: "admin",
              },
            };
          }
        } catch (err: any) {
          console.error("[adminLoginServerFn] Supabase Auth exception:", err);
          return {
            success: false,
            error: err?.message || "Failed to communicate with Supabase Auth.",
          };
        }
      }
    }

    // 2. Strict Fallback only if Supabase is offline AND explicit server environment variables exist
    const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const expectedPassword = process.env.ADMIN_PASSWORD?.trim();

    if (expectedEmail && expectedPassword) {
      const emailMatches = safeCompare(data.email.trim().toLowerCase(), expectedEmail);
      const passMatches = safeCompare(data.password, expectedPassword);

      if (emailMatches && passMatches) {
        const token = createAdminSessionToken({
          id: "master-admin",
          email: expectedEmail,
        });

        return {
          success: true,
          token,
          user: {
            id: "master-admin",
            email: expectedEmail,
            role: "admin",
          },
        };
      }
    }

    return {
      success: false,
      error: "Invalid email or password. Access denied.",
    };
  });

/**
 * Server function to verify an existing session token on client mount.
 */
export const verifyAdminStatusServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      authToken: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const auth = await verifyAdminSession(data.authToken);
    if (!auth.valid) {
      return { valid: false, error: auth.error || "Session invalid or expired." };
    }
    return {
      valid: true,
      user: {
        id: auth.user?.id || "admin",
        email: auth.user?.email || "admin@mshaies.com",
        role: "admin",
      },
    };
  });
