import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import {
  getProductsServerFn,
  saveProductServerFn,
  deleteProductServerFn,
  bulkImportProductsServerFn,
} from "./api/products.server";
import {
  placeOrderServerFn,
  getOrdersServerFn,
  updateOrderStatusServerFn,
  updatePaymentStatusServerFn,
} from "./api/orders.server";
import {
  validateCouponServerFn,
  getCouponsServerFn,
  saveCouponServerFn,
  deleteCouponServerFn,
} from "./api/coupons.server";
import {
  getPublicSettingsServerFn,
  updateSettingsServerFn,
} from "./api/settings.server";
import {
  getAuditLogsServerFn,
  addAuditLogServerFn,
} from "./api/audit.server";
import {
  getReviewsServerFn,
  addReviewServerFn,
  voteHelpfulServerFn,
} from "./api/reviews.server";
import {
  exportDatabaseBackupServerFn,
  restoreDatabaseBackupServerFn,
} from "./api/backup.server";
import { purgeServerCacheFn } from "./api/cache.server";

export type Product = {
  id: string;
  name: string;
  price: number;
  category: "Attars" | "Perfumes" | "Watches" | "Gift Sets" | string;
  volume: string;
  stock: number;
  tagline: string;
  notes: string;
  topNotes?: string;
  heartNotes?: string;
  baseNotes?: string;
  image: string;
  images?: string[];
  accent?: string;
  description?: string;
  isFeatured?: boolean;
  // Sensory & Luxury Fragrance Attributes
  gender?: "Unisex" | "Men" | "Women";
  longevityHours?: number; // e.g. 16 for 16+ Hours
  sillageRating?: "Moderate" | "Strong" | "Enormous";
  seasonSuitability?: ("Summer" | "Winter" | "All-Season" | "Autumn" | "Spring")[];
  occasionSuitability?: ("Wedding / Barat" | "Daily Office" | "Evening Gala" | "Jummah / Spiritual")[];
  inspiredBy?: string;
  fragranceFamily?: string;
  layeringPairId?: string;
  samplePrice?: number;
  batchNumber?: string;
  availableSizes?: string[];
};

export type FlaconSizeOption = {
  id: string;
  ml: string;
  label: string;
  sub: string;
  multiplier: number;
  priceOverride?: number;
  isEnabled: boolean;
};

export function getCustomSizeDetails(sizeStr: string): { multiplier: number; sub: string } {
  const clean = sizeStr.trim();
  const lower = clean.toLowerCase();

  let sub = "Custom Flacon";
  if (lower.includes("attar")) sub = "Pure Attar";
  else if (lower.includes("spray")) sub = "Parfum Spray";
  else if (lower.includes("sample") || lower.includes("3ml")) sub = "Discovery Flacon";
  else if (lower.includes("100ml")) sub = "Grand Extrait";
  else if (lower.includes("50ml")) sub = "Parfum Spray";
  else if (lower.includes("30ml")) sub = "Travel Spray";
  else if (lower.includes("12ml")) sub = "Royal Flacon";
  else if (lower.includes("6ml")) sub = "Pocket Attar";
  else if (lower.includes("10ml")) sub = "Pocket Spray";
  else if (lower.includes("200ml")) sub = "Jumbo Flacon";

  let multiplier = 1.0;
  const match = clean.match(/(\d+)\s*ml/i);
  if (match) {
    const ml = parseInt(match[1], 10);
    if (ml <= 3) multiplier = 0.55;
    else if (ml <= 6) multiplier = 1.0;
    else if (ml <= 12) multiplier = 1.9;
    else if (ml <= 30) multiplier = 2.4;
    else if (ml <= 50) multiplier = 3.5;
    else if (ml <= 100) multiplier = 5.5;
    else if (ml <= 200) multiplier = 9.0;
    else multiplier = Math.round((ml / 12) * 1.8 * 10) / 10;
  }
  return { multiplier, sub };
}

export const DEFAULT_FLACON_SIZES: FlaconSizeOption[] = [
  {
    id: "6ml",
    ml: "6ml",
    label: "6ml",
    sub: "Pocket Attar",
    multiplier: 1.0,
    isEnabled: true,
  },
  {
    id: "12ml",
    ml: "12ml",
    label: "12ml",
    sub: "Royal Flacon",
    multiplier: 1.9,
    isEnabled: true,
  },
  {
    id: "50ml",
    ml: "50ml",
    label: "50ml",
    sub: "Parfum Spray",
    multiplier: 3.5,
    isEnabled: true,
  },
  {
    id: "100ml",
    ml: "100ml",
    label: "100ml",
    sub: "Grand Extrait",
    multiplier: 5.5,
    isEnabled: true,
  },
];

export type PromotionalSlide = {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  code?: string;
  buttonText: string;
  linkUrl: string;
  icon?: "sparkles" | "truck" | "flame" | "watch" | "gift" | "shield" | "tag" | "gem";
  imageUrl?: string;
  isEnabled: boolean;
};

