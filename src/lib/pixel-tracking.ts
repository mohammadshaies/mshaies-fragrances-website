// Client-side Analytics & Conversion Tracking Module
// Supports Meta Pixel (Facebook / Instagram) and Google GMP / Google Tag / GA4 / GTM / Google Ads

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export type TrackingConfig = {
  metaPixelId?: string;
  metaPixelEnabled?: boolean;
  googleTagId?: string;
  googleTagEnabled?: boolean;
};

let currentMetaId: string | null = null;
let currentGoogleId: string | null = null;

/**
 * Initializes Meta Pixel and Google Tag based on dynamic StoreSettings.
 * Idempotent: Only injects scripts if enabled and not already mounted.
 */
export function initTracking(config: TrackingConfig) {
  if (typeof window === "undefined") return;

  const { metaPixelId, metaPixelEnabled, googleTagId, googleTagEnabled } = config;

  // 1. Initialize Meta (Facebook) Pixel
  if (metaPixelEnabled && metaPixelId && metaPixelId.trim().length > 0) {
    const cleanMetaId = metaPixelId.trim();
    if (currentMetaId !== cleanMetaId) {
      currentMetaId = cleanMetaId;
      setupMetaPixel(cleanMetaId);
    }
  }

  // 2. Initialize Google Tag (GA4, GTM, Google Ads, GMP)
  if (googleTagEnabled && googleTagId && googleTagId.trim().length > 0) {
    const cleanGoogleId = googleTagId.trim();
    if (currentGoogleId !== cleanGoogleId) {
      currentGoogleId = cleanGoogleId;
      setupGoogleTag(cleanGoogleId);
    }
  }
}

function setupMetaPixel(pixelId: string) {
  try {
    if (!window.fbq) {
      (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.setAttribute("data-tracking-provider", "meta-pixel");
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    }

    if (window.fbq) {
      window.fbq("init", pixelId);
      window.fbq("track", "PageView");
      console.info(`[PixelTracker] Meta Pixel initialized with ID: ${pixelId}`);
    }
  } catch (err) {
    console.warn("[PixelTracker] Failed to initialize Meta Pixel:", err);
  }
}

function setupGoogleTag(tagId: string) {
  try {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function () {
        window.dataLayer?.push(arguments);
      };
    }

    const isGTM = tagId.toUpperCase().startsWith("GTM-");

    if (isGTM) {
      // Google Tag Manager container loader
      const existingScript = document.querySelector(`script[data-tracking-provider="gtm-${tagId}"]`);
      if (!existingScript) {
        window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
        const script = document.createElement("script");
        script.async = true;
        script.setAttribute("data-tracking-provider", `gtm-${tagId}`);
        script.src = `https://www.googletagmanager.com/gtm.js?id=${tagId}`;
        document.head.appendChild(script);
        console.info(`[PixelTracker] Google Tag Manager container initialized: ${tagId}`);
      }
    } else {
      // Standard Google Tag (gtag.js: GA4 / Google Ads / GMP)
      const existingScript = document.querySelector(`script[data-tracking-provider="gtag-${tagId}"]`);
      if (!existingScript) {
        const script = document.createElement("script");
        script.async = true;
        script.setAttribute("data-tracking-provider", `gtag-${tagId}`);
        script.src = `https://www.googletagmanager.com/gtag/js?id=${tagId}`;
        document.head.appendChild(script);

        window.gtag("js", new Date());
        window.gtag("config", tagId, {
          send_page_view: false, // Page views handled dynamically on route transitions
        });
        console.info(`[PixelTracker] Google Tag (gtag.js) initialized with ID: ${tagId}`);
      }
    }
  } catch (err) {
    console.warn("[PixelTracker] Failed to initialize Google Tag:", err);
  }
}

/**
 * Tracks route navigation (PageView / page_view)
 */
export function trackPageView(urlPath?: string) {
  if (typeof window === "undefined") return;
  const path = urlPath || window.location.pathname;

  try {
    if (window.fbq) {
      window.fbq("track", "PageView");
    }

    if (window.gtag) {
      window.gtag("event", "page_view", {
        page_path: path,
        page_location: window.location.href,
        page_title: typeof document !== "undefined" ? document.title : "",
      });
    }

    if (window.dataLayer) {
      window.dataLayer.push({
        event: "page_view",
        page_path: path,
      });
    }
  } catch (err) {
    console.debug("[PixelTracker] PageView tracking error:", err);
  }
}

/**
 * Tracks product detail view (ViewContent / view_item)
 */
