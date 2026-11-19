import "./lib/polyfill";
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { getSupabaseAdmin, getSupabaseClient, isSupabaseConfigured } from "./lib/supabase.server";
import { serverCache } from "./lib/cache.server";

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
    ? "https://mshaiesfragrances.com"
    : `${reqUrl.protocol}//${reqUrl.host}`;
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
      const mimeType = match[1] || "image/webp";
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

// Injects defense-in-depth HTTP security headers into server responses
function attachSecurityHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);

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

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (request.method === "GET" && (url.pathname === "/sitemap.xml" || url.pathname === "/api/sitemap.xml")) {
        const sitemapRes = await handleDynamicSitemap(request);
        return attachSecurityHeaders(sitemapRes);
      }
      if (request.method === "GET" && url.pathname.startsWith("/api/product-image/")) {
        const imgRes = await handleProductImageRequest(request, url);
        return attachSecurityHeaders(imgRes);
      }

      const handler = await getServerEntry();
      const rawResponse = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(rawResponse);
      return attachSecurityHeaders(normalized);
    } catch (error) {
      console.error(error);
      const errResponse = new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      return attachSecurityHeaders(errResponse);
    }
  },
};
