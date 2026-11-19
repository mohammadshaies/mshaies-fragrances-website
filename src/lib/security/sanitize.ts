/**
 * Comprehensive Input Validation, XSS Sanitization, File Upload Verification,
 * Email Verification, and Sensitive Log Redaction Utilities.
 */

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi,
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /\bon[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
];

/**
 * Strips XSS payloads, HTML script/iframe/svg tags, and inline event handlers
 * from user-provided strings while preserving legitimate punctuation and Urdu/Arabic/English text.
 */
export function sanitizeText(input: unknown, maxLength: number = 2000): string {
  if (input === null || input === undefined) return "";
  let str = String(input)
    .replace(/\0/g, "") // Strip null bytes
    .trim();

  for (const pattern of DANGEROUS_PATTERNS) {
    str = str.replace(pattern, "");
  }

  // Strip raw angle-bracket HTML tags while keeping normal text
  str = str.replace(/<\/?[a-z][a-z0-9-]*\b[^>]*>/gi, "");

  return str.slice(0, maxLength).trim();
}

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
]);

const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Verifies an email address for RFC compliance, SMTP header injection safety,
 * valid TLD structure, and blocks disposable/throwaway domains.
 */
export function verifyEmailAddress(email: unknown): { valid: boolean; normalized: string; error?: string } {
  if (typeof email !== "string" || !email.trim()) {
    return { valid: false, normalized: "", error: "Email address is required." };
  }

  const normalized = email.trim().toLowerCase();

  if (normalized.length > 150) {
    return { valid: false, normalized: "", error: "Email address exceeds maximum length." };
  }

  // Block CR/LF SMTP header injection and null bytes
  if (/[\r\n\0]/.test(normalized)) {
    return { valid: false, normalized: "", error: "Invalid characters in email address." };
  }

  if (!STRICT_EMAIL_REGEX.test(normalized)) {
    return { valid: false, normalized: "", error: "Please enter a valid email address." };
  }

  const domain = normalized.split("@")[1] || "";
  const tld = domain.split(".").pop() || "";
  if (tld.length < 2) {
    return { valid: false, normalized: "", error: "Email domain has an invalid top-level domain." };
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { valid: false, normalized: "", error: "Disposable email addresses are not permitted." };
  }

  return { valid: true, normalized };
}

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const MAX_BASE64_LENGTH = 6_000_000; // ~4.5 MB decoded binary limit

/**
 * Validates product and banner image uploads:
 * 1. Allows safe relative local asset paths (e.g. /product-box.jpg)
 * 2. Allows HTTPS image URLs (blocks javascript:, data:text/html, file:, http://127.0.0.1)
 * 3. For Base64 data URLs, enforces strict MIME allowlist (blocks SVG XSS), size limits,
 *    and verifies binary magic byte signatures.
 */
export function validateImageUpload(imageStr: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (typeof imageStr !== "string" || !imageStr.trim()) {
    return { valid: true, sanitized: "/product-box.jpg" };
  }

  const trimmed = imageStr.trim();

  // 1. Safe local static path
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    if (/[<>:"|?*\0\r\n]/.test(trimmed) || trimmed.includes("..")) {
      return { valid: false, sanitized: "/product-box.jpg", error: "Invalid local image path." };
    }
    return { valid: true, sanitized: trimmed };
  }

  // 2. Data URL (Base64 file upload)
  if (trimmed.startsWith("data:")) {
    if (trimmed.length > MAX_BASE64_LENGTH) {
      return { valid: false, sanitized: "/product-box.jpg", error: "Uploaded image exceeds 4.5 MB size limit." };
    }

    const match = trimmed.match(/^data:([a-zA-Z0-9/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) {
      return { valid: false, sanitized: "/product-box.jpg", error: "Malformed base64 image upload." };
    }

    const mime = match[1].toLowerCase();
    const b64Payload = match[2].replace(/\s+/g, "");

    if (!ALLOWED_IMAGE_MIMES.has(mime)) {
      return {
        valid: false,
        sanitized: "/product-box.jpg",
        error: `Unsupported image MIME type "${mime}". Only JPEG, PNG, WebP, GIF, and AVIF are allowed.`,
      };
    }

    // Verify magic byte prefixes in base64
    const validMagic =
      b64Payload.startsWith("/9j/") || // JPEG
      b64Payload.startsWith("iVBORw0KGgo") || // PNG
      b64Payload.startsWith("UklGR") || // WebP (RIFF)
      b64Payload.startsWith("R0lGOD") || // GIF
      b64Payload.startsWith("AAAA"); // AVIF (ftypavif box)

    if (!validMagic) {
      return {
        valid: false,
        sanitized: "/product-box.jpg",
        error: "File content does not match a valid image binary header.",
      };
    }

    return { valid: true, sanitized: `data:${mime};base64,${b64Payload}` };
  }

  // 3. External HTTPS URL
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return { valid: false, sanitized: "/product-box.jpg", error: "External image URLs must use HTTPS." };
    }
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.startsWith("169.254.") ||
      parsed.hostname.startsWith("10.") ||
      parsed.hostname.startsWith("192.168.")
    ) {
      return { valid: false, sanitized: "/product-box.jpg", error: "Private network image URLs are blocked." };
    }
    return { valid: true, sanitized: parsed.toString() };
  } catch {
    return { valid: false, sanitized: "/product-box.jpg", error: "Invalid image URL format." };
  }
}

/**
 * Redacts tokens, API keys, passwords, and connection strings from log messages
 * so sensitive secrets never appear in server logs.
 */
export function redactSensitiveData(input: unknown): string {
  if (input === null || input === undefined) return "";
  const raw =
    input instanceof Error
      ? `${input.name}: ${input.message}`
      : typeof input === "object"
      ? (() => {
          try {
            return JSON.stringify(input);
          } catch {
            return String(input);
          }
        })()
      : String(input);

  return raw
    .replace(/msh\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_ADMIN_TOKEN]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/sb_secret_[A-Za-z0-9_-]+/g, "[REDACTED_SUPABASE_SECRET]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DB_URL]")
    .replace(/(password|secret|token|apiKey|api_key)\s*[:=]\s*["']?[^\s"',}]+/gi, "$1=[REDACTED]");
}
