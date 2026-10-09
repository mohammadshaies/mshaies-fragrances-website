CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"category" text NOT NULL,
	"details" text NOT NULL,
	"user" text DEFAULT 'Staff Admin'
);
--> statement-breakpoint
CREATE TABLE "coupons" (
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
--> statement-breakpoint
CREATE TABLE "customers" (
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
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"qty" integer NOT NULL,
	"volume" text NOT NULL,
	"image" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text,
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
--> statement-breakpoint
CREATE TABLE "product_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"note_type" text NOT NULL,
	"note_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"size_label" text NOT NULL,
	"concentration" text NOT NULL,
	"price" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"sku" text
);
--> statement-breakpoint
CREATE TABLE "products" (
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
--> statement-breakpoint
CREATE TABLE "store_settings" (
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
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_notes" ADD CONSTRAINT "product_notes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;