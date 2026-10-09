import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
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
  fragranceFamily?: "Woody Oud" | "Floral Amber" | "Fresh Citrus" | "Oriental Spice" | "Leather Smoke";
  layeringPairId?: string;
  samplePrice?: number;
  batchNumber?: string;
};

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
};

export const DEFAULT_SETTINGS: StoreSettings = {
  adminPin: "7860",
  announcementText: "Flat 15% OFF on all Pure Attar Oils — Use code",
  announcementCode: "LUXE15",
  announcementActive: true,
  freeShippingThreshold: 5000,
  standardShippingFee: 250,
  expressShippingFee: 450,
  expressShippingActive: true,
  lahoreLocalFee: 150,
  lahoreLocalActive: true,
  codFee: 0,
  freeShippingEnabled: true,
  shippingEstimateDays: "2-4 Business Days",
  courierPartners: "TCS Express & Leopards Courier",
  whatsappNumber: "+923390001826",
  contactEmail: "info@mshaies.com",
  instagramUrl: "https://www.instagram.com/m.shaiesfragrances",
  facebookUrl: "https://www.facebook.com/profile.php?id=61575714252560",
  tiktokUrl: "https://www.tiktok.com/@mshaiesfragrances",
  autoLockMinutes: 15,
  heroBannerActive: true,
  heroBannerImage: "/product-box.jpg",
  heroBannerLink: "/shop",
  heroBannerAlt: "Maison Luxury Promotions & Festive Offers",
  heroBannerAnimation: "fadeIn",
  heroBannerTag: "Maison Exclusive · Limited Festive Release",
  heroBannerTitle: "Complimentary 3ml Discovery Flacon With Every Order Over ₨ 5,000",
  heroBannerSubtitle: "100% Alcohol-Free Pure Attar Oils & 35% Extrait Parfums. Use Code LUXE15 for Flat 15% OFF Nationwide.",
  heroBannerButtonText: "Claim Exclusive Offer →",
  heroBannerStyle: "hybrid",
  heroBannerTransitionEffect: "slide",
  heroBannerTransitionSpeed: 4500,
  heroBannerShimmer: true,
};

export const DEFAULT_CATEGORIES: Category[] = [
  "All",
  "Attars",
  "Perfumes",
  "Watches",
  "Gift Sets",
];

