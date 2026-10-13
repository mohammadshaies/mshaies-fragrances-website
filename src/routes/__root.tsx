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
import { CartProvider } from "../lib/cart-context";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { CartDrawer } from "../components/CartDrawer";
import { AIScentAdvisor } from "../components/AIScentAdvisor";

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
      { title: "M.shaies Fragrances | Luxury Pure Attars & Extrait Perfumes Pakistan" },
      { name: "description", content: "Discover handcrafted luxury pure attars, high-projection extrait de parfums, and precision horology timepieces in Pakistan. 100% alcohol-free oils with 14+ hours longevity. Free nationwide shipping over ₨ 5,000." },
      { name: "keywords", content: "attar pakistan, pure oud oil, dehn al oudh, luxury perfumes karachi lahore islamabad, extrait de parfum, long lasting perfumes pakistan, buy attar online, mshaies fragrances, mens luxury watches" },
      { name: "author", content: "M.shaies Haute Parfumerie" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "theme-color", content: "#c5a059" },
      { property: "og:title", content: "M.shaies Fragrances | The Essence of Royal Luxury in Pakistan" },
      { property: "og:description", content: "Artisanal pure attars and extrait perfumes formulated with 35% oil concentration for extraordinary projection in Pakistan. Free nationwide shipping on orders over ₨ 5,000." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "M.shaies Fragrances" },
      { property: "og:locale", content: "en_PK" },
      { property: "og:url", content: "https://mshaies.com/" },
      { property: "og:image", content: "https://mshaies.com/logo-wordmark.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "M.shaies Fragrances — Luxury Perfumes Pakistan" },
      { name: "twitter:description", content: "Handcrafted pure attars, EDP perfumes & horology watches delivered nationwide." },
      { name: "twitter:image", content: "https://mshaies.com/logo-wordmark.png" },
    ],
    links: [
      { rel: "icon", href: "/logo-icon.png", type: "image/png" },
      { rel: "shortcut icon", href: "/logo-icon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/logo-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "canonical", href: "https://mshaies.com/" },
      { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" },
    ],
  }),
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
      "@id": "https://mshaies.com/#organization",
      name: "M.shaies Haute Parfumerie",
      alternateName: "M.shaies Fragrances",
      url: "https://mshaies.com",
      logo: "https://mshaies.com/logo-wordmark.png",
      image: "https://mshaies.com/logo-wordmark.png",
      description: "Purveyor of artisanal pure attars, concentrated extrait de parfums, and horological timepieces in Pakistan.",
      telephone: "+923390001829",
      email: "concierge@mshaies.com",
      priceRange: "₨₨₨",
      address: {
        "@type": "PostalAddress",
        addressCountry: "PK",
      },
      sameAs: [
        "https://www.instagram.com/mshaiesfragrances",
        "https://wa.me/923390001829",
      ],
      currenciesAccepted: "PKR",
      paymentAccepted: "Cash on Delivery, Bank Transfer, Online Card",
    },
    {
      "@type": "WebSite",
      "@id": "https://mshaies.com/#website",
      url: "https://mshaies.com",
      name: "M.shaies Fragrances",
      description: "Handcrafted Luxury Pure Attars & Extrait Perfumes Pakistan",
      publisher: {
        "@id": "https://mshaies.com/#organization",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://mshaies.com/shop?q={search_term_string}",
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

  return (
    <QueryClientProvider client={queryClient}>
      <ProductsStoreProvider>
        <CartProvider>
          <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
            <Navbar />
            <main className="flex-grow">
              <Outlet />
            </main>
            <Footer />
            <CartDrawer />
            <AIScentAdvisor />
          </div>
        </CartProvider>
      </ProductsStoreProvider>
    </QueryClientProvider>
  );
}
