import "./lib/polyfill";
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { getSupabaseAdmin, getSupabaseClient, isSupabaseConfigured } from "./lib/supabase.server";
import { serverCache } from "./lib/cache.server";
import { verifyWebhookSignature } from "./lib/security/session.server";
import { redactSensitiveData, sanitizeText } from "./lib/security/sanitize";

// Global Sliding-Window IP Rate Limiter (protects all endpoints against DoS, scraping, and brute force)
const globalIpRateMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown-ip"
  );
}

function checkGlobalRateLimit(request: Request): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  const method = request.method.toUpperCase();
  const isMutation = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
  const maxRequestsPerMinute = isMutation ? 60 : 240;
  const ip = getClientIp(request);
  const key = `${ip}:${isMutation ? "mut" : "read"}`;
  const now = Date.now();

  if (globalIpRateMap.size > 5000) {
    for (const [k, v] of globalIpRateMap.entries()) {
      if (now > v.resetAt) globalIpRateMap.delete(k);
    }
  }

  const record = globalIpRateMap.get(key);
  if (!record || now > record.resetAt) {
    globalIpRateMap.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, remaining: maxRequestsPerMinute - 1, retryAfterSeconds: 0 };
  }

  if (record.count >= maxRequestsPerMinute) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, maxRequestsPerMinute - record.count),
    retryAfterSeconds: 0,
  };
}

// Strict Origin Allowlist for CORS & Cross-Site Mutation Protection
const ALLOWED_ORIGINS = new Set([
  "https://www.mshaiesfragrances.com",
  "https://mshaiesfragrances.com",
  "https://mshaiesfragrances.vercel.app",
  "https://mshaies-fragrances-website.vercel.app",
]);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // Same-origin navigation / non-CORS GET
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }
  // Also allow Vercel preview deployment URLs belonging to this project
  if (/^https:\/\/mshaies-fragrances-website-[a-z0-9-]+\.vercel\.app$/.test(origin)) {
    return true;
  }
  return false;
}

function escapeXml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function fetchCatalogForSeo(): Promise<any[]> {
  return serverCache.getOrSet(
    "seo:catalog",
    async () => {
      if (isSupabaseConfigured()) {
        try {
          const client = getSupabaseAdmin() || getSupabaseClient();
          if (client) {
            const { data } = await client
              .from("products")
              .select("id,name,tagline,notes,description,image,accent,updated_at")
              .order("name");
            if (Array.isArray(data)) return data;
          }
        } catch {}
      }
      return [];
    },
    300,
    ["products"]
  );
}

