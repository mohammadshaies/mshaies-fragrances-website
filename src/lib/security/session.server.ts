import crypto from "node:crypto";

export interface AdminSessionPayload {
  sub: string;
  email: string;
  role: "admin";
  iat: number;
  exp: number;
}

let devRuntimeSecret: string | null = null;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DATABASE_URL;
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[Security Violation] SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL) must be configured with at least 16 characters in production."
    );
  }
  // In development, create an ephemeral random key per server instance if not provided,
  // preventing predictable token forgery from static code analysis.
  if (!devRuntimeSecret) {
    devRuntimeSecret = crypto.randomBytes(32).toString("hex");
    console.warn(
      "[Security Notice] Using generated ephemeral session secret for development. Set SESSION_SECRET in .env for persistent sessions across restarts."
    );
  }
  return devRuntimeSecret;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf8").toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
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
  expiresInSeconds: number = 86400
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

  // Constant-time signature comparison
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
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
