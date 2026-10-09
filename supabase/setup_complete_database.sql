-- ==============================================================================
-- M.shaies Haute Parfumerie — Complete Database Setup & Security Script
-- Paste this entire file into Supabase SQL Editor and click "Run".
-- ==============================================================================

-- 1. CREATE ALL APPLICATION TABLES
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"category" text NOT NULL,
	"details" text NOT NULL,
	"user" text DEFAULT 'Staff Admin'
);

CREATE TABLE IF NOT EXISTS "coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"value" integer NOT NULL,
	"min_order" integer DEFAULT 0 NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expiry_date" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);

CREATE TABLE IF NOT EXISTS "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"city" text,
	"address" text,
	"total_spent" integer DEFAULT 0 NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"loyalty_tier" text DEFAULT 'Valued Client' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);

CREATE TABLE IF NOT EXISTS "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"category" text NOT NULL,
	"volume" text NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"tagline" text,
	"notes" text,
	"top_notes" text,
	"heart_notes" text,
	"base_notes" text,
	"image" text NOT NULL,
	"accent" text,
	"description" text,
	"is_featured" boolean DEFAULT false,
	"gender" text DEFAULT 'Unisex',
	"longevity_hours" integer DEFAULT 18,
	"sillage_rating" text DEFAULT 'Strong',
	"season_suitability" jsonb DEFAULT '["All-Season"]'::jsonb,
	"occasion_suitability" jsonb DEFAULT '["Daily Office","Evening Gala"]'::jsonb,
	"inspired_by" text,
	"fragrance_family" text DEFAULT 'Woody Oud',
	"layering_pair_id" text,
	"sample_price" integer DEFAULT 650,
	"batch_number" text DEFAULT 'MSH-2026-B1',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text REFERENCES "customers"("id") ON DELETE SET NULL,
	"customer_name" text NOT NULL,
	"email" text,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"postal_code" text,
	"payment_method" text NOT NULL,
	"payment_status" text NOT NULL,
	"transaction_id" text,
	"subtotal" integer NOT NULL,
	"discount_code" text,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"shipping" integer NOT NULL,
	"total" integer NOT NULL,
	"order_status" text DEFAULT 'Confirmed' NOT NULL,
	"courier_name" text,
	"tracking_number" text,
	"is_gift_wrapped" boolean DEFAULT false,
	"gift_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
	"product_id" text REFERENCES "products"("id") ON DELETE SET NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"qty" integer NOT NULL,
	"volume" text NOT NULL,
	"image" text
);

CREATE TABLE IF NOT EXISTS "product_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
	"note_type" text NOT NULL,
	"note_name" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "product_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
	"author" text NOT NULL,
	"city" text,
	"rating" integer NOT NULL,
	"title" text,
	"comment" text NOT NULL,
	"date" text NOT NULL,
	"verified" boolean DEFAULT true NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
	"size_label" text NOT NULL,
	"concentration" text NOT NULL,
	"price" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"sku" text
);

CREATE TABLE IF NOT EXISTS "store_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"announcement_text" text DEFAULT 'Flat 15% OFF on all Pure Attar Oils — Use code',
	"announcement_code" text DEFAULT 'LUXE15',
	"announcement_active" boolean DEFAULT true,
	"free_shipping_threshold" integer DEFAULT 5000,
	"standard_shipping_fee" integer DEFAULT 250,
	"express_shipping_fee" integer DEFAULT 450,
	"express_shipping_active" boolean DEFAULT true,
	"lahore_local_fee" integer DEFAULT 150,
	"lahore_local_active" boolean DEFAULT true,
	"cod_fee" integer DEFAULT 0,
	"free_shipping_enabled" boolean DEFAULT true,
	"shipping_estimate_days" text DEFAULT '2-4 Business Days',
	"courier_partners" text DEFAULT 'TCS Express & Leopards',
	"whatsapp_number" text DEFAULT '+923390001826',
	"contact_email" text DEFAULT 'concierge@mshaies.com',
	"instagram_url" text DEFAULT 'https://www.instagram.com/m.shaiesfragrances',
	"facebook_url" text DEFAULT 'https://www.facebook.com/profile.php?id=61575714252560',
	"tiktok_url" text DEFAULT 'https://www.tiktok.com/@mshaiesfragrances',
	"auto_lock_minutes" integer DEFAULT 15,
	"admin_pin" text DEFAULT '7860',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. PUBLIC READ POLICIES (Storefront Catalog)
DROP POLICY IF EXISTS "Public read products" ON products;
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read product variants" ON product_variants;
CREATE POLICY "Public read product variants" ON product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read product notes" ON product_notes;
CREATE POLICY "Public read product notes" ON product_notes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read reviews" ON product_reviews;
CREATE POLICY "Public read reviews" ON product_reviews FOR SELECT USING (verified = true);

DROP POLICY IF EXISTS "Public read active coupons" ON coupons;
CREATE POLICY "Public read active coupons" ON coupons FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read store settings" ON store_settings;
CREATE POLICY "Public read store settings" ON store_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can submit reviews" ON product_reviews;
CREATE POLICY "Public can submit reviews" ON product_reviews FOR INSERT WITH CHECK (true);

-- 4. SERVICE ROLE FULL PRIVILEGES (Server Logic & Admin Actions)
DROP POLICY IF EXISTS "Service role full access products" ON products;
CREATE POLICY "Service role full access products" ON products FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access orders" ON orders;
CREATE POLICY "Service role full access orders" ON orders FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access order items" ON order_items;
CREATE POLICY "Service role full access order items" ON order_items FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access customers" ON customers;
CREATE POLICY "Service role full access customers" ON customers FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access coupons" ON coupons;
CREATE POLICY "Service role full access coupons" ON coupons FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access settings" ON store_settings;
CREATE POLICY "Service role full access settings" ON store_settings FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access audit logs" ON audit_logs;
CREATE POLICY "Service role full access audit logs" ON audit_logs FOR ALL USING (auth.role() = 'service_role');

-- 5. PERFORMANCE INDEXES
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Products
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_gender ON products(gender);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category_price ON products(category, price);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- Product Variants & Notes
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_notes_product_id ON product_notes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_notes_prod_type ON product_notes(product_id, note_type);

-- Customers CRM
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(total_spent DESC);
CREATE INDEX IF NOT EXISTS idx_customers_loyalty_tier ON customers(loyalty_tier);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);

-- Orders & Order Items
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number) WHERE tracking_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Coupons
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_prod_date ON product_reviews(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
