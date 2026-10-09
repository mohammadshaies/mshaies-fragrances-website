-- ==============================================================================
-- M.shaies Haute Parfumerie — Database Indexing & Performance Optimization
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- All index creations use "IF NOT EXISTS" so they are safe and idempotent.
-- ==============================================================================

-- 0. Enable pg_trgm extension for blazingly fast trigram & fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ------------------------------------------------------------------------------
-- 1. PRODUCTS TABLE INDEXES
-- ------------------------------------------------------------------------------
-- Accelerates filtering by fragrance category (e.g., 'Attars', 'Perfumes', 'Watches')
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Accelerates price filtering, price range sliders, and sorting by price
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Accelerates homepage and promo queries for featured fragrances
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);

-- Accelerates gender filtering ('Men', 'Women', 'Unisex')
CREATE INDEX IF NOT EXISTS idx_products_gender ON products(gender);

-- Accelerates inventory and stock-level queries in Admin
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- Accelerates newest-to-oldest sorting in the catalog and storefront
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Composite index: category browsing ordered by price (common e-commerce filter pattern)
CREATE INDEX IF NOT EXISTS idx_products_category_price ON products(category, price);

-- High-speed trigram GIN index for search queries on product name
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- ------------------------------------------------------------------------------
-- 2. PRODUCT VARIANTS TABLE INDEXES
-- ------------------------------------------------------------------------------
-- Accelerates foreign key join/lookup for variants belonging to a product
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- ------------------------------------------------------------------------------
-- 3. PRODUCT FRAGRANCE NOTES TABLE INDEXES
-- ------------------------------------------------------------------------------
-- Accelerates foreign key lookup for olfactory notes belonging to a product
CREATE INDEX IF NOT EXISTS idx_product_notes_product_id ON product_notes(product_id);

-- Composite index for looking up specific note pyramids (top, heart, base) for a fragrance
CREATE INDEX IF NOT EXISTS idx_product_notes_prod_type ON product_notes(product_id, note_type);

-- ------------------------------------------------------------------------------
-- 4. CUSTOMERS CRM TABLE INDEXES
-- ------------------------------------------------------------------------------
-- Note: 'phone' is already uniquely indexed via customers_phone_unique constraint

-- Accelerates customer email lookups during checkout and CRM client profile search
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Accelerates ranking top clients and VIP revenue reporting in Admin CRM
CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(total_spent DESC);

-- Accelerates filtering by customer loyalty tier ('Valued Client', 'Gold Sovereign', etc.)
CREATE INDEX IF NOT EXISTS idx_customers_loyalty_tier ON customers(loyalty_tier);

-- Accelerates sorting clients by newest registration/order date
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);

-- Trigram GIN index for instant client name search in Admin CRM directory
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);

-- ------------------------------------------------------------------------------
-- 5. ORDERS TABLE INDEXES
-- ------------------------------------------------------------------------------
-- Accelerates foreign key lookups of all orders placed by a specific customer
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- Accelerates newest-to-oldest order sorting in Admin and client order tracking
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Accelerates filtering orders by order status (e.g. 'Pending', 'Confirmed', 'Dispatched')
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);

-- Accelerates filtering orders by payment status (e.g. 'Paid', 'Pending COD')
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Accelerates order lookup by customer phone number
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);

-- Accelerates order lookup by customer email address
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);

-- Accelerates courier tracking number lookups (partial index for non-null tracking numbers)
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number) WHERE tracking_number IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 6. ORDER ITEMS TABLE INDEXES
-- ------------------------------------------------------------------------------
-- Accelerates joining items to an order (eliminates full-table sequential scans)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Accelerates querying sales history or orders containing a specific fragrance
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- ------------------------------------------------------------------------------
-- 7. COUPONS TABLE INDEXES
-- ------------------------------------------------------------------------------
-- Note: 'code' is already uniquely indexed via coupons_code_unique constraint

-- Accelerates filtering active discount vouchers during checkout validation
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);

-- ------------------------------------------------------------------------------
-- 8. PRODUCT REVIEWS TABLE INDEXES
-- ------------------------------------------------------------------------------
-- Accelerates fetching all customer reviews for a given fragrance
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);

-- Composite index: fetching verified reviews for a fragrance ordered by date
CREATE INDEX IF NOT EXISTS idx_product_reviews_prod_date ON product_reviews(product_id, created_at DESC);

-- Accelerates rating filtering (e.g. 5-star customer reviews)
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);

-- ------------------------------------------------------------------------------
-- 9. AUDIT LOGS TABLE INDEXES
-- ------------------------------------------------------------------------------
-- Accelerates chronological ordering of system audit and activity logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Accelerates filtering audit logs by category (e.g. 'Product', 'Stock', 'Order', 'Settings')
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