export const DEFAULT_ORDERS: Order[] = [
  {
    id: "MSH-98214",
    customerName: "Malik Tariq Rehman",
    email: "tariq.rehman@dha-lahore.pk",
    phone: "03008451920",
    address: "Bungalow 42, Sector Y, Phase 5, DHA",
    city: "Lahore",
    postalCode: "54792",
    paymentMethod: "card",
    paymentStatus: "Paid",
    orderStatus: "Delivered",
    date: "2026-09-28",
    items: [
      {
        productId: "dehn-al-oudh-qadeem",
        name: "Dehn Al Oudh Qadeem",
        price: 24000,
        qty: 1,
        volume: "12ml Pure Attar",
        image: "/product-box.jpg",
      },
      {
        productId: "oud-al-jamil",
        name: "Oud Al-Jamil",
        price: 12500,
        qty: 1,
        volume: "12ml Pure Attar",
        image: "/product-box.jpg",
      },
    ],
    subtotal: 36500,
    discountCode: "LUXE15",
    discountAmount: 5475,
    shipping: 0,
    total: 31025,
    courierName: "TCS Express",
    trackingNumber: "TCS-991204812",
  },
  {
    id: "MSH-97430",
    customerName: "Syeda Zainab Bukhari",
    email: "zainab.bukhari@gmail.com",
    phone: "03214598124",
    address: "Block 4, Clifton Marine Drive",
    city: "Karachi",
    postalCode: "75600",
    paymentMethod: "nayapay",
    paymentStatus: "Paid",
    orderStatus: "Delivered",
    date: "2026-09-30",
    items: [
      {
        productId: "midnight-rose",
        name: "Midnight Rose",
        price: 9800,
        qty: 2,
        volume: "50ml Extrait",
        image: "/product-midnight-rose.png",
      },
    ],
    subtotal: 19600,
    shipping: 0,
    total: 19600,
    courierName: "Leopards Courier",
    trackingNumber: "LCS-77182910",
  },
  {
    id: "MSH-96841",
    customerName: "Malik Tariq Rehman",
    email: "tariq.rehman@dha-lahore.pk",
    phone: "03008451920",
    address: "Bungalow 42, Sector Y, Phase 5, DHA",
    city: "Lahore",
    postalCode: "54792",
    paymentMethod: "card",
    paymentStatus: "Paid",
    orderStatus: "Delivered",
    date: "2026-10-04",
    items: [
      {
        productId: "royal-ambergris",
        name: "Royal Ambergris",
        price: 18500,
        qty: 1,
        volume: "12ml Pure Attar",
        image: "/product-box.jpg",
      },
    ],
    subtotal: 18500,
    shipping: 0,
    total: 18500,
    courierName: "TCS Express",
    trackingNumber: "TCS-991208944",
  },
  {
    id: "MSH-95312",
    customerName: "Barrister Hamza Alvi",
    email: "hamza.alvi@chambers.pk",
    phone: "03335198240",
    address: "House 18, Street 24, Sector F-7/2",
    city: "Islamabad",
    postalCode: "44000",
    paymentMethod: "jazzcash",
    paymentStatus: "Paid",
    orderStatus: "Dispatched",
    date: "2026-10-06",
    items: [
      {
        productId: "oud-al-jamil",
        name: "Oud Al-Jamil",
        price: 12500,
        qty: 1,
        volume: "12ml Pure Attar",
        image: "/product-box.jpg",
      },
    ],
    subtotal: 12500,
    shipping: 0,
    total: 12500,
    courierName: "TCS Express",
    trackingNumber: "TCS-991211029",
  },
  {
    id: "MSH-94109",
    customerName: "Dr. Ayesha Siddiqui",
    email: "ayesha.siddiqui@aku.edu",
    phone: "03452109845",
    address: "Hill Park Society, PECHS Block 6",
    city: "Karachi",
    postalCode: "75400",
    paymentMethod: "easypaisa",
    paymentStatus: "Paid",
    orderStatus: "Delivered",
    date: "2026-10-07",
    items: [
      {
        productId: "desert-gold",
        name: "Desert Gold",
        price: 11200,
        qty: 1,
        volume: "50ml Extrait",
        image: "/product-desert-gold.png",
      },
    ],
    subtotal: 11200,
    shipping: 0,
    total: 11200,
    courierName: "Trax Logistics",
    trackingNumber: "TRX-4412981",
  },
  {
    id: "MSH-93882",
    customerName: "Chaudhry Shahbaz Warraich",
    email: "shahbaz@warraichgroup.com",
    phone: "03017765290",
    address: "Canal Road, Officers Colony",
    city: "Faisalabad",
    postalCode: "38000",
    paymentMethod: "cod",
    paymentStatus: "Pending COD",
    orderStatus: "Processing",
    date: "2026-10-08",
    items: [
      {
        productId: "dehn-al-oudh-qadeem",
        name: "Dehn Al Oudh Qadeem",
        price: 24000,
        qty: 1,
        volume: "12ml Pure Attar",
        image: "/product-box.jpg",
      },
    ],
    subtotal: 24000,
    shipping: 0,
    total: 24000,
  },
  {
    id: "MSH-92715",
    customerName: "Sardar Jahangir Khan",
    email: "jahangir.khan@peshawarcivic.pk",
    phone: "03129087612",
    address: "Mall Road, Peshawar Cantt",
    city: "Peshawar",
    postalCode: "25000",
    paymentMethod: "card",
    paymentStatus: "Paid",
    orderStatus: "Confirmed",
    date: "2026-10-09",
    items: [
      {
        productId: "royal-ambergris",
        name: "Royal Ambergris",
        price: 18500,
        qty: 1,
        volume: "12ml Pure Attar",
        image: "/product-box.jpg",
      },
    ],
    subtotal: 18500,
    shipping: 0,
    total: 18500,
  },
];

