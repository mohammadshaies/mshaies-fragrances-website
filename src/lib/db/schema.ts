import { pgTable, text, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. PRODUCTS TABLE
export const products = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(), // in PKR
  category: text("category").notNull(), // 'Attars' | 'Perfumes' | 'Watches' | 'Gift Sets'
  volume: text("volume").notNull(), // e.g. '12ml Pure Attar'
  stock: integer("stock").notNull().default(0),
  tagline: text("tagline"),
  notes: text("notes"), // summary olfactory notes string
  topNotes: text("top_notes"),
  heartNotes: text("heart_notes"),
  baseNotes: text("base_notes"),
  image: text("image").notNull(),
  accent: text("accent"),
  description: text("description"),
  isFeatured: boolean("is_featured").default(false),
  gender: text("gender").default("Unisex"), // 'Unisex' | 'Men' | 'Women'
  longevityHours: integer("longevity_hours").default(18),
  sillageRating: text("sillage_rating").default("Strong"), // 'Moderate' | 'Strong' | 'Enormous'
  seasonSuitability: jsonb("season_suitability").$type<string[]>().default(["All-Season"]),
  occasionSuitability: jsonb("occasion_suitability").$type<string[]>().default(["Daily Office", "Evening Gala"]),
  inspiredBy: text("inspired_by"),
  fragranceFamily: text("fragrance_family").default("Woody Oud"),
  layeringPairId: text("layering_pair_id"),
  samplePrice: integer("sample_price").default(650),
  batchNumber: text("batch_number").default("MSH-2026-B1"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_products_category").on(table.category),
  index("idx_products_price").on(table.price),
  index("idx_products_featured").on(table.isFeatured),
  index("idx_products_gender").on(table.gender),
  index("idx_products_stock").on(table.stock),
  index("idx_products_created_at").on(table.createdAt.desc()),
  index("idx_products_category_price").on(table.category, table.price),
]);

// 2. PRODUCT VARIANTS TABLE (Size & Concentration Options)
export const productVariants = pgTable("product_variants", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sizeLabel: text("size_label").notNull(), // '3ml Sample' | '6ml Pocket Attar' | '12ml Crystal' | '50ml Spray'
  concentration: text("concentration").notNull(), // 'Pure Concentrated Oil' | 'Extrait De Parfum'
  price: integer("price").notNull(),
  stock: integer("stock").notNull().default(0),
  sku: text("sku"),
}, (table) => [
  index("idx_product_variants_product_id").on(table.productId),
]);

// 3. PRODUCT FRAGRANCE NOTES TABLE (Normalized Olfactory Pyramid)
export const productNotes = pgTable("product_notes", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  noteType: text("note_type").notNull(), // 'top' | 'heart' | 'base'
  noteName: text("note_name").notNull(),
}, (table) => [
  index("idx_product_notes_product_id").on(table.productId),
  index("idx_product_notes_prod_type").on(table.productId, table.noteType),
]);

// 4. CUSTOMERS CRM DIRECTORY
export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  city: text("city"),
  address: text("address"),
  totalSpent: integer("total_spent").default(0).notNull(),
  orderCount: integer("order_count").default(0).notNull(),
  loyaltyTier: text("loyalty_tier").default("Valued Client").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_customers_email").on(table.email),
  index("idx_customers_total_spent").on(table.totalSpent.desc()),
  index("idx_customers_loyalty_tier").on(table.loyaltyTier),
  index("idx_customers_created_at").on(table.createdAt.desc()),
]);

// 5. ORDERS TABLE
export const orders = pgTable("orders", {
  id: text("id").primaryKey(), // e.g. 'MSH-94821'
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code"),
  paymentMethod: text("payment_method").notNull(), // 'cod' | 'jazzcash' | 'easypaisa' | 'nayapay' | 'card'
  paymentStatus: text("payment_status").notNull(), // 'Paid' | 'Pending COD' | 'Verification Required'
  transactionId: text("transaction_id"),
  subtotal: integer("subtotal").notNull(),
  discountCode: text("discount_code"),
  discountAmount: integer("discount_amount").default(0).notNull(),
  shipping: integer("shipping").notNull(),
  total: integer("total").notNull(),
  orderStatus: text("order_status").default("Confirmed").notNull(), // 'Confirmed' | 'Processing' | 'Dispatched' | 'Delivered'
  courierName: text("courier_name"),
  trackingNumber: text("tracking_number"),
  isGiftWrapped: boolean("is_gift_wrapped").default(false),
  giftMessage: text("gift_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_orders_customer_id").on(table.customerId),
  index("idx_orders_created_at").on(table.createdAt.desc()),
  index("idx_orders_order_status").on(table.orderStatus),
  index("idx_orders_payment_status").on(table.paymentStatus),
  index("idx_orders_phone").on(table.phone),
  index("idx_orders_email").on(table.email),
  index("idx_orders_tracking_number").on(table.trackingNumber),
]);