async function handleDynamicSitemap(request: Request): Promise<Response> {
  const reqUrl = new URL(request.url);
  const baseUrl = reqUrl.hostname.includes("localhost") || reqUrl.hostname.includes("127.0.0.1")
    ? "https://www.mshaiesfragrances.com"
    : "https://www.mshaiesfragrances.com";
  const today = new Date().toISOString().split("T")[0];
  const products = await fetchCatalogForSeo();

  const staticRoutes = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/shop", priority: "0.95", changefreq: "daily" },
    { path: "/attars", priority: "0.9", changefreq: "daily" },
    { path: "/perfumes", priority: "0.9", changefreq: "daily" },
    { path: "/watches", priority: "0.85", changefreq: "weekly" },
    { path: "/journey", priority: "0.8", changefreq: "monthly" },
    { path: "/about", priority: "0.75", changefreq: "monthly" },
    { path: "/contact", priority: "0.75", changefreq: "monthly" },
    { path: "/support", priority: "0.7", changefreq: "monthly" },
    { path: "/careers", priority: "0.6", changefreq: "monthly" },
  ];

  const staticXml = staticRoutes
    .map(
      (r) => `  <url>
    <loc>${baseUrl}${r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>${
      r.path === "/"
        ? `
    <image:image>
      <image:loc>${baseUrl}/logo-wordmark.png</image:loc>
      <image:title>M.shaies Haute Parfumerie Pakistan</image:title>
      <image:caption>Handcrafted Luxury Pure Attars &amp; Extrait Perfumes in Pakistan</image:caption>
    </image:image>`
        : ""
    }
  </url>`
    )
    .join("\n");

  const productsXml = products
    .map((p: any) => {
      const lastmod = p.updated_at ? String(p.updated_at).split("T")[0] : today;
      const imgUrl = `${baseUrl}/api/product-image/${encodeURIComponent(p.id)}`;
      const caption = p.tagline || p.notes || p.description || p.name;
      return `  <url>
    <loc>${baseUrl}/product/${escapeXml(p.id)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <image:image>
      <image:loc>${escapeXml(imgUrl)}</image:loc>
      <image:title>${escapeXml(p.name)}</image:title>
      <image:caption>${escapeXml(caption)}</image:caption>
    </image:image>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${staticXml}
${productsXml}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400",
    },
  });
}

async function handleProductImageRequest(request: Request, url: URL): Promise<Response> {
  const rawId = decodeURIComponent(url.pathname.replace("/api/product-image/", "")).replace(/\/$/, "");
  const index = Math.max(0, parseInt(url.searchParams.get("index") || "0", 10) || 0);
  const products = await fetchCatalogForSeo();
  const product = products.find((p: any) => p.id === rawId);

  let targetImage = product?.image || "/product-box.jpg";
  if (product?.accent && typeof product.accent === "string" && product.accent.startsWith("{")) {
    try {
      const parsed = JSON.parse(product.accent);
      if (Array.isArray(parsed.images) && parsed.images[index]) {
        targetImage = parsed.images[index];
      }
    } catch {}
  }

  if (typeof targetImage === "string" && targetImage.startsWith("data:")) {
    const match = targetImage.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const rawMime = (match[1] || "image/webp").toLowerCase();
      const allowedServeMimes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif"]);
      const mimeType = allowedServeMimes.has(rawMime) ? rawMime : "image/webp";
      const b64 = match[2];
      const binaryStr = atob(b64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }
  }

  const redirectTarget = targetImage.startsWith("http")
    ? targetImage
    : `${url.origin}${targetImage.startsWith("/") ? targetImage : "/" + targetImage}`;
  return Response.redirect(redirectTarget, 302);
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function handleVerifiedWebhookRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed." }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const signatureHeader =
    request.headers.get("x-webhook-signature") ||
    request.headers.get("x-hub-signature-256");
  const timestampHeader = request.headers.get("x-webhook-timestamp");
  const rawBody = await request.text();

  const verification = verifyWebhookSignature({
    rawBody,
    signatureHeader,
    timestampHeader,
  });

  if (!verification.valid) {
    return new Response(
      JSON.stringify({ success: false, error: verification.error || "Invalid webhook signature." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = JSON.parse(rawBody);
    const orderId = sanitizeText(payload?.orderId, 60);
    const orderStatus = sanitizeText(payload?.orderStatus, 40);
    const trackingNumber = payload?.trackingNumber ? sanitizeText(payload.trackingNumber, 80) : undefined;

    if (orderId && orderStatus && isSupabaseConfigured()) {
      const client = getSupabaseAdmin();
      if (client) {
        await client
          .from("orders")
          .update({
            order_status: orderStatus,
            ...(trackingNumber ? { tracking_number: trackingNumber } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      }
    }

    return new Response(JSON.stringify({ success: true, verified: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON webhook payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Injects defense-in-depth HTTP security headers and strict CORS into server responses
function attachSecurityHeaders(response: Response, request?: Request, rateRemaining?: number): Response {
  const newHeaders = new Headers(response.headers);
  const origin = request?.headers.get("origin") || null;

  if (origin && isAllowedOrigin(origin)) {
    newHeaders.set("Access-Control-Allow-Origin", origin);
    newHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Webhook-Signature, X-Webhook-Timestamp");
    newHeaders.set("Access-Control-Max-Age", "86400");
    newHeaders.set("Vary", "Origin");
  }

  if (typeof rateRemaining === "number") {
    newHeaders.set("X-RateLimit-Remaining", String(rateRemaining));
  }

  if (!newHeaders.has("X-Content-Type-Options")) {
    newHeaders.set("X-Content-Type-Options", "nosniff");
  }
  if (!newHeaders.has("X-Frame-Options")) {
    newHeaders.set("X-Frame-Options", "SAMEORIGIN");
  }
  if (!newHeaders.has("Referrer-Policy")) {
    newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }
  if (!newHeaders.has("Permissions-Policy")) {
    newHeaders.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  }
  if (!newHeaders.has("X-XSS-Protection")) {
    newHeaders.set("X-XSS-Protection", "1; mode=block");
  }
  if (!newHeaders.has("Strict-Transport-Security")) {
    newHeaders.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  if (!newHeaders.has("X-DNS-Prefetch-Control")) {
    newHeaders.set("X-DNS-Prefetch-Control", "on");
  }
  if (!newHeaders.has("Cross-Origin-Opener-Policy")) {
    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  }
  if (!newHeaders.has("Cross-Origin-Resource-Policy")) {
    newHeaders.set("Cross-Origin-Resource-Policy", "same-origin");
  }
  // Remove server/debug fingerprinting headers in production
  newHeaders.delete("X-Powered-By");
  newHeaders.delete("Server");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  const captured = consumeLastCapturedError();
  console.error("[SSR Error]", redactSensitiveData(captured ?? body));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      const origin = request.headers.get("origin");

      // 1. CORS Preflight Handling
      if (request.method === "OPTIONS") {
        if (origin && !isAllowedOrigin(origin)) {
          return new Response("Forbidden Origin", { status: 403 });
        }
        return attachSecurityHeaders(new Response(null, { status: 204 }), request);
      }

      // 2. Enforce Tightened CORS on Cross-Origin State-Changing Requests (CSRF / Origin Defense)
      const isMutation =
        request.method === "POST" ||
        request.method === "PUT" ||
        request.method === "PATCH" ||
        request.method === "DELETE";
      if (isMutation && origin && !isAllowedOrigin(origin) && !url.pathname.startsWith("/api/webhooks/")) {
        return attachSecurityHeaders(
          new Response(JSON.stringify({ success: false, error: "Cross-origin request blocked by CORS policy." }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }),
          request
        );
      }

      // 3. Global Sliding-Window Rate Limiting
      const rateLimit = checkGlobalRateLimit(request);
      if (!rateLimit.allowed) {
        return attachSecurityHeaders(
          new Response(
            JSON.stringify({
              success: false,
              error: `Rate limit exceeded. Please wait ${rateLimit.retryAfterSeconds} seconds.`,
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": String(rateLimit.retryAfterSeconds),
              },
            }
          ),
          request,
          0
        );
      }

      // 4. Cryptographically Verified Webhook Endpoint
      if (url.pathname === "/api/webhooks/order-status") {
        const webhookRes = await handleVerifiedWebhookRequest(request);
        return attachSecurityHeaders(webhookRes, request, rateLimit.remaining);
      }

      // 5. Dynamic Sitemap & Binary Product Image Endpoints
      if (request.method === "GET" && (url.pathname === "/sitemap.xml" || url.pathname === "/api/sitemap.xml")) {
        const sitemapRes = await handleDynamicSitemap(request);
        return attachSecurityHeaders(sitemapRes, request, rateLimit.remaining);
      }
      if (request.method === "GET" && url.pathname.startsWith("/api/product-image/")) {
        const imgRes = await handleProductImageRequest(request, url);
        return attachSecurityHeaders(imgRes, request, rateLimit.remaining);
      }

      const handler = await getServerEntry();
      const rawResponse = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(rawResponse);
      return attachSecurityHeaders(normalized, request, rateLimit.remaining);
    } catch (error) {
      console.error("[Server Exception]", redactSensitiveData(error));
      const errResponse = new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      return attachSecurityHeaders(errResponse, request);
    }
  },
};