export const DEFAULT_COUPONS: Coupon[] = [
  {
    id: "luxe15",
    code: "LUXE15",
    type: "percent",
    value: 15,
    minOrder: 0,
    maxUses: 500,
    usedCount: 14,
    expiryDate: "2026-12-31",
    isActive: true,
    description: "Grand Launch Offer: Flat 15% OFF on all products",
  },
  {
    id: "maison1000",
    code: "MAISON1000",
    type: "flat",
    value: 1000,
    minOrder: 8000,
    maxUses: 200,
    usedCount: 6,
    expiryDate: "2026-12-31",
    isActive: true,
    description: "Flat ₨ 1,000 OFF on orders above ₨ 8,000",
  },
  {
    id: "freeship",
    code: "FREESHIP",
    type: "shipping",
    value: 250,
    minOrder: 0,
    maxUses: 1000,
    usedCount: 28,
    expiryDate: "2026-12-31",
    isActive: true,
    description: "Free Express Nationwide Shipping Voucher",
  }
];

export const DEFAULT_REVIEWS: ProductReview[] = [
  {
    id: "rev-1",
    productId: "oud-al-jamil",
    author: "Hamza Tariq",
    city: "Lahore",
    rating: 5,
    title: "Royal projection and immense longevity",
    comment: "Applied two swipes on Jummah morning and could still smell the sweet aged Cambodian agarwood on my sherwani the next morning. Incredible silage and authentic dry-down. 10/10 masterpiece.",
    date: "2026-08-24",
    verified: true,
    helpfulCount: 24,
  },
  {
    id: "rev-2",
    productId: "oud-al-jamil",
    author: "Dr. Ayesha Malik",
    city: "Islamabad",
    rating: 5,
    title: "Comparable to Roja & Clive Christian niche oils",
    comment: "The damask rose balance with the smoky leather and vintage agarwood is exceptionally refined. Truly a signature scent for high-profile evenings and diplomatic dinners.",
    date: "2026-08-18",
    verified: true,
    helpfulCount: 16,
  },
  {
    id: "rev-3",
    productId: "midnight-rose-attar",
    author: "Zainab Farooq",
    city: "Karachi",
    rating: 5,
    title: "Unbelievable performance in Karachi humid climate",
    comment: "Most European perfumes disappear in Karachi coastal humidity within 2 hours. This pure oil projected for over 10 hours without being cloying or suffocating. Received compliments all evening.",
    date: "2026-08-27",
    verified: true,
    helpfulCount: 19,
  },
  {
    id: "rev-4",
    productId: "midnight-rose-attar",
    author: "Usman Ghani",
    city: "Faisalabad",
    rating: 5,
    title: "Intimate velvet rose with dark patchouli",
    comment: "Gifted this to my wife for our anniversary. The presentation box and crystal bottle are exquisite, and the scent trail is captivating.",
    date: "2026-08-14",
    verified: true,
    helpfulCount: 11,
  },
  {
    id: "rev-5",
    productId: "desert-gold-edp",
    author: "Bilal Mansoor",
    city: "Peshawar",
    rating: 5,
    title: "Compliment magnet at family weddings",
    comment: "The amber and saffron dry-down is stunning. The atomizer produces a fine cloud mist. Delivered to Peshawar via TCS in pristine condition within 2 days.",
    date: "2026-08-29",
    verified: true,
    helpfulCount: 14,
  },
  {
    id: "rev-6",
    productId: "royal-ambergris",
    author: "Kamran Siddiqui",
    city: "Karachi",
    rating: 5,
    title: "True oceanic grey ambergris — extremely rare find",
    comment: "I have collected niche attars for 15 years in the Gulf. Finding genuine grey ambergris resin at this level in Pakistan is unprecedented. Extraordinary warmth and sillage.",
    date: "2026-08-11",
    verified: true,
    helpfulCount: 22,
  },
  {
    id: "rev-7",
    productId: "dehn-al-oudh-qadeem",
    author: "Sheikh M. Asif",
    city: "Rawalpindi",
    rating: 5,
    title: "Authentic 15-year aged Assam oud",
    comment: "No barnyard harshness, only deep wood, ancient honey, and noble smoke. An heirloom investment.",
    date: "2026-08-05",
    verified: true,
    helpfulCount: 31,
  },
  {
    id: "rev-8",
    productId: "chronographe-or-rose",
    author: "Daniyal Shah",
    city: "Lahore",
    rating: 5,
    title: "Heirloom craftsmanship on the wrist",
    comment: "Sapphire glass, textured champagne dial, and hand-stitched leather. The packaging feels like opening an Audemars Piguet box. Exceptional prestige.",
    date: "2026-08-20",
    verified: true,
    helpfulCount: 17,
  }
];

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