// 6. ORDER ITEMS TABLE
export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  qty: integer("qty").notNull(),
  volume: text("volume").notNull(),
  image: text("image"),
}, (table) => [
  index("idx_order_items_order_id").on(table.orderId),
  index("idx_order_items_product_id").on(table.productId),
]);

// 7. COUPONS TABLE
export const coupons = pgTable("coupons", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // 'percent' | 'flat' | 'shipping'
  value: integer("value").notNull(),
  minOrder: integer("min_order").default(0).notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0).notNull(),
  expiryDate: text("expiry_date"),
  isActive: boolean("is_active").default(true).notNull(),
  description: text("description"),
}, (table) => [
  index("idx_coupons_is_active").on(table.isActive),
]);

// 8. PRODUCT REVIEWS TABLE
export const productReviews = pgTable("product_reviews", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  city: text("city"),
  rating: integer("rating").notNull(), // 1 to 5
  title: text("title"),
  comment: text("comment").notNull(),
  date: text("date").notNull(),
  verified: boolean("verified").default(true).notNull(),
  helpfulCount: integer("helpful_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_product_reviews_product_id").on(table.productId),
  index("idx_product_reviews_prod_date").on(table.productId, table.createdAt.desc()),
  index("idx_product_reviews_rating").on(table.rating),
]);

// 9. STORE SETTINGS TABLE (Singleton row with id = 'default')
// Note: geminiApiKey is STRICTLY excluded per Amendment 2; it lives in server-only process.env.GEMINI_API_KEY
export const storeSettings = pgTable("store_settings", {
  id: text("id").primaryKey().default("default"),
  announcementText: text("announcement_text").default("Flat 15% OFF on all Pure Attar Oils — Use code"),
  announcementCode: text("announcement_code").default("LUXE15"),
  announcementActive: boolean("announcement_active").default(true),
  freeShippingThreshold: integer("free_shipping_threshold").default(5000),
  standardShippingFee: integer("standard_shipping_fee").default(400),
  expressShippingFee: integer("express_shipping_fee").default(450),
  expressShippingActive: boolean("express_shipping_active").default(true),
  lahoreLocalFee: integer("lahore_local_fee").default(150),
  lahoreLocalActive: boolean("lahore_local_active").default(true),
  codFee: integer("cod_fee").default(0),
  freeShippingEnabled: boolean("free_shipping_enabled").default(true),
  shippingEstimateDays: text("shipping_estimate_days").default("2-4 Business Days"),
  courierPartners: text("courier_partners").default("TCS Express & Leopards"),
  whatsappNumber: text("whatsapp_number").default("+923390001826"),
  contactEmail: text("contact_email").default("concierge@mshaies.com"),
  instagramUrl: text("instagram_url").default("https://www.instagram.com/m.shaiesfragrances"),
  facebookUrl: text("facebook_url").default("https://www.facebook.com/profile.php?id=61575714252560"),
  tiktokUrl: text("tiktok_url").default("https://www.tiktok.com/@mshaiesfragrances"),
  autoLockMinutes: integer("auto_lock_minutes").default(15),
  adminPin: text("admin_pin").default("7860"), // Kept as optional client lock only; primary auth is Supabase Auth
  heroBannerActive: boolean("hero_banner_active").default(true),
  heroBannerImage: text("hero_banner_image").default("/product-box.jpg"),
  heroBannerLink: text("hero_banner_link").default("/shop"),
  heroBannerAlt: text("hero_banner_alt").default("Maison Luxury Promotions & Festive Offers"),
  heroBannerAnimation: text("hero_banner_animation").default("fadeIn"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 10. AUDIT LOGS TABLE
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  action: text("action").notNull(),
  category: text("category").notNull(), // 'Product' | 'Stock' | 'Order' | 'Discount' | 'Settings' | 'System'
  details: text("details").notNull(),
  user: text("user").default("Staff Admin"),
}, (table) => [
  index("idx_audit_logs_timestamp").on(table.timestamp.desc()),
  index("idx_audit_logs_category").on(table.category),
]);

// --- RELATIONS ---
export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
  notesList: many(productNotes),
  reviews: many(productReviews),
  orderItems: many(orderItems),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const productNotesRelations = relations(productNotes, ({ one }) => ({
  product: one(products, {
    fields: [productNotes.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const productReviewsRelations = relations(productReviews, ({ one }) => ({
  product: one(products, {
    fields: [productReviews.productId],
    references: [products.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));