export const DEFAULT_PROMOTIONAL_SLIDES: PromotionalSlide[] = [
  {
    id: "slide-primary",
    tag: "Maison Exclusive · Limited Festive Release",
    title: "Free Express Nationwide Delivery With Every Order Over ₨ 5,000",
    subtitle: "100% Alcohol-Free Pure Attar Oils & 35% Extrait Parfums. Use Code LUXE15 for Flat 15% OFF.",
    code: "LUXE15",
    buttonText: "Claim Exclusive Offer →",
    linkUrl: "/shop",
    icon: "sparkles",
    isEnabled: true,
  },
  {
    id: "slide-shipping",
    tag: "Nationwide Expedited Logistics",
    title: "Free Express Shipping Across All Pakistan On Orders Over ₨ 5,000",
    subtitle: "100% in stock and safely dispatched via TCS Express & Leopards with luxury packaging seal.",
    code: "FREESHIP",
    buttonText: "Shop Collection",
    linkUrl: "/shop",
    icon: "truck",
    isEnabled: true,
  },
  {
    id: "slide-attars",
    tag: "Pure Attar Oils · 35% Concentration",
    title: "Flat 15% OFF Aged Cambodian Oud, Midnight Rose & Royal Ambergris",
    subtitle: "Alcohol-free concentrated oil flacons engineered for 16+ hours longevity in Pakistan's climate.",
    code: "LUXE15",
    buttonText: "Explore Attars",
    linkUrl: "/attars",
    icon: "flame",
    isEnabled: true,
  },
  {
    id: "slide-watches",
    tag: "Maison Horology & Fine Fragrances",
    title: "Complimentary Velvet Saffron EDP with Luxury Chronograph Watches",
    subtitle: "Automatic skeleton movements and sapphire crystal timepieces delivered nationwide.",
    code: "MAISON1000",
    buttonText: "View Watches",
    linkUrl: "/watches",
    icon: "watch",
    isEnabled: true,
  },
];

export type AnnouncementItem = {
  id: string;
  badge: string;
  text: string;
  code?: string;
  linkText: string;
  linkTo: string;
  icon?: "tag" | "truck" | "sparkles" | "gift" | "flame" | "shield";
  isEnabled: boolean;
};

export const DEFAULT_ANNOUNCEMENT_ITEMS: AnnouncementItem[] = [
  {
    id: "item-offer",
    badge: "Active Offer",
    text: "Flat 15% OFF on all Pure Attar Oils — Use code",
    code: "LUXE15",
    linkText: "Shop Deal",
    linkTo: "/shop",
    icon: "tag",
    isEnabled: true,
  },
  {
    id: "item-shipping",
    badge: "Nationwide Express",
    text: "Free Delivery across Pakistan on all orders over ₨ 5,000",
    code: "AUTOMATIC",
    linkText: "Explore",
    linkTo: "/shop",
    icon: "truck",
    isEnabled: true,
  },
  {
    id: "item-luxury",
    badge: "Artisanal Luxury",
    text: "100% Pure Alcohol-Free Attars & High-Concentration Extrait Parfums",
    code: "AUTHENTIC",
    linkText: "Shop Collection",
    linkTo: "/shop",
    icon: "sparkles",
    isEnabled: true,
  },
];

export type AuditLogEntry = {
  id: string;
  timestamp: string;
  action: string;
  category: "Product" | "Stock" | "Order" | "Discount" | "Settings" | "System";
  details: string;
  user?: string;
};

export type ProductReview = {
  id: string;
  productId: string;
  author: string;
  city: string;
  rating: number; // 1 to 5
  title: string;
  comment: string;
  date: string;
  verified: boolean;
  helpfulCount: number;
};

export type Category = string;

export type Coupon = {
  id: string;
  code: string;
  type: "percent" | "flat" | "shipping";
  value: number; // e.g. 15 for 15%, or 1000 for ₨ 1,000
  minOrder: number; // in PKR
  maxUses?: number;
  usedCount: number;
  expiryDate?: string;
  isActive: boolean;
  description: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  volume: string;
  image: string;
};

export type Order = {
  id: string;
  date: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
  paymentMethod: "cod" | "jazzcash" | "easypaisa" | "nayapay" | "card";
  paymentStatus: "Paid" | "Pending COD" | "Verification Required";
  transactionId?: string;
  items: OrderItem[];
  subtotal: number;
  discountCode?: string;
  discountAmount?: number;
  shipping: number;
  total: number;
  orderStatus: "Confirmed" | "Processing" | "Dispatched" | "Delivered";
  courierName?: string;
  trackingNumber?: string;
  isGiftWrapped?: boolean;
  giftMessage?: string;
};

export type StoreSettings = {
  adminPin: string;
  announcementText: string;
  announcementCode: string;
  announcementActive: boolean;
  freeShippingThreshold: number;
  standardShippingFee: number;
  expressShippingFee: number;
  expressShippingActive: boolean;
  lahoreLocalFee: number;
  lahoreLocalActive: boolean;
  codFee: number;
  freeShippingEnabled: boolean;
  shippingEstimateDays: string;
  courierPartners: string;
  whatsappNumber: string;
  contactEmail: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  autoLockMinutes: number;
  // Direct Mobile Payment Accounts (JazzCash, EasyPaisa, NayaPay)
  paymentAccountTitle: string;
  paymentAccountNumber: string;
  paymentAccountFormatted: string;
  paymentWhatsapp: string;
  jazzcashActive?: boolean;
  easypaisaActive?: boolean;
  nayapayActive?: boolean;
  jazzcashTitle?: string;
  jazzcashNumber?: string;
  easypaisaTitle?: string;
  easypaisaNumber?: string;
  nayapayTitle?: string;
  nayapayNumber?: string;
  // Hero Section Promotional Banner
  heroBannerActive?: boolean;
  heroBannerImage?: string;
  heroBannerLink?: string;
  heroBannerAlt?: string;
  heroBannerAnimation?: "fadeIn" | "slideLeft" | "zoomIn";
  heroBannerTag?: string;
  heroBannerTitle?: string;
  heroBannerSubtitle?: string;
  heroBannerButtonText?: string;
  heroBannerStyle?: "image" | "luxuryCard" | "hybrid";
  heroBannerTransitionEffect?: "slide" | "marquee" | "fade" | "zoom" | "flip";
  heroBannerTransitionSpeed?: number;
  heroBannerShimmer?: boolean;
  // Flacon & Bottle Size Options Configuration
  flaconSizes?: FlaconSizeOption[];
  // Dynamic Banner & Announcement Deck
  promotionalSlides?: PromotionalSlide[];
  announcementItems?: AnnouncementItem[];
};