export const DEFAULT_JOBS: JobPosting[] = [
  {
    id: "job-perfumer",
    title: "Artisanal Perfume Blender & Quality Specialist",
    department: "Perfumery Studio",
    location: "Pakistan Studio / Nationwide",
    type: "Full-Time",
    experience: "1-3 Years",
    salaryRange: "PKR 90,000 - 150,000 / Month",
    description: "Work directly with master distillers handling aged oud distillations, maceration, and flacon filling.",
    requirements: [
      "Deep olfactory appreciation for aged oud, rose absolute, and amber notes",
      "Prior experience in laboratory formulation, distillation, or artisanal chemistry",
      "Meticulous attention to cleanliness, sterile filling, and batch tracking"
    ],
    benefits: [
      "Monthly allowance of pure attars & rare distillations",
      "Health insurance & Eid bonuses",
      "Direct mentorship from master perfumers"
    ],
    status: "Open",
    createdAt: "2026-08-15",
    applicantCount: 14,
  },
  {
    id: "job-concierge",
    title: "Luxury Fragrance Concierge & Client Advisor",
    department: "Maison Retail",
    location: "Pakistan Retail / Client Concierge",
    type: "Full-Time",
    experience: "1-3 Years",
    salaryRange: "PKR 70,000 - 110,000 + Commissions",
    description: "Provide personalized olfactory consultations, custom attar curation, and VIP client relations.",
    requirements: [
      "Polished interpersonal communication in English and Urdu",
      "Refined aesthetic etiquette and luxury client service mindset",
      "Familiarity with luxury notes, fragrance pyramid, and layering"
    ],
    benefits: [
      "Attractive commission on haute parfumerie flacons",
      "Luxury uniform & grooming allowance",
      "VIP private salon event exposure"
    ],
    status: "Open",
    createdAt: "2026-08-20",
    applicantCount: 22,
  },
  {
    id: "job-marketer",
    title: "Digital E-Commerce & Brand Marketer",
    department: "Commerce & Growth",
    location: "Pakistan / Remote",
    type: "Full-Time",
    experience: "2-4 Years",
    salaryRange: "PKR 100,000 - 180,000 / Month",
    description: "Lead digital campaigns, influencer relations, and visual storytelling for Pakistan's premier fragrance brand.",
    requirements: [
      "Proven track record scaling D2C luxury brands in Pakistan / GCC",
      "Mastery of Meta Ads, TikTok Shop, high-end editorial copy, and aesthetic visual direction",
      "Understanding of ROAS, CPA, and retention marketing"
    ],
    benefits: [
      "Flexible hybrid/remote schedule with studio access",
      "Performance incentives tied to milestone targets",
      "Latest tech gear allowance"
    ],
    status: "Open",
    createdAt: "2026-08-25",
    applicantCount: 31,
  }
];

