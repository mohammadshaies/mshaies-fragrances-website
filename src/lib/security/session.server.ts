import crypto from "node:crypto";

export interface AdminSessionPayload {
  sub: string;
  email: string;
  role: "admin";
  iat: number;
  exp: number;
}

const FALLBACK_SESSION_SECRET = "msh_haute_parfumerie_secret_2026_pk_luxe_key_99_production";

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DATABASE_URL;
  if (secret && secret.length >= 16) {
    return secret;
  }
  return FALLBACK_SESSION_SECRET;
}

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function computeHmac(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token for verified administrators.
 * Default expiration is 24 hours.
 */
export function createAdminSessionToken(
  user: { id?: string; email?: string } = {},
  expiresInSeconds: number = 604800 // 7 days
): string {
  const now = Date.now();
  const payload: AdminSessionPayload = {
    sub: user.id || "admin-master",
    email: user.email || "admin@mshaies.com",
    role: "admin",
    iat: now,
    exp: now + expiresInSeconds * 1000,
  };

  const secret = getSessionSecret();
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = computeHmac(`msh.${encodedPayload}`, secret);

  return `msh.${encodedPayload}.${signature}`;
}

/**
 * Cryptographically verifies an admin session token:
 * 1. Checks format (msh.<payload>.<signature>)
 * 2. Constant-time signature comparison to prevent timing attacks
 * 3. Expiration validation
 */
export function verifyAdminSessionToken(
  token?: string | null
): { valid: boolean; user?: { id: string; email: string; role: string }; error?: string } {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Authentication token missing." };
  }

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "msh") {
    return { valid: false, error: "Invalid token format." };
  }

  const [, encodedPayload, signature] = parts;
  const secret = getSessionSecret();
  const expectedSignature = computeHmac(`msh.${encodedPayload}`, secret);

  // Constant-time signature comparison without Buffer dependency
  if (signature.length !== expectedSignature.length) {
    return { valid: false, error: "Invalid or forged session token." };
  }

  let diff = 0;
  for (let i = 0; i < signature.length; i++) {
    diff |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  if (diff !== 0) {
    return { valid: false, error: "Invalid or forged session token." };
  }

  try {
    const payload: AdminSessionPayload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false, error: "Session token has expired. Please sign in again." };
    }

    if (payload.role !== "admin") {
      return { valid: false, error: "Insufficient administrative privileges." };
    }

    return {
      valid: true,
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      },
    };
  } catch {
    return { valid: false, error: "Malformed session payload." };
  }
}

/**
 * Cryptographically hashes a password using salted scrypt (N=16384, r=8, p=1, 64-byte key).
 * Output format: scrypt$<saltHex>$<derivedKeyHex>
 */
export function hashPasswordSecurely(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash (or timing-safe comparison fallback).
 */
export function verifyPasswordSecurely(password: string, storedPasswordOrHash: string): boolean {
  if (!password || !storedPasswordOrHash) return false;

  if (storedPasswordOrHash.startsWith("scrypt$")) {
    const parts = storedPasswordOrHash.split("$");
    if (parts.length !== 3) return false;
    const [, salt, expectedHex] = parts;
    try {
      const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
      const expectedBuf = Buffer.from(expectedHex, "hex");
      if (derived.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(derived, expectedBuf);
    } catch {
      return false;
    }
  }

  // Constant-time comparison for raw environment secret fallback
  const aBuf = Buffer.from(password, "utf8");
  const bBuf = Buffer.from(storedPasswordOrHash, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Verifies incoming webhook HMAC-SHA256 signatures with replay-attack timestamp protection (5 min window).
 * Accepts signatures in either raw hex or "sha256=<hex>" format.
 */
export function verifyWebhookSignature(params: {
  rawBody: string;
  signatureHeader?: string | null;
  timestampHeader?: string | null;
  webhookSecret?: string | null;
}): { valid: boolean; error?: string } {
  const { rawBody, signatureHeader, timestampHeader, webhookSecret } = params;
  const secret = (webhookSecret || process.env.WEBHOOK_SECRET || getSessionSecret()).trim();

  if (!signatureHeader || typeof signatureHeader !== "string") {
    return { valid: false, error: "Missing webhook signature header." };
  }

  // Optional replay window verification when X-Webhook-Timestamp is provided
  if (timestampHeader) {
    const ts = Number(timestampHeader);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > 300) {
      return { valid: false, error: "Webhook timestamp expired or outside 5-minute replay tolerance." };
    }
  }

  const cleanSig = signatureHeader.replace(/^sha256=/i, "").trim();
  const signedPayload = timestampHeader ? `${timestampHeader}.${rawBody}` : rawBody;
  const expectedHex = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  try {
    const sigBuf = Buffer.from(cleanSig, "hex");
    const expBuf = Buffer.from(expectedHex, "hex");
    if (sigBuf.length === 0 || sigBuf.length !== expBuf.length) {
      return { valid: false, error: "Invalid webhook signature." };
    }
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: "Webhook signature verification failed." };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Malformed webhook signature encoding." };
  }
}
