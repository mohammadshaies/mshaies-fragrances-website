-- ==============================================================================
-- M.shaies Haute Parfumerie — Supabase Row Level Security (RLS) Policies
-- Run this script in the Supabase SQL Editor after applying migrations.
-- ==============================================================================

-- 1. ENABLE RLS ON ALL TABLES
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

-- 2. PUBLIC READ POLICIES (Storefront Catalog)
-- Anyone can read published products, olfactory notes, reviews, and variants
CREATE POLICY "Public read products" ON products
  FOR SELECT USING (true);

CREATE POLICY "Public read product variants" ON product_variants
  FOR SELECT USING (true);

CREATE POLICY "Public read product notes" ON product_notes
  FOR SELECT USING (true);

CREATE POLICY "Public read reviews" ON product_reviews
  FOR SELECT USING (verified = true);

CREATE POLICY "Public read active coupons" ON coupons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read store settings" ON store_settings
  FOR SELECT USING (true);

-- 3. CUSTOMER REVIEW SUBMISSION
-- Public visitors can submit a review
CREATE POLICY "Public can submit reviews" ON product_reviews
  FOR INSERT WITH CHECK (true);

-- 4. SERVICE ROLE FULL PRIVILEGES
-- TanStack Start server functions use the service role key to perform
-- authoritative price verification, order placement, stock deduction, and admin mutations
CREATE POLICY "Service role full access products" ON products
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access orders" ON orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access order items" ON order_items
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access customers" ON customers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access coupons" ON coupons
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access settings" ON store_settings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access audit logs" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- 5. ADMIN AUTHENTICATED ACCESS
-- Authenticated staff users can read and manage administrative tables
CREATE POLICY "Staff can view all orders" ON orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can view customers" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can view audit logs" ON audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');