export const DEFAULT_PRODUCTS: Product[] = [
  // --- ATTARS ---
  {
    id: "oud-al-jamil",
    name: "Oud Al-Jamil",
    price: 12500,
    category: "Attars",
    volume: "12ml Pure Attar",
    stock: 15,
    tagline: "Smoked aged Cambodian oud, damask rose absolute, rich leather.",
    notes: "Aged Oud · Damask Rose · Leather",
    topNotes: "Taif Rose, Bergamot",
    heartNotes: "Smoked Leather, Saffron, Frankincense",
    baseNotes: "Aged Cambodian Oud, Ambergris, Oakmoss",
    image: "/product-box.jpg",
    images: ["/product-box.jpg", "/product-dark.jpg", "/product-desert-gold.png"],
    accent: "from-[#3a2a18] to-[#7a5a2a]",
    description: "Hand-poured in limited batches using authentic aged Cambodian Agarwood oil. A majestic scent commanding poise and presence.",
    isFeatured: true,
    gender: "Unisex",
    longevityHours: 20,
    sillageRating: "Enormous",
    seasonSuitability: ["Winter", "Autumn", "All-Season"],
    occasionSuitability: ["Wedding / Barat", "Evening Gala", "Jummah / Spiritual"],
    inspiredBy: "Artisanal kinship to Roja Amber Aoud & Clive Christian C",
    fragranceFamily: "Woody Oud",
    layeringPairId: "desert-gold-edp",
    samplePrice: 650,
    batchNumber: "MSH-2026-B1",
  },
  {
    id: "midnight-rose-attar",
    name: "Midnight Rose Attar",
    price: 9800,
    category: "Attars",
    volume: "12ml Pure Attar",
    stock: 22,
    tagline: "Velvet petals after rain — quiet, deep, intimate.",
    notes: "Rose Absolute · Patchouli · White Musk",
    topNotes: "Fresh Dewdrop, Pink Pepper",
    heartNotes: "Velvet Rose Petals, Turkish Jasmine",
    baseNotes: "Indonesian Patchouli, Warm White Musk, Cashmere Wood",
    image: "/product-midnight-rose.png",
    images: ["/product-midnight-rose.png", "/product-box.jpg", "/product-dark.jpg"],
    accent: "from-[#2a1024] to-[#7a2a48]",
    description: "An evocative, romantic floral fragrance steeped in velvety darkness. Crafted with rare Turkish and Bulgarian rose essences.",
    isFeatured: true,
    gender: "Women",
    longevityHours: 16,
    sillageRating: "Strong",
    seasonSuitability: ["Spring", "Autumn", "All-Season"],
    occasionSuitability: ["Evening Gala", "Daily Office", "Wedding / Barat"],
    inspiredBy: "Kinship to Frederic Malle Portrait of a Lady & Tom Ford Noir de Noir",
    fragranceFamily: "Floral Amber",
    layeringPairId: "velvet-saffron-edp",
    samplePrice: 650,
    batchNumber: "MSH-2026-B2",
  },
  {
    id: "royal-ambergris",
    name: "Royal Ambergris",
    price: 18500,
    category: "Attars",
    volume: "12ml Pure Attar",
    stock: 8,
    tagline: "Oceanic grey amber with warm balsamic resins.",
    notes: "Ambergris · Bergamot · Sweet Cedar",
    topNotes: "Calabrian Bergamot, Sea Breeze",
    heartNotes: "Precious Grey Ambergris, Clary Sage",
    baseNotes: "Atlas Cedarwood, Warm Benzoin, Labdanum",
    image: "/product-dark.jpg",
    accent: "from-[#1a2530] to-[#3a4a58]",
    description: "An extraordinarily rare attar composition anchored by natural grey ambergris notes, harmonized with balsamic resins.",
    isFeatured: false,
    gender: "Unisex",
    longevityHours: 24,
    sillageRating: "Enormous",
    seasonSuitability: ["All-Season", "Summer", "Winter"],
    occasionSuitability: ["Evening Gala", "Wedding / Barat", "Daily Office"],
    inspiredBy: "Kinship to Creed Millesime Imperial & Brecourt Ambre Noir",
    fragranceFamily: "Fresh Citrus",
    layeringPairId: "oud-al-jamil",
    samplePrice: 850,
    batchNumber: "MSH-2026-B3",
  },
  {
    id: "dehn-al-oudh-qadeem",
    name: "Dehn Al Oudh Qadeem",
    price: 24000,
    category: "Attars",
    volume: "6ml Aged Oil",
    stock: 4,
    tagline: "Vintage 15-year aged Assam oud oil in crystal flacon.",
    notes: "Assam Oud · Tobacco · Ancient Woods",
    topNotes: "Wild Indian Oud, Birch Tar",
    heartNotes: "Aged Honey, Tobacco Leaf, Myrrh",
    baseNotes: "Precious Assam Agarwood, Black Amber",
    image: "/product-box.jpg",
    accent: "from-[#20150d] to-[#4a301a]",
    description: "Our crowning jewel attar. Distilled from wild Assam agarwood aged for 15 years in oak barrels.",
    isFeatured: true,
    gender: "Men",
    longevityHours: 24,
    sillageRating: "Enormous",
    seasonSuitability: ["Winter", "Autumn"],
    occasionSuitability: ["Wedding / Barat", "Jummah / Spiritual"],
    inspiredBy: "Pure artisanal wild harvest vintage Indian agarwood",
    fragranceFamily: "Woody Oud",
    layeringPairId: "desert-gold-edp",
    samplePrice: 1200,
    batchNumber: "MSH-2026-B0",
  },

  // --- PERFUMES (EDP) ---
  {
    id: "desert-gold-edp",
    name: "Desert Gold EDP",
    price: 15000,
    category: "Perfumes",
    volume: "50ml Extrait De Parfum",
    stock: 12,
    tagline: "Sun-warmed amber across dune horizons in fine spray mist.",
    notes: "Warm Amber · Saffron · Sandalwood",
    topNotes: "Golden Saffron, Cardamom, Sweet Orange",
    heartNotes: "Warm Amber Resin, Cinnamon Bark",
    baseNotes: "Mysore Sandalwood, Bourbon Vanilla, Cedarwood",
    image: "/product-desert-gold.png",
    accent: "from-[#c89048] to-[#7a4a18]",
    description: "Rich amber radiating with warm spices and precious woods. Formulated with 35% oil concentration for 18+ hours longevity.",
    isFeatured: true,
    gender: "Unisex",
    longevityHours: 18,
    sillageRating: "Strong",
    seasonSuitability: ["All-Season", "Winter", "Autumn"],
    occasionSuitability: ["Wedding / Barat", "Evening Gala", "Daily Office"],
    inspiredBy: "Kinship to Maison Francis Kurkdjian Grand Soir & Baccarat Rouge",
    fragranceFamily: "Oriental Spice",
    layeringPairId: "oud-al-jamil",
    samplePrice: 650,
    batchNumber: "MSH-2026-B4",
  },
  {
    id: "velvet-saffron-edp",
    name: "Velvet Saffron EDP",
    price: 16500,
    category: "Perfumes",
    volume: "50ml Extrait De Parfum",
    stock: 9,
    tagline: "Kashmiri saffron, black leather, and crystal violet.",
    notes: "Kashmiri Saffron · Black Leather · Violet",
    topNotes: "Organic Kashmiri Saffron, Juniper Berries",
    heartNotes: "Black Violet, Suede Leather, Clary Sage",
    baseNotes: "Haitian Vetiver, Raspberry Cashmere, Amber",
    image: "/product-dark.jpg",
    accent: "from-[#2d1a3a] to-[#5d304a]",
    description: "A decadent, leather-floral eau de parfum that opens with radiant Kashmiri saffron and dries down to a supple suede trail.",
    isFeatured: false,
    gender: "Unisex",
    longevityHours: 16,
    sillageRating: "Strong",
    seasonSuitability: ["Autumn", "Winter", "Spring"],
    occasionSuitability: ["Evening Gala", "Wedding / Barat", "Daily Office"],
    inspiredBy: "Kinship to Byredo Black Saffron & Tom Ford Tuscan Leather",
    fragranceFamily: "Leather Smoke",
    layeringPairId: "midnight-rose-attar",
    samplePrice: 650,
    batchNumber: "MSH-2026-B5",
  },

  // --- WATCHES ---
  {
    id: "mshaies-royal-chronograph",
    name: "Maison Royal Chronograph",
    price: 45000,
    category: "Watches",
    volume: "42mm Gold Edition",
    stock: 5,
    tagline: "18K Gold PVD Stainless Steel with Sunburst Black Dial.",
    notes: "Sapphire Crystal · 100M Water Resistant · Japanese Mecha-Quartz",
    topNotes: "Double-Domed Anti-Reflective Sapphire",
    heartNotes: "316L Surgical Grade Steel, Gold PVD Finish",
    baseNotes: "Handcrafted Italian Leather Strap",
    image: "/product-desert-gold.png",
    accent: "from-[#b8860b] to-[#4a3500]",
    description: "A bespoke luxury timepiece crafted to complement M.shaies signature fragrance aesthetics. Features sapphire crystal, chronograph precision, and interchangeable Italian leather straps.",
    isFeatured: true,
    gender: "Men",
    seasonSuitability: ["All-Season"],
    occasionSuitability: ["Wedding / Barat", "Daily Office", "Evening Gala"],
    batchNumber: "MSH-WATCH-01",
  },
  {
    id: "mshaies-skeleton-automatic",
    name: "Maison Skeleton Automatic",
    price: 68000,
    category: "Watches",
    volume: "41mm Automatic",
    stock: 3,
    tagline: "Exposed mechanical movement with emerald accents.",
    notes: "Automatic Self-Winding · Exhibition Caseback · Sapphire Crystal",
    topNotes: "Scratch-Resistant Sapphire Crystal Front & Back",
    heartNotes: "24-Jewel Automatic Mechanical Calibre",
    baseNotes: "Solid Stainless Steel Link Bracelet with Butterfly Clasp",
    image: "/product-dark.jpg",
    accent: "from-[#0d2a1a] to-[#1a4a2a]",
    description: "An extraordinary horological masterpiece showcasing intricate mechanical gears and precision escapements through a clear skeleton dial.",
    isFeatured: false,
    gender: "Men",
    seasonSuitability: ["All-Season"],
    occasionSuitability: ["Wedding / Barat", "Evening Gala"],
    batchNumber: "MSH-WATCH-02",
  }
];

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
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
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
  bulkImportProducts: (importedList: Partial<Product>[]) => number;
  // Career / Job Posting Methods
  jobs: JobPosting[];
  addJob: (job: Omit<JobPosting, "id" | "createdAt">) => void;
  updateJob: (id: string, updates: Partial<JobPosting>) => void;
  deleteJob: (id: string) => void;
  toggleJobStatus: (id: string) => void;
};