export const DEFAULT_SETTINGS: StoreSettings = {
  adminPin: "7860",
  announcementText: "Flat 15% OFF on all Pure Attar Oils — Use code",
  announcementCode: "LUXE15",
  announcementActive: true,
  freeShippingThreshold: 5000,
  standardShippingFee: 400,
  expressShippingFee: 450,
  expressShippingActive: true,
  lahoreLocalFee: 150,
  lahoreLocalActive: true,
  codFee: 0,
  freeShippingEnabled: true,
  shippingEstimateDays: "2-4 Business Days",
  courierPartners: "TCS Express & Leopards Courier",
  whatsappNumber: "+923390001829",
  contactEmail: "info@mshaies.com",
  instagramUrl: "https://www.instagram.com/m.shaiesfragrances",
  facebookUrl: "https://www.facebook.com/profile.php?id=61575714252560",
  tiktokUrl: "https://www.tiktok.com/@mshaiesfragrances",
  autoLockMinutes: 15,
  paymentAccountTitle: "Muhammad Shees",
  paymentAccountNumber: "03325568922",
  paymentAccountFormatted: "0332 5568922",
  paymentWhatsapp: "+923390001829",
  jazzcashActive: true,
  easypaisaActive: true,
  nayapayActive: true,
  jazzcashTitle: "Muhammad Shees",
  jazzcashNumber: "03325568922",
  easypaisaTitle: "Muhammad Shees",
  easypaisaNumber: "03325568922",
  nayapayTitle: "Muhammad Shees",
  nayapayNumber: "03325568922",
  heroBannerActive: true,
  heroBannerImage: "/product-box.jpg",
  heroBannerLink: "/shop",
  heroBannerAlt: "Maison Luxury Promotions & Festive Offers",
  heroBannerAnimation: "fadeIn",
  heroBannerTag: "Maison Exclusive · Limited Festive Release",
  heroBannerTitle: "Free Express Delivery Across Pakistan On Orders Over ₨ 5,000",
  heroBannerSubtitle: "100% Alcohol-Free Pure Attar Oils & 35% Extrait Parfums. Use Code LUXE15 for Flat 15% OFF Nationwide.",
  heroBannerButtonText: "Claim Exclusive Offer →",
  heroBannerStyle: "hybrid",
  heroBannerTransitionEffect: "slide",
  heroBannerTransitionSpeed: 4500,
  heroBannerShimmer: true,
  flaconSizes: DEFAULT_FLACON_SIZES,
  promotionalSlides: DEFAULT_PROMOTIONAL_SLIDES,
  announcementItems: DEFAULT_ANNOUNCEMENT_ITEMS,
};

export const DEFAULT_CATEGORIES: Category[] = [
  "All",
  "Attars",
  "Perfumes",
  "Watches",
  "Gift Sets",
];

export const DEFAULT_ORDERS: Order[] = [];
export const DEFAULT_COUPONS: Coupon[] = [];
export const DEFAULT_REVIEWS: ProductReview[] = [];

export type JobPosting = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: "Full-Time" | "Part-Time" | "Contract" | "Internship";
  experience: string;
  salaryRange?: string;
  description: string;
  requirements: string[];
  benefits: string[];
  status: "Open" | "Closed";
  createdAt: string;
  applicantCount?: number;
};

export const DEFAULT_JOBS: JobPosting[] = [];

export const DEFAULT_PRODUCTS: Product[] = [];

type ValidateCouponResult = {
  valid: boolean;
  coupon?: Coupon;
  discountAmount: number;
  freeShipping?: boolean;
  message: string;
};

