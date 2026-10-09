import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
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
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Server-side Master PIN authentication.
 * Replaces client-side PIN checking with server-side timing-safe comparison,
 * brute-force rate-limiting, and signed HMAC-SHA256 session token issuance.
 */
export const adminVerifyPinServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      pin: z.string().min(4).max(12),
    })
  )
  .handler(async ({ data }) => {
    const rateCheck = isRateLimited("global_staff");
    if (rateCheck.limited) {
      return {
        success: false,
        error: `Too many failed attempts. Security console locked. Retry in ${rateCheck.retryAfterSeconds}s.`,
      };
    }

    // Retrieve active Master PIN from environment, database, or settings (strictly requiring non-default configuration)
    let activePin: string | null = process.env.ADMIN_PIN?.trim() || null;
    if (!activePin && isDatabaseConfigured() && db) {
      try {
        const settingsRow = await db.select().from(schema.storeSettings).limit(1);
        if (settingsRow.length > 0 && settingsRow[0].adminPin && settingsRow[0].adminPin !== "7860") {
          activePin = settingsRow[0].adminPin.trim();
        }
      } catch (err) {
        console.warn("[adminVerifyPinServerFn] Database PIN read failed:", err);
      }
    }

    if (!activePin && isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdmin() || getSupabaseClient();
        if (client) {
          const { data: dbData } = await client.from("store_settings").select("admin_pin").limit(1).maybeSingle();
          if (dbData?.admin_pin && dbData.admin_pin !== "7860") {
            activePin = String(dbData.admin_pin).trim();
          }
        }
      } catch (err) {
        console.warn("[adminVerifyPinServerFn] Supabase PIN read failed:", err);
      }
    }

    const cleanInput = data.pin.trim();
    if (activePin && safeCompare(cleanInput, activePin)) {
      resetAttempts("global_staff");
      const sessionToken = createAdminSessionToken({
        id: "staff-pin-admin",
        email: "admin@mshaies.com",
      });

      return {
        success: true,
        token: sessionToken,
        user: {
          id: "staff-pin-admin",
          email: "admin@mshaies.com",
          role: "admin",
        },
      };
    }

    const { attemptsRemaining, lockedOut } = recordFailedAttempt("global_staff");
    if (lockedOut) {
      return {
        success: false,
        error: "5 consecutive failed PIN attempts. Console locked for 60 seconds.",
      };
    }

    return {
      success: false,
      error: `Invalid Emergency PIN. ${attemptsRemaining} attempt(s) remaining.`,
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
          const { data: authData, error } = await client.auth.signInWithPassword({
            email: data.email.trim(),
            password: data.password,
          });

          if (error) {
            return {
              success: false,
              error: error.message || "Invalid email or password.",
            };
          }

          if (authData?.session) {
            // Write to Supabase audit_logs table for comprehensive activity tracking
            try {
              const adminClient = getSupabaseAdmin();
              if (adminClient) {
                await adminClient.from("audit_logs").insert({
                  id: `log-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  action: "Staff Authentication",
                  category: "System",
                  details: `User ${authData.user.email} successfully logged into management portal.`,
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
    const expectedEmail = process.env.ADMIN_EMAIL?.trim();
    const expectedPassword = process.env.ADMIN_PASSWORD?.trim();

    if (expectedEmail && expectedPassword) {
      const emailMatches = safeCompare(data.email.trim().toLowerCase(), expectedEmail.toLowerCase());
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