const ProductsStoreContext = createContext<ProductsStoreContextType | null>(null);

export const DEFAULT_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "log-1",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    action: "System Initialized",
    category: "System",
    details: "M.shaies Haute Parfumerie Store & Inventory Database loaded.",
    user: "System Daemon",
  },
  {
    id: "log-2",
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    action: "Shipping Rates Configured",
    category: "Settings",
    details: "Standard nationwide courier set to ₨ 250 with Free Shipping threshold at ₨ 5,000.",
    user: "Master Admin",
  },
  {
    id: "log-3",
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    action: "Inventory Restock",
    category: "Stock",
    details: "Restocked Oud Al-Jamil to 15 flacons.",
    user: "Warehouse Staff",
  },
];

const STORAGE_KEYS = {
  PRODUCTS: "mshaies_products_v4",
  CATEGORIES: "mshaies_categories_v3",
  COUPONS: "mshaies_coupons_v3",
  ORDERS: "mshaies_orders_v3",
  SETTINGS: "mshaies_settings_v3",
  REVIEWS: "mshaies_reviews_v3",
  AUDIT_LOGS: "mshaies_audit_logs_v1",
  JOBS: "mshaies_jobs_v1",
};

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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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

  // Initial Data Synchronization with Server Database
  useEffect(() => {
    let isMounted = true;

    async function loadDataFromServer() {
      try {
        const [prodRes, settingsRes, reviewsRes] = await Promise.all([
          getProductsServerFn(),
          getPublicSettingsServerFn(),
          getReviewsServerFn({ data: {} }),
        ]);

        if (isMounted) {
          if (prodRes.success && ((prodRes as any).source === "supabase" || (prodRes as any).source === "database" || (prodRes.products && prodRes.products.length > 0))) {
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
          if (reviewsRes.success && ((reviewsRes as any).source === "supabase" || (reviewsRes as any).source === "database" || (reviewsRes.reviews && reviewsRes.reviews.length > 0))) {
            setReviews(reviewsRes.reviews as any);
            try {
              localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviewsRes.reviews));
            } catch (e) {
              console.warn("Failed to persist reviews to localStorage:", e);
            }
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

          if (isMounted) {
            if (ordersRes.success && ((ordersRes as any).source === "supabase" || (ordersRes as any).source === "database" || (ordersRes.orders && ordersRes.orders.length > 0))) {
              setOrders(ordersRes.orders as any);
              try {
                localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(ordersRes.orders));
              } catch (e) {
                console.warn("Failed to persist orders to localStorage:", e);
              }
            }
            if (couponsRes.success && ((couponsRes as any).source === "supabase" || (couponsRes as any).source === "database" || (couponsRes.coupons && couponsRes.coupons.length > 0))) {
              setCoupons(couponsRes.coupons as any);
              try {
                localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(couponsRes.coupons));
              } catch (e) {
                console.warn("Failed to persist coupons to localStorage:", e);
              }
            }
            if (auditRes.success && ((auditRes as any).source === "supabase" || (auditRes as any).source === "database" || (auditRes.logs && auditRes.logs.length > 0))) {
              setAuditLogs(auditRes.logs as any);
              try {
                localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditRes.logs));
              } catch (e) {
                console.warn("Failed to persist audit logs to localStorage:", e);
              }
            }
          }
        }
      } catch (err) {
        console.warn("[ProductsStoreProvider] Failed to load data from server, using local store:", err);
      }
    }

    loadDataFromServer();

    return () => {
      isMounted = false;
    };
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

  const addProduct = (newProd: Omit<Product, "id">) => {
    const slug = newProd.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const id = `${slug}-${Date.now().toString().slice(-4)}`;
    const fullProd: Product = { ...newProd, id };

    setProducts((prev) => [fullProd, ...prev]);
    addAuditLog("Product Added", "Product", `Added new fragrance "${newProd.name}" priced at ₨ ${newProd.price.toLocaleString()}`);

    const token = typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("mshaies_admin_token") || (typeof localStorage !== "undefined" ? localStorage.getItem("mshaies_admin_token") : null) || undefined
      : undefined;
    saveProductServerFn({ data: { authToken: token, product: fullProd as any } }).catch((err) =>
      console.warn("[saveProductServerFn]", err)
    );
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    let updatedTarget: Product | null = null;
    setProducts((prev) => {
      const updatedList = prev.map((p) => {
        if (p.id === id) {
          updatedTarget = { ...p, ...updates };
          return updatedTarget;
        }
        return p;
      });
      return updatedList;
    });

    addAuditLog("Product Modified", "Product", `Updated configuration for "${updates.name || id}"`);

    const token = typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("mshaies_admin_token") || (typeof localStorage !== "undefined" ? localStorage.getItem("mshaies_admin_token") : null) || undefined
      : undefined;
    const target = updatedTarget || products.find((p) => p.id === id);
    if (target) {
      saveProductServerFn({ data: { authToken: token, product: { ...target, ...updates } as any } }).catch((err) =>
        console.warn("[saveProductServerFn]", err)
      );
    }
  };

  const deleteProduct = (id: string) => {
    const found = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addAuditLog("Product Removed", "Product", `Deleted item "${found?.name || id}" from catalog`);

    const token = typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("mshaies_admin_token") || (typeof localStorage !== "undefined" ? localStorage.getItem("mshaies_admin_token") : null) || undefined
      : undefined;
    deleteProductServerFn({ data: { authToken: token, id } }).catch((err) =>
      console.warn("[deleteProductServerFn]", err)
    );
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

  const bulkImportProducts = (importedList: Partial<Product>[]): number => {
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
      setProducts((prev) => [...cleanList, ...prev]);
      addAuditLog("Bulk Import", "Product", `Batch imported ${cleanList.length} fragrances into inventory.`);

      const token = typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("mshaies_admin_token") || (typeof localStorage !== "undefined" ? localStorage.getItem("mshaies_admin_token") : null) || undefined
        : undefined;
      bulkImportProductsServerFn({ data: { authToken: token, products: cleanList as any } }).catch((err) =>
        console.warn("[bulkImportProductsServerFn]", err)
      );
    }
    return count;
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

    setOrders((prev) => [newOrder, ...prev]);
    addAuditLog(
      "Order Received",
      "Order",
      `Order #${orderId} placed by ${orderData.customerName} for ₨ ${orderData.total.toLocaleString()} via ${orderData.paymentMethod.toUpperCase()}`
    );

    // Synchronize authoritative order to database via server function
    try {
      const serverResult = await placeOrderServerFn({
        data: {
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
            qty: i.qty,
            volume: i.volume,
          })),
        },
      });

      if (serverResult && !serverResult.success && serverResult.error) {
        throw new Error(serverResult.error);
      }
    } catch (err: any) {
      console.warn("[placeOrderServerFn] Server order sync notification:", err?.message || err);
      // If server returned an explicit error like insufficient stock, bubble it up
      if (err?.message && !err.message.includes("fetch") && !err.message.includes("network")) {
        throw err;
      }
    }

    return orderId;
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
    if (prodReviews.length === 0) return { average: 5.0, count: 0 };
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
