import "@/lib/polyfill";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

// Global Layout Components
import { ProductsStoreProvider } from "../lib/products-store";
import { getProductsServerFn } from "../lib/api/products.server";
import { getPublicSettingsServerFn } from "../lib/api/settings.server";
import { CartProvider } from "../lib/cart-context";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { CartDrawer } from "../components/CartDrawer";
import { AIScentAdvisor } from "../components/AIScentAdvisor";
import { Toaster } from "../components/ui/sonner";
import { PixelTracker } from "../components/PixelTracker";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  console.error("[TanStack Root Error]", error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  const handleHardReset = () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.clear();
        localStorage.removeItem("mshaies_staff_auth_v2");
        localStorage.removeItem("mshaies_admin_token");
        window.location.reload();
      }
    } catch {
      router.invalidate();
      reset();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center p-6 bg-card border border-border/80 rounded-3xl shadow-lg">
        <h1 className="text-xl font-serif font-bold tracking-tight text-foreground">
          Console / Page Encountered an Issue
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong loading this view. You can reload or reset stored cache.
        </p>
        {error?.message && (
          <div className="mt-3 p-3 bg-muted/60 rounded-xl text-left border border-border/50 text-[11px] font-mono text-muted-foreground overflow-auto max-h-32">
            {error.message}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-gold text-ink font-semibold px-4 py-2 text-xs transition-colors hover:bg-gold-deep hover:text-white cursor-pointer"
          >
            Try again
          </button>
          <button
            onClick={handleHardReset}
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent cursor-pointer"
          >
            Reset Console & Reload
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent cursor-pointer"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5" },
      { title: "M.shaies Fragrances | Luxury Pure Attars & Extrait Perfumes in Pakistan" },
      { name: "description", content: "Shop M.shaies Fragrances in Pakistan — 100% alcohol-free pure attar oils, Millionaire Attar, CEO Pure Attar, Lady Million, Cherry Blossom & 35% Extrait De Parfum sprays. 16+ hours longevity. Cash on Delivery & Free Shipping over ₨ 5,000." },
      { name: "keywords", content: "M.shaies Fragrances, mshaiesfragrances.com, best attar in Pakistan, buy pure attar online Pakistan, Millionaire Attar 1 Million inspired, CEO Pure Attar Pakistan, Lady Million Attar Pakistan, Cherry Blossom Pure Attar, non alcoholic attar oils, long lasting perfumes Pakistan, luxury perfumes Karachi Lahore Islamabad, extrait de parfum Pakistan, pure oud oil Pakistan, mens luxury watches Pakistan" },
      { name: "author", content: "M.shaies Haute Parfumerie" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "googlebot", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "theme-color", content: "#c5a059" },
      { property: "og:title", content: "M.shaies Fragrances | Pure Attars & Luxury Perfumes in Pakistan" },
      { property: "og:description", content: "Artisanal 100% alcohol-free pure attars and 35% extrait perfumes crafted for extraordinary projection in Pakistan. Free nationwide delivery over ₨ 5,000." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "M.shaies Fragrances" },
      { property: "og:locale", content: "en_PK" },
      { property: "og:url", content: "https://www.mshaiesfragrances.com/" },
      { property: "og:image", content: "https://www.mshaiesfragrances.com/logo-wordmark.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "M.shaies Fragrances — Pure Attars & Luxury Perfumes Pakistan" },
      { name: "twitter:description", content: "Handcrafted pure attar oils, EDP perfumes & luxury watches delivered nationwide across Pakistan." },
      { name: "twitter:image", content: "https://www.mshaiesfragrances.com/logo-wordmark.png" },
    ],
    links: [
      { rel: "icon", href: "/logo-icon.png", type: "image/png" },
      { rel: "shortcut icon", href: "/logo-icon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/logo-icon.png" },
      { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" },
    ],
  }),
  loader: async () => {
    try {
      const [prodRes, settingsRes] = await Promise.all([
        getProductsServerFn(),
        getPublicSettingsServerFn(),
      ]);
      return {
        initialProducts: prodRes?.success && Array.isArray(prodRes.products) ? (prodRes.products as any[]) : [],
        initialSettings: settingsRes?.success && settingsRes.settings ? (settingsRes.settings as any) : null,
      };
    } catch {
      return { initialProducts: [], initialSettings: null };
    }
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "OnlineStore"],
      "@id": "https://www.mshaiesfragrances.com/#organization",
      name: "M.shaies Haute Parfumerie",
      alternateName: "M.shaies Fragrances",
      url: "https://www.mshaiesfragrances.com",
      logo: "https://www.mshaiesfragrances.com/logo-wordmark.png",
      image: "https://www.mshaiesfragrances.com/logo-wordmark.png",
      description: "Purveyor of artisanal 100% alcohol-free pure attars, concentrated extrait de parfums, and horological timepieces in Pakistan.",
      telephone: "+923390001829",
      email: "concierge@mshaies.com",
      priceRange: "₨ 1,499 - ₨ 25,000",
      address: {
        "@type": "PostalAddress",
        addressCountry: "PK",
      },
      sameAs: [
        "https://www.instagram.com/m.shaiesfragrances",
        "https://www.facebook.com/profile.php?id=61575714252560",
        "https://www.tiktok.com/@mshaiesfragrances",
        "https://wa.me/923390001829",
      ],
      currenciesAccepted: "PKR",
      paymentAccepted: "Cash on Delivery, JazzCash, Easypaisa, NayaPay, Bank Transfer",
    },
    {
      "@type": "WebSite",
      "@id": "https://www.mshaiesfragrances.com/#website",
      url: "https://www.mshaiesfragrances.com",
      name: "M.shaies Fragrances",
      description: "Handcrafted Luxury Pure Attars & Extrait Perfumes Pakistan",
      publisher: {
        "@id": "https://www.mshaiesfragrances.com/#organization",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://www.mshaiesfragrances.com/shop?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== "undefined") {
                // Prevent browser native PWA installation prompts and infobars
                window.addEventListener("beforeinstallprompt", function (e) {
                  e.preventDefault();
                  return false;
                });
                if (!window.global) window.global = window;
                if (!window.Buffer || typeof window.Buffer.alloc !== "function") {
                  class B extends Uint8Array {
                    static from(d, e) {
                      if (typeof d === "string") {
                        if (e === "base64" || e === "base64url") {
                          var b = d.replace(/-/g, "+").replace(/_/g, "/");
                          while (b.length % 4) b += "=";
                          var bin = atob(b), res = new B(bin.length);
                          for (var i = 0; i < bin.length; i++) res[i] = bin.charCodeAt(i);
                          return res;
                        }
                        var enc = new TextEncoder().encode(d), res = new B(enc.length);
                        res.set(enc);
                        return res;
                      }
                      if (ArrayBuffer.isView(d)) return new B(d.buffer, d.byteOffset, d.byteLength);
                      if (Array.isArray(d)) return new B(d);
                      return new B(d);
                    }
                    static alloc(s, f) {
                      var b = new B(s);
                      if (f !== undefined) b.fill(f);
                      return b;
                    }
                    static allocUnsafe(s) { return new B(s); }
                    static allocUnsafeSlow(s) { return new B(s); }
                    static isBuffer(b) { return b instanceof B || b instanceof Uint8Array || !!(b && b._isBuffer); }
                    static byteLength(s) { return typeof s === "string" ? new TextEncoder().encode(s).length : (s ? s.byteLength || s.length || 0 : 0); }
                    static concat(l, t) {
                      if (!Array.isArray(l)) return new B(0);
                      if (t === undefined) t = l.reduce(function(a, c) { return a + (c ? c.length : 0); }, 0);
                      var res = new B(t), off = 0;
                      for (var i = 0; i < l.length; i++) {
                        if (l[i]) { res.set(l[i], off); off += l[i].length; }
                      }
                      return res;
                    }
                    toString(e) {
                      if (e === "base64") {
                        var bin = "";
                        for (var i = 0; i < this.length; i++) bin += String.fromCharCode(this[i]);
                        return btoa(bin);
                      }
                      if (e === "base64url") {
                        var bin = "";
                        for (var i = 0; i < this.length; i++) bin += String.fromCharCode(this[i]);
                        return btoa(bin).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
                      }
                      return new TextDecoder().decode(this);
                    }
                  }
                  B.prototype._isBuffer = true;
                  window.Buffer = B;
                  globalThis.Buffer = B;
                }
              }
            `,
          }}
        />
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const loaderData = Route.useLoaderData();

  return (
    <QueryClientProvider client={queryClient}>
      <ProductsStoreProvider
        initialProducts={loaderData?.initialProducts}
        initialSettings={loaderData?.initialSettings}
      >
        <CartProvider>
          <PixelTracker />
          <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
            <Navbar />
            <main className="flex-grow">
              <Outlet />
            </main>
            <Footer />
            <CartDrawer />
            <AIScentAdvisor />
            <Toaster richColors position="top-right" closeButton />
          </div>
        </CartProvider>
      </ProductsStoreProvider>
    </QueryClientProvider>
  );
}