export function trackViewContent(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
  volume?: string;
}) {
  if (typeof window === "undefined") return;

  try {
    const val = Number(product.price) || 0;

    if (window.fbq) {
      window.fbq("track", "ViewContent", {
        content_name: product.name,
        content_category: product.category || "Luxury Fragrance",
        content_ids: [product.id],
        content_type: "product",
        value: val,
        currency: "PKR",
      });
    }

    if (window.gtag) {
      window.gtag("event", "view_item", {
        currency: "PKR",
        value: val,
        items: [
          {
            item_id: product.id,
            item_name: product.name,
            item_category: product.category || "Luxury Fragrance",
            item_variant: product.volume,
            price: val,
            quantity: 1,
          },
        ],
      });
    }

    if (window.dataLayer) {
      window.dataLayer.push({
        event: "view_item",
        ecommerce: {
          currency: "PKR",
          value: val,
          items: [
            {
              item_id: product.id,
              item_name: product.name,
              item_category: product.category || "Luxury Fragrance",
              item_variant: product.volume,
              price: val,
              quantity: 1,
            },
          ],
        },
      });
    }
  } catch (err) {
    console.debug("[PixelTracker] ViewContent tracking error:", err);
  }
}

/**
 * Tracks Add To Cart (AddToCart / add_to_cart)
 */
export function trackAddToCart(item: {
  id: string;
  name: string;
  price: number;
  category?: string;
  volume?: string;
}) {
  if (typeof window === "undefined") return;

  try {
    const val = Number(item.price) || 0;

    if (window.fbq) {
      window.fbq("track", "AddToCart", {
        content_name: item.name,
        content_ids: [item.id],
        content_type: "product",
        value: val,
        currency: "PKR",
      });
    }

    if (window.gtag) {
      window.gtag("event", "add_to_cart", {
        currency: "PKR",
        value: val,
        items: [
          {
            item_id: item.id,
            item_name: item.name,
            item_category: item.category || "Fragrance",
            item_variant: item.volume,
            price: val,
            quantity: 1,
          },
        ],
      });
    }

    if (window.dataLayer) {
      window.dataLayer.push({
        event: "add_to_cart",
        ecommerce: {
          currency: "PKR",
          value: val,
          items: [
            {
              item_id: item.id,
              item_name: item.name,
              item_category: item.category || "Fragrance",
              item_variant: item.volume,
              price: val,
              quantity: 1,
            },
          ],
        },
      });
    }
  } catch (err) {
    console.debug("[PixelTracker] AddToCart tracking error:", err);
  }
}

/**
 * Tracks Checkout Initiation (InitiateCheckout / begin_checkout)
 */
export function trackInitiateCheckout(payload: { items: any[]; total: number }) {
  if (typeof window === "undefined") return;

  try {
    const val = Number(payload.total) || 0;
    const contents = (payload.items || []).map((i) => ({
      id: i.id || i.productId,
      quantity: i.qty || 1,
      item_price: Number(i.price) || 0,
    }));
    const ids = contents.map((c) => c.id);

    if (window.fbq) {
      window.fbq("track", "InitiateCheckout", {
        content_ids: ids,
        contents,
        num_items: contents.reduce((acc, c) => acc + c.quantity, 0),
        value: val,
        currency: "PKR",
      });
    }

    const ga4Items = (payload.items || []).map((i) => ({
      item_id: i.id || i.productId,
      item_name: i.name,
      price: Number(i.price) || 0,
      quantity: i.qty || 1,
    }));

    if (window.gtag) {
      window.gtag("event", "begin_checkout", {
        currency: "PKR",
        value: val,
        items: ga4Items,
      });
    }

    if (window.dataLayer) {
      window.dataLayer.push({
        event: "begin_checkout",
        ecommerce: {
          currency: "PKR",
          value: val,
          items: ga4Items,
        },
      });
    }
  } catch (err) {
    console.debug("[PixelTracker] InitiateCheckout tracking error:", err);
  }
}

/**
 * Tracks completed purchase (Purchase / purchase)
 */
export function trackPurchase(payload: {
  orderId: string;
  items: any[];
  total: number;
  shipping?: number;
  currency?: string;
}) {
  if (typeof window === "undefined") return;

  try {
    const val = Number(payload.total) || 0;
    const curr = payload.currency || "PKR";
    const contents = (payload.items || []).map((i) => ({
      id: i.id || i.productId,
      quantity: i.qty || 1,
      item_price: Number(i.price) || 0,
    }));
    const ids = contents.map((c) => c.id);

    if (window.fbq) {
      window.fbq("track", "Purchase", {
        content_ids: ids,
        contents,
        num_items: contents.reduce((acc, c) => acc + c.quantity, 0),
        value: val,
        currency: curr,
        order_id: payload.orderId,
      });
    }

    const ga4Items = (payload.items || []).map((i) => ({
      item_id: i.id || i.productId,
      item_name: i.name,
      price: Number(i.price) || 0,
      quantity: i.qty || 1,
    }));

    if (window.gtag) {
      window.gtag("event", "purchase", {
        transaction_id: payload.orderId,
        value: val,
        shipping: Number(payload.shipping || 0),
        currency: curr,
        items: ga4Items,
      });
    }

    if (window.dataLayer) {
      window.dataLayer.push({
        event: "purchase",
        ecommerce: {
          transaction_id: payload.orderId,
          value: val,
          shipping: Number(payload.shipping || 0),
          currency: curr,
          items: ga4Items,
        },
      });
    }

    console.info(`[PixelTracker] Tracked Purchase for Order #${payload.orderId} (₨ ${val})`);
  } catch (err) {
    console.debug("[PixelTracker] Purchase tracking error:", err);
  }
}
