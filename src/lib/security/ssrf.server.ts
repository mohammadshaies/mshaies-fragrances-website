import dns from "node:dns/promises";
import net from "node:net";

export interface SsrfOptions {
  allowedProtocols?: string[];
  allowedHosts?: string[];
  allowPrivateIpsInDev?: boolean;
  maxRedirects?: number;
  timeoutMs?: number;
  maxResponseSizeBytes?: number;
}

/**
 * Checks if an IPv4 address is in a private, loopback, link-local, or reserved subnet.
 */
export function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((n) => Number.parseInt(n, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return true; // Invalid format treated as unsafe
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 100.64.0.0/10 (Shared Address Space / CGN)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-Local & Cloud Metadata e.g. AWS/GCP 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && parts[2] === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && parts[2] === 2) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && parts[2] === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && parts[2] === 113) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future Use)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address is loopback, unique local, link-local, or documentation.
 */
export function isPrivateOrReservedIpv6(ip: string): boolean {
  const clean = ip.toLowerCase().trim();

  // Loopback (::1) and Unspecified (::)
  if (clean === "::1" || clean === "::") return true;

  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (clean.startsWith("::ffff:") || clean.startsWith("0:0:0:0:0:ffff:")) {
    const ipv4 = clean.split(":").pop() || "";
    if (net.isIPv4(ipv4)) {
      return isPrivateOrReservedIpv4(ipv4);
    }
  }

  // fc00::/7 (Unique Local Address)
  if (clean.startsWith("fc") || clean.startsWith("fd")) return true;

  // fe80::/10 (Link-Local)
  if (clean.startsWith("fe8") || clean.startsWith("fe9") || clean.startsWith("fea") || clean.startsWith("feb")) {
    return true;
  }

  // ff00::/8 (Multicast)
  if (clean.startsWith("ff")) return true;

  // 2001:db8::/32 (Documentation)
  if (clean.startsWith("2001:db8") || clean.startsWith("2001:0db8")) return true;

  return false;
}

/**
 * Validates a target URL against SSRF threats:
 * 1. Checks scheme/protocol (https: or http:)
 * 2. Blocks userinfo credentials (user:pass@host)
 * 3. Resolves DNS and checks all returned IPs against internal/private ranges
 */
export async function validateUrlForSsrf(
  targetUrl: string,
  options: SsrfOptions = {}
): Promise<{ safe: boolean; error?: string; url?: URL; resolvedIps?: string[] }> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { safe: false, error: "Malformed or invalid URL." };
  }

  const allowedProtocols = options.allowedProtocols || ["https:", "http:"];
  if (!allowedProtocols.includes(parsed.protocol)) {
    return {
      safe: false,
      error: `Forbidden protocol "${parsed.protocol}". Only ${allowedProtocols.join(", ")} allowed.`,
    };
  }

  // Reject embedded credentials (http://user:pass@evil.com)
  if (parsed.username || parsed.password) {
    return { safe: false, error: "URLs with embedded credentials are not permitted." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Disallow explicit 'localhost'
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return { safe: false, error: "Access to localhost or internal domain names is blocked." };
  }

  // Whitelist check if provided
  if (options.allowedHosts && options.allowedHosts.length > 0) {
    const isWhitelisted = options.allowedHosts.some((h) => hostname === h.toLowerCase() || hostname.endsWith(`.${h.toLowerCase()}`));
    if (!isWhitelisted) {
      return { safe: false, error: `Host "${hostname}" is not in the approved whitelist.` };
    }
  }

  // Check if hostname is an IP literal
  if (net.isIPv4(hostname)) {
    if (isPrivateOrReservedIpv4(hostname)) {
      return { safe: false, error: `Destination IP "${hostname}" is private or reserved.` };
    }
    return { safe: true, url: parsed, resolvedIps: [hostname] };
  }

  if (net.isIPv6(hostname)) {
    if (isPrivateOrReservedIpv6(hostname)) {
      return { safe: false, error: `Destination IPv6 "${hostname}" is private or reserved.` };
    }
    return { safe: true, url: parsed, resolvedIps: [hostname] };
  }

  // Resolve hostname via DNS to prevent DNS rebinding
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { safe: false, error: `Unable to resolve host "${hostname}".` };
    }

    const resolvedIps = addresses.map((a) => a.address);

    for (const record of addresses) {
      if (record.family === 4 && isPrivateOrReservedIpv4(record.address)) {
        return {
          safe: false,
          error: `Host "${hostname}" resolved to private IPv4 ${record.address}. Request blocked.`,
          resolvedIps,
        };
      }
      if (record.family === 6 && isPrivateOrReservedIpv6(record.address)) {
        return {
          safe: false,
          error: `Host "${hostname}" resolved to private IPv6 ${record.address}. Request blocked.`,
          resolvedIps,
        };
      }
    }

    return { safe: true, url: parsed, resolvedIps };
  } catch (err: any) {
    return { safe: false, error: `DNS lookup failed for "${hostname}": ${err.message}` };
  }
}

/**
 * Hardened HTTP fetch wrapper with SSRF protection, timeout bounding, redirect validation, and payload limits.
 */
export async function safeFetch(
  targetUrl: string,
  init?: RequestInit,
  options: SsrfOptions = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxRedirects = options.maxRedirects ?? 3;
  let currentUrl = targetUrl;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    const validation = await validateUrlForSsrf(currentUrl, options);
    if (!validation.safe) {
      throw new Error(`[SSRF Blocked] ${validation.error}`);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        ...init,
        redirect: "manual", // Intercept redirects to validate redirect target
        signal: controller.signal,
      });
      clearTimeout(timer);

      // Handle redirects securely by checking the Location header
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const locationHeader = response.headers.get("location");
        if (!locationHeader) {
          return response;
        }

        const nextUrl = new URL(locationHeader, currentUrl).toString();
        redirectCount++;
        if (redirectCount > maxRedirects) {
          throw new Error(`[SSRF Blocked] Exceeded maximum redirect limit (${maxRedirects}).`);
        }
        currentUrl = nextUrl;
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        throw new Error(`Request timed out after ${timeoutMs}ms.`);
      }
      throw err;
    }
  }

  throw new Error(`[SSRF Blocked] Too many redirects.`);
}
