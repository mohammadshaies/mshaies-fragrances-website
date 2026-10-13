import "./lib/polyfill";
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

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
