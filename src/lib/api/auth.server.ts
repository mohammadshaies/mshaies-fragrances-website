import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { getSupabaseClient, isSupabaseConfigured } from "../supabase.server";
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

    // Retrieve active Master PIN from authoritative database, env var, or dev default
    let activePin: string | null = process.env.ADMIN_PIN?.trim() || null;
    if (isDatabaseConfigured() && db) {
      try {
        const settingsRow = await db.select().from(schema.storeSettings).limit(1);
        if (settingsRow.length > 0 && settingsRow[0].adminPin) {
          activePin = settingsRow[0].adminPin;
        }
      } catch (err) {
        console.warn("[adminVerifyPinServerFn] Database PIN read failed, using system PIN:", err);
      }
    }

    if (!activePin) {
      if (process.env.NODE_ENV === "production") {
        return {
          success: false,
          error: "Administrative Master PIN is unconfigured. Set ADMIN_PIN in production environment variables.",
        };
      }
      activePin = "7860"; // Permitted strictly in local development
    }

    const cleanInput = data.pin.trim();
    if (safeCompare(cleanInput, activePin)) {
      resetAttempts("global_staff");
      const sessionToken = createAdminSessionToken({
        id: "staff-pin-admin",
        email: "concierge@mshaies.com",
      });

      return {
        success: true,
        token: sessionToken,
        user: {
          id: "staff-pin-admin",
          email: "concierge@mshaies.com",
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
      error: `Invalid Master PIN. ${attemptsRemaining} attempt(s) remaining.`,
    };
  });

/**
 * Server-side Email & Password authentication for administrators.
 */
export const adminLoginServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
    })
  )
  .handler(async ({ data }) => {
    // 1. Supabase Auth Mode (Production)
    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();
      if (!client) {
        return { success: false, error: "Authentication client unavailable." };
      }

      const { data: authData, error } = await client.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error || !authData.session) {
        return {
          success: false,
          error: error?.message || "Invalid email or password.",
        };
      }

      return {
        success: true,
        token: authData.session.access_token,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      };
    }

    // 2. Standalone Server-Side Admin Mode (Cryptographic HMAC Session Token)
    const expectedEmail = process.env.ADMIN_EMAIL?.trim() || "admin@mshaies.com";
    const expectedPassword = process.env.ADMIN_PASSWORD?.trim() || (process.env.NODE_ENV === "development" ? "Mshaies7860!" : "");

    if (expectedPassword && safeCompare(data.email.toLowerCase(), expectedEmail.toLowerCase()) && safeCompare(data.password, expectedPassword)) {
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

    return {
      success: false,
      error: "Invalid administrative credentials.",
    };
  });