type ProductsStoreContextType = {
  products: Product[];
  categories: Category[];
  coupons: Coupon[];
  orders: Order[];
  settings: StoreSettings;
  addProduct: (product: Omit<Product, "id">) => Promise<{ success: boolean; error?: string; product?: Product }>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateStock: (id: string, newStock: number) => void;
  addCategory: (name: string) => void;
  deleteCategory: (name: string) => void;
  // Discount Engine Methods
  addCoupon: (coupon: Omit<Coupon, "id" | "usedCount">) => void;
  toggleCoupon: (id: string) => void;
  deleteCoupon: (id: string) => void;
  validateCoupon: (code: string, subtotal: number) => ValidateCouponResult;
  // Order Methods
  placeOrder: (orderData: Omit<Order, "id" | "date">) => Promise<string>;
  updateOrderStatus: (id: string, status: Order["orderStatus"], courier?: string, tracking?: string) => void;
  updatePaymentStatus: (id: string, paymentStatus: Order["paymentStatus"]) => void;
  getOrder: (id: string) => Order | undefined;
  // Review System Methods
  reviews: ProductReview[];
  addReview: (reviewData: Omit<ProductReview, "id" | "date" | "helpfulCount">) => void;
  voteHelpful: (reviewId: string) => void;
  getProductReviews: (productId: string) => ProductReview[];
  getProductRating: (productId: string) => { average: number; count: number };
  // Store Settings & Backup
  updateSettings: (updates: Partial<StoreSettings>) => void;
  exportAllStoreData: () => string;
  importStoreData: (jsonData: string) => boolean;
  resetToDefaults: () => void;
  // Audit Logs & Bulk Operations
  auditLogs: AuditLogEntry[];
  addAuditLog: (action: string, category: AuditLogEntry["category"], details: string) => void;
  bulkImportProducts: (importedList: Partial<Product>[]) => Promise<{ count: number; error?: string }>;
  // Career / Job Posting Methods
  jobs: JobPosting[];
  addJob: (job: Omit<JobPosting, "id" | "createdAt">) => void;
  updateJob: (id: string, updates: Partial<JobPosting>) => void;
  deleteJob: (id: string) => void;
  toggleJobStatus: (id: string) => void;
  refreshDataFromServer: (force?: boolean) => Promise<void>;
  purgeCache: () => Promise<void>;
};

const ProductsStoreContext = createContext<ProductsStoreContextType | null>(null);

export const DEFAULT_AUDIT_LOGS: AuditLogEntry[] = [];

const STORAGE_KEYS = {
  PRODUCTS: "mshaies_products_v5",
  CATEGORIES: "mshaies_categories_v5",
  COUPONS: "mshaies_coupons_v5",
  ORDERS: "mshaies_orders_v5",
  SETTINGS: "mshaies_settings_v6",
  REVIEWS: "mshaies_reviews_v5",
  AUDIT_LOGS: "mshaies_audit_logs_v5",
  JOBS: "mshaies_jobs_v5",
};

// Immediate client-side cleanup of legacy cache keys
if (typeof window !== "undefined") {
  try {
    const legacyKeys = [
      "mshaies_products_v1", "mshaies_products_v2", "mshaies_products_v3", "mshaies_products_v4",
      "mshaies_orders_v1", "mshaies_orders_v2", "mshaies_orders_v3", "mshaies_orders_v4",
      "mshaies_coupons_v1", "mshaies_coupons_v2", "mshaies_coupons_v3", "mshaies_coupons_v4",
      "mshaies_settings_v1", "mshaies_settings_v2", "mshaies_settings_v3", "mshaies_settings_v4", "mshaies_settings_v5",
      "mshaies_reviews_v1", "mshaies_reviews_v2", "mshaies_reviews_v3", "mshaies_reviews_v4",
      "mshaies_audit_logs_v1", "mshaies_audit_logs_v2", "mshaies_audit_logs_v3", "mshaies_audit_logs_v4",
      "mshaies_jobs_v1", "mshaies_jobs_v2", "mshaies_jobs_v3", "mshaies_jobs_v4",
    ];
    legacyKeys.forEach((key) => localStorage.removeItem(key));
  } catch {}
}

export function ProductsStoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window === "undefined") return DEFAULT_PRODUCTS;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
    } catch {
      return DEFAULT_PRODUCTS;
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window === "undefined") return DEFAULT_CATEGORIES;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    if (typeof window === "undefined") return DEFAULT_COUPONS;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COUPONS);
      return saved ? JSON.parse(saved) : DEFAULT_COUPONS;
    } catch {
      return DEFAULT_COUPONS;
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window === "undefined") return DEFAULT_ORDERS;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return DEFAULT_ORDERS;
    } catch {
      return DEFAULT_ORDERS;
    }
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [reviews, setReviews] = useState<ProductReview[]>(() => {
    if (typeof window === "undefined") return DEFAULT_REVIEWS;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REVIEWS);
      return saved ? JSON.parse(saved) : DEFAULT_REVIEWS;
    } catch {
      return DEFAULT_REVIEWS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    if (typeof window === "undefined") return DEFAULT_AUDIT_LOGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      return saved ? JSON.parse(saved) : DEFAULT_AUDIT_LOGS;
    } catch {
      return DEFAULT_AUDIT_LOGS;
    }
  });

  const [jobs, setJobs] = useState<JobPosting[]>(() => {
    if (typeof window === "undefined") return DEFAULT_JOBS;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.JOBS);
      return saved ? JSON.parse(saved) : DEFAULT_JOBS;
    } catch {
      return DEFAULT_JOBS;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
    } catch (e) {
      console.warn("Failed to persist jobs:", e);
    }
  }, [jobs]);

  // Client-side cache synchronization throttle (2 minutes TTL)
  const lastSyncRef = useRef<number>(0);

  // Initial and on-demand Data Synchronization with Server Database (Supabase)
  const refreshDataFromServer = async (force = false) => {
    const now = Date.now();
    if (!force && lastSyncRef.current > 0 && now - lastSyncRef.current < 120_000 && products.length > 0) {
      return;
    }
    lastSyncRef.current = now;

    try {
      const [prodRes, settingsRes, reviewsRes] = await Promise.all([
        getProductsServerFn(),
        getPublicSettingsServerFn(),
        getReviewsServerFn({ data: {} }),
      ]);

      if (prodRes.success && Array.isArray(prodRes.products)) {
        setProducts(prodRes.products as any);
        try {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prodRes.products));
        } catch (e) {
          console.warn("Failed to persist products to localStorage:", e);
        }
      }
      if (settingsRes.success && settingsRes.settings) {
        setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, ...(settingsRes.settings as any) }));
      }
      if (reviewsRes.success && Array.isArray(reviewsRes.reviews)) {
        setReviews(reviewsRes.reviews as any);
        try {
          localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviewsRes.reviews));
        } catch (e) {
          console.warn("Failed to persist reviews to localStorage:", e);
        }
      }

      const adminToken = typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("mshaies_admin_token") || localStorage.getItem("mshaies_admin_token")
        : null;
      if (adminToken) {
        const [ordersRes, couponsRes, auditRes] = await Promise.all([
          getOrdersServerFn({ data: { authToken: adminToken } }),
          getCouponsServerFn({ data: { authToken: adminToken } }),
          getAuditLogsServerFn({ data: { authToken: adminToken } }),
        ]);

        if (ordersRes.success && Array.isArray(ordersRes.orders)) {
          setOrders(ordersRes.orders as any);
          try {
            localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(ordersRes.orders));
          } catch (e) {
            console.warn("Failed to persist orders to localStorage:", e);
          }
        }
        if (couponsRes.success && Array.isArray(couponsRes.coupons)) {
          setCoupons(couponsRes.coupons as any);
          try {
            localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(couponsRes.coupons));
          } catch (e) {
            console.warn("Failed to persist coupons to localStorage:", e);
          }
        }
        if (auditRes.success && Array.isArray(auditRes.logs)) {
          setAuditLogs(auditRes.logs as any);
          try {
            localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditRes.logs));
          } catch (e) {
            console.warn("Failed to persist audit logs to localStorage:", e);
          }
        }
      }
    } catch (err) {
      console.warn("[ProductsStoreProvider] Failed to load data from server, using local store:", err);
    }
  };

  const purgeCache = async () => {
    try {
      const adminToken = typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("mshaies_admin_token") || localStorage.getItem("mshaies_admin_token")
        : null;
      await purgeServerCacheFn({ data: { authToken: adminToken || undefined } });
    } catch (e) {
      console.warn("[purgeCache] server purge error:", e);
    }
    lastSyncRef.current = 0;
    await refreshDataFromServer(true);
  };

  useEffect(() => {
    refreshDataFromServer();
  }, []);

  // Sync state to local cache for instant offline fallback
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
    } catch (e) {
      console.warn("Failed to update local cache:", e);
    }
  }, [products, categories, coupons, orders, settings, reviews, auditLogs]);

  const addAuditLog = (
    action: string, 
    category: AuditLogEntry["category"], 
    details: string, 
    user: string = "Staff Admin"
  ) => {
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      action,
      category,
      details,
      user,
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  };

  const addProduct = async (newProd: Omit<Product, "id">): Promise<{ success: boolean; error?: string; product?: Product }> => {
    const slug = newProd.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const id = `${slug}-${Date.now().toString().slice(-4)}`;
    const fullProd: Product = { ...newProd, id };

    const token = typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("mshaies_admin_token") || (typeof localStorage !== "undefined" ? localStorage.getItem("mshaies_admin_token") : null) || undefined
      : undefined;

    if (!token) {
      return { success: false, error: "Administrative authorization token missing. Please sign in to the Admin Panel to save changes." };
    }

    try {
      const res = await saveProductServerFn({ data: { authToken: token, product: fullProd as any } });
      if (!res.success) {
        return { success: false, error: res.error || "Failed to save product to Supabase." };
      }

      setProducts((prev) => [fullProd, ...prev.filter((p) => p.id !== fullProd.id)]);
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([fullProd, ...products.filter((p) => p.id !== fullProd.id)]));
      } catch (e) {
        console.warn(e);
      }
      addAuditLog("Product Added", "Product", `Added new fragrance "${newProd.name}" priced at ₨ ${newProd.price.toLocaleString()}`);

      return { success: true, product: fullProd };
    } catch (err: any) {
      return { success: false, error: err?.message || "Network exception while saving product." };
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<{ success: boolean; error?: string }> => {
    const target = products.find((p) => p.id === id);
    if (!target) return { success: false, error: "Product not found." };
    const merged: Product = { ...target, ...updates };

    const token = typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("mshaies_admin_token") || (typeof localStorage !== "undefined" ? localStorage.getItem("mshaies_admin_token") : null) || undefined
      : undefined;

    if (!token) {
      return { success: false, error: "Administrative authorization token missing. Please sign in again." };
    }

    try {
      const res = await saveProductServerFn({ data: { authToken: token, product: merged as any } });
      if (!res.success) {
        return { success: false, error: res.error || "Failed to update product in Supabase." };
      }

      setProducts((prev) => prev.map((p) => (p.id === id ? merged : p)));
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products.map((p) => (p.id === id ? merged : p))));
      } catch (e) {
        console.warn(e);
      }
      addAuditLog("Product Modified", "Product", `Updated configuration for "${updates.name || id}"`);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Network exception while updating product." };
    }
  };

  const deleteProduct = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const token = typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("mshaies_admin_token") || (typeof localStorage !== "undefined" ? localStorage.getItem("mshaies_admin_token") : null) || undefined
      : undefined;

    if (!token) {
      return { success: false, error: "Administrative authorization token missing. Please sign in again." };
    }

    try {
      const res = await deleteProductServerFn({ data: { authToken: token, id } });
      if (!res.success) {
        return { success: false, error: res.error || "Failed to delete product from Supabase." };
      }

      const found = products.find((p) => p.id === id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products.filter((p) => p.id !== id)));
      } catch (e) {
        console.warn(e);
      }
      addAuditLog("Product Removed", "Product", `Deleted item "${found?.name || id}" from catalog`);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Network exception while deleting product." };
    }
  };

  const updateStock = (id: string, newStock: number) => {
    const found = products.find((p) => p.id === id);
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: Math.max(0, newStock) } : p))
    );
    addAuditLog("Stock Adjusted", "Stock", `Restocked "${found?.name || id}" to ${newStock} units`);

    if (found) {
      const token = typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("mshaies_admin_token") || (typeof localStorage !== "undefined" ? localStorage.getItem("mshaies_admin_token") : null) || undefined
        : undefined;
      saveProductServerFn({
        data: {
          authToken: token,
          product: { ...found, stock: Math.max(0, newStock) } as any,
        },
      }).catch((err) => console.warn("[saveProductServerFn]", err));
    }
  };

  const bulkImportProducts = async (importedList: Partial<Product>[]): Promise<{ count: number; error?: string }> => {
    let count = 0;
    const cleanList: Product[] = [];
    for (const item of importedList) {
      if (!item.name || !item.price) continue;
      const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const id = item.id || `${slug}-${Date.now().toString().slice(-4)}-${count}`;
      cleanList.push({
        id,
        name: item.name,
        price: Number(item.price),
        category: item.category || "Attars",
        volume: item.volume || "12ml Pure Attar",
        stock: Number(item.stock ?? 10),
        tagline: item.tagline || "Hand-poured signature fragrance.",
        notes: item.notes || "Oud · Amber · Rose",
        topNotes: item.topNotes || "Bergamot, Fresh Saffron",
        heartNotes: item.heartNotes || "Damask Rose, Frankincense",
        baseNotes: item.baseNotes || "Aged Cambodian Oud, Amber",
        image: item.image || "/product-box.jpg",
        description: item.description || "Handcrafted pure luxury fragrance.",
        isFeatured: item.isFeatured ?? true,
        gender: item.gender || "Unisex",
        longevityHours: item.longevityHours || 18,
        sillageRating: item.sillageRating || "Strong",
        seasonSuitability: item.seasonSuitability || ["All-Season"],
        occasionSuitability: item.occasionSuitability || ["Daily Office", "Evening Gala"],
        inspiredBy: item.inspiredBy,
        fragranceFamily: item.fragranceFamily || "Woody Oud",
        samplePrice: item.samplePrice || 650,
        batchNumber: item.batchNumber || `MSH-2026-IMP${count + 1}`,
      });
      count++;
    }

    if (cleanList.length > 0) {
      const token = typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("mshaies_admin_token") || (typeof localStorage !== "undefined" ? localStorage.getItem("mshaies_admin_token") : null) || undefined
        : undefined;

      if (!token) {
        return { count: 0, error: "Administrative authorization token missing. Please sign in again." };
      }

      try {
        const res = await bulkImportProductsServerFn({ data: { authToken: token, products: cleanList as any } });
        if (!res.success) {
          return { count: 0, error: res.error || "Failed to save imported products to Supabase." };
        }

        setProducts((prev) => [...cleanList, ...prev]);
        try {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([...cleanList, ...products]));
        } catch {}
        addAuditLog("Bulk Import", "Product", `Batch imported ${cleanList.length} fragrances into inventory.`);
      } catch (err: any) {
        return { count: 0, error: err?.message || "Failed to bulk import products." };
      }
    }
    return { count };
  };

  const addCategory = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]);
    }
  };

  const deleteCategory = (name: string) => {
    if (name === "All") return;
    setCategories((prev) => prev.filter((c) => c !== name));
  };

  // --- DISCOUNT & COUPON METHODS ---
  const addCoupon = (newCoupon: Omit<Coupon, "id" | "usedCount">) => {
    const id = `cpn-${Date.now().toString().slice(-5)}`;
    const fullCoupon: Coupon = {
      ...newCoupon,
      id,
      code: newCoupon.code.toUpperCase().trim(),
      usedCount: 0,
    };
    setCoupons((prev) => [fullCoupon, ...prev]);

    const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("mshaies_admin_token") || undefined : undefined;
    saveCouponServerFn({ data: { authToken: token, coupon: fullCoupon } }).catch((err) =>
      console.warn("[saveCouponServerFn]", err)
    );
  };

  const toggleCoupon = (id: string) => {
    setCoupons((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c));
      const target = updated.find((c) => c.id === id);
      if (target) {
        const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("mshaies_admin_token") || undefined : undefined;
        saveCouponServerFn({ data: { authToken: token, coupon: target } }).catch((err) =>
          console.warn("[saveCouponServerFn]", err)
        );
      }
      return updated;
    });
  };

  const deleteCoupon = (id: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));

    const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("mshaies_admin_token") || undefined : undefined;
    deleteCouponServerFn({ data: { authToken: token, id } }).catch((err) =>
      console.warn("[deleteCouponServerFn]", err)
    );
  };

  const validateCoupon = (code: string, subtotal: number): ValidateCouponResult => {
    const cleanCode = code.toUpperCase().trim();
    const coupon = coupons.find((c) => c.code.toUpperCase() === cleanCode);

    if (!coupon) {
      return { valid: false, discountAmount: 0, message: "Invalid coupon code." };
    }

    if (!coupon.isActive) {
      return { valid: false, discountAmount: 0, message: "This coupon is currently inactive." };
    }

    if (coupon.minOrder > 0 && subtotal < coupon.minOrder) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Minimum order of ₨ ${coupon.minOrder.toLocaleString()} required for this coupon.`,
      };
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, discountAmount: 0, message: "This coupon has reached its maximum usage limit." };
    }

    let discount = 0;
    let freeShipping = false;

    if (coupon.type === "percent") {
      discount = Math.round((subtotal * coupon.value) / 100);
    } else if (coupon.type === "flat") {
      discount = Math.min(subtotal, coupon.value);
    } else if (coupon.type === "shipping") {
      freeShipping = true;
      discount = 0;
    }

    return {
      valid: true,
      coupon,
      discountAmount: discount,
      freeShipping,
      message: `Coupon ${coupon.code} applied successfully!`,
    };
  };

  // --- ORDER METHODS ---
  const placeOrder = async (orderData: Omit<Order, "id" | "date">): Promise<string> => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const orderId = `MSH-${randomNum}`;
    const date = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const newOrder: Order = {
      ...orderData,
      id: orderId,
      date,
    };

    // Increment coupon usage count if used
    if (orderData.discountCode) {
      setCoupons((prev) =>
        prev.map((c) =>
          c.code === orderData.discountCode ? { ...c, usedCount: c.usedCount + 1 } : c
        )
      );
    }

    // Deduct local stock
    setProducts((prevProducts) => {
      return prevProducts.map((prod) => {
        const itemInOrder = orderData.items.find((i) => i.productId === prod.id);
        if (itemInOrder) {
          const updatedStock = Math.max(0, prod.stock - itemInOrder.qty);
          return { ...prod, stock: updatedStock };
        }
        return prod;
      });
    });

    // Synchronize authoritative order to database via server function
    let finalOrderId = orderId;
    try {
      const serverResult = await placeOrderServerFn({
        data: {
          orderId,
          customerName: orderData.customerName,
          email: orderData.email,
          phone: orderData.phone,
          address: orderData.address,
          city: orderData.city,
          postalCode: orderData.postalCode,
          shippingMethod: "standard",
          paymentMethod: orderData.paymentMethod,
          transactionId: orderData.transactionId,
          discountCode: orderData.discountCode,
          isGiftWrapped: orderData.isGiftWrapped,
          giftMessage: orderData.giftMessage,
          items: orderData.items.map((i) => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            qty: i.qty,
            volume: i.volume,
            image: i.image,
          })),
        },
      });

      if (serverResult && !serverResult.success && serverResult.error) {
        throw new Error(serverResult.error);
      }

      if (serverResult?.order?.id && serverResult.order.id !== orderId) {
        finalOrderId = serverResult.order.id;
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, id: finalOrderId } : o))
        );
      }
    } catch (err: any) {
      console.warn("[placeOrderServerFn] Server order sync notification:", err?.message || err);
      // If server returned an explicit error like insufficient stock, bubble it up
      if (err?.message && !err.message.includes("fetch") && !err.message.includes("network")) {
        throw err;
      }
    }

    setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
    addAuditLog(
      "Order Received",
      "Order",
      `Order #${finalOrderId} placed by ${orderData.customerName} for ₨ ${orderData.total.toLocaleString()} via ${orderData.paymentMethod.toUpperCase()}`
    );

    return finalOrderId;
  };

  const updateOrderStatus = (
    id: string,
    status: Order["orderStatus"],
    courier?: string,
    tracking?: string
  ) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              orderStatus: status,
              courierName: courier || o.courierName,
              trackingNumber: tracking || o.trackingNumber,
            }
          : o
      )
    );
    addAuditLog(
      "Order Dispatched", 
      "Order", 
      `Order #${id} marked as ${status}${tracking ? ` via ${courier || "Courier"} (Tracking: ${tracking})` : ""}`
    );

    const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("mshaies_admin_token") || undefined : undefined;
    updateOrderStatusServerFn({
      data: {
        id,
        status,
        courierName: courier,
        trackingNumber: tracking,
        authToken: token,
      },
    }).catch((err) => console.warn("[updateOrderStatusServerFn]", err));
  };

  const updatePaymentStatus = (id: string, paymentStatus: Order["paymentStatus"]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, paymentStatus } : o))
    );
    addAuditLog(
      "Payment Verified",
      "Order",
      `Order #${id} payment status updated to "${paymentStatus}"`
    );

    const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("mshaies_admin_token") || undefined : undefined;
    updatePaymentStatusServerFn({
      data: {
        id,
        paymentStatus,
        authToken: token,
      },
    }).catch((err) => console.warn("[updatePaymentStatusServerFn]", err));
  };

  const getOrder = (id: string) => {
    return orders.find((o) => o.id === id);
  };

  // --- STORE SETTINGS & DATA BACKUP ---
  const updateSettings = (updates: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    addAuditLog("Settings Saved", "Settings", "Store parameters, shipping rates, or social links updated.");

    const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("mshaies_admin_token") || undefined : undefined;
    updateSettingsServerFn({
      data: {
        authToken: token,
        settings: updates,
      },
    }).catch((err) => console.warn("[updateSettingsServerFn]", err));
  };

  const exportAllStoreData = (): string => {
    const fullBackup = {
      version: "4.0-database",
      exportDate: new Date().toISOString(),
      products,
      categories,
      coupons,
      orders,
      settings,
      auditLogs,
    };
    return JSON.stringify(fullBackup, null, 2);
  };

  const importStoreData = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.products && Array.isArray(parsed.products)) setProducts(parsed.products);
      if (parsed.categories && Array.isArray(parsed.categories)) setCategories(parsed.categories);
      if (parsed.coupons && Array.isArray(parsed.coupons)) setCoupons(parsed.coupons);
      if (parsed.orders && Array.isArray(parsed.orders)) setOrders(parsed.orders);
      if (parsed.settings) setSettings(parsed.settings);
      if (parsed.auditLogs && Array.isArray(parsed.auditLogs)) setAuditLogs(parsed.auditLogs);
      addAuditLog("Database Restored", "System", "Full store database restored from JSON backup archive.");

      const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("mshaies_admin_token") || undefined : undefined;
      restoreDatabaseBackupServerFn({
        data: {
          authToken: token,
          backupJson: jsonData,
        },
      }).catch((err) => console.warn("[restoreDatabaseBackupServerFn]", err));

      return true;
    } catch {
      return false;
    }
  };

  // --- REVIEWS SYSTEM METHODS ---
  const addReview = (reviewData: Omit<ProductReview, "id" | "date" | "helpfulCount">) => {
    const newReview: ProductReview = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      helpfulCount: 0,
    };
    setReviews((prev) => [newReview, ...prev]);
    addAuditLog("Review Added", "Product", `New verified review by ${reviewData.author} for product ID "${reviewData.productId}"`);

    addReviewServerFn({
      data: {
        productId: reviewData.productId,
        author: reviewData.author,
        city: reviewData.city,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
      },
    }).catch((err) => console.warn("[addReviewServerFn]", err));
  };

  const voteHelpful = (reviewId: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r))
    );
    voteHelpfulServerFn({ data: { reviewId } }).catch((err) => console.warn("[voteHelpfulServerFn]", err));
  };

  const getProductReviews = (productId: string) => {
    return reviews.filter((r) => r.productId === productId);
  };

  const getProductRating = (productId: string) => {
    const prodReviews = reviews.filter((r) => r.productId === productId);
    if (prodReviews.length === 0) return { average: 0, count: 0 };
    const sum = prodReviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: Number((sum / prodReviews.length).toFixed(1)),
      count: prodReviews.length,
    };
  };

  // --- CAREERS & JOB POSTING METHODS ---
  const addJob = (jobData: Omit<JobPosting, "id" | "createdAt">) => {
    const newJob: JobPosting = {
      ...jobData,
      id: `job-${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0],
      applicantCount: 0,
    };
    setJobs((prev) => [newJob, ...prev]);
    addAuditLog("Job Vacancy Created", "System", `Published new job opening: "${newJob.title}" in ${newJob.department}`);
  };

  const updateJob = (id: string, updates: Partial<JobPosting>) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, ...updates } : j))
    );
    addAuditLog("Job Vacancy Updated", "System", `Updated vacancy details for job ID: ${id}`);
  };

  const deleteJob = (id: string) => {
    const target = jobs.find((j) => j.id === id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
    addAuditLog("Job Vacancy Deleted", "System", `Removed job vacancy: "${target?.title || id}"`);
  };

  const toggleJobStatus = (id: string) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === id) {
          const newStatus = j.status === "Open" ? "Closed" : "Open";
          addAuditLog("Job Status Toggled", "System", `Vacancy "${j.title}" status changed to ${newStatus}`);
          return { ...j, status: newStatus };
        }
        return j;
      })
    );
  };

  const resetToDefaults = () => {
    setProducts(DEFAULT_PRODUCTS);
    setCategories(DEFAULT_CATEGORIES);
    setCoupons(DEFAULT_COUPONS);
    setOrders([]);
    setSettings(DEFAULT_SETTINGS);
    setReviews(DEFAULT_REVIEWS);
    setAuditLogs(DEFAULT_AUDIT_LOGS);
    setJobs(DEFAULT_JOBS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.COUPONS);
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.REVIEWS);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    localStorage.removeItem(STORAGE_KEYS.JOBS);
  };

  return (
    <ProductsStoreContext.Provider
      value={{
        products,
        categories,
        coupons,
        orders,
        settings,
        reviews,
        auditLogs,
        jobs,
        addAuditLog,
        bulkImportProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        updateStock,
        addCategory,
        deleteCategory,
        addCoupon,
        toggleCoupon,
        deleteCoupon,
        validateCoupon,
        placeOrder,
        updateOrderStatus,
        updatePaymentStatus,
        getOrder,
        addReview,
        voteHelpful,
        getProductReviews,
        getProductRating,
        updateSettings,
        exportAllStoreData,
        importStoreData,
        resetToDefaults,
        addJob,
        updateJob,
        deleteJob,
        toggleJobStatus,
        refreshDataFromServer,
        purgeCache,
      }}
    >
      {children}
    </ProductsStoreContext.Provider>
  );
}

export function useProductsStore() {
  const context = useContext(ProductsStoreContext);
  if (!context) {
    throw new Error("useProductsStore must be used within a ProductsStoreProvider");
  }
  return context;
}
