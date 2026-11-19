-- ==============================================================================
-- M.shaies Haute Parfumerie — Hardened Supabase Row Level Security (RLS) Policies
-- Idempotent script: safe to run multiple times in Supabase SQL Editor.
-- ==============================================================================

-- 1. ENABLE & FORCE RLS ON ALL TABLES
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_users ENABLE ROW LEVEL SECURITY;

-- 2. DROP EXISTING POLICIES FOR IDEMPOTENT RE-EXECUTION
DROP POLICY IF EXISTS "Public read products" ON products;
DROP POLICY IF EXISTS "Public read product variants" ON product_variants;
DROP POLICY IF EXISTS "Public read product notes" ON product_notes;
DROP POLICY IF EXISTS "Public read reviews" ON product_reviews;
DROP POLICY IF EXISTS "Public read active coupons" ON coupons;
DROP POLICY IF EXISTS "Public read store settings" ON store_settings;
DROP POLICY IF EXISTS "Public can submit reviews" ON product_reviews;
DROP POLICY IF EXISTS "Service role full access products" ON products;
DROP POLICY IF EXISTS "Service role full access orders" ON orders;
DROP POLICY IF EXISTS "Service role full access order items" ON order_items;
DROP POLICY IF EXISTS "Service role full access customers" ON customers;
DROP POLICY IF EXISTS "Service role full access coupons" ON coupons;
DROP POLICY IF EXISTS "Service role full access settings" ON store_settings;
DROP POLICY IF EXISTS "Service role full access audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role full access admin users" ON admin_users;
DROP POLICY IF EXISTS "Staff can view all orders" ON orders;
DROP POLICY IF EXISTS "Staff can view customers" ON customers;
DROP POLICY IF EXISTS "Staff can view audit logs" ON audit_logs;

-- 3. PUBLIC READ POLICIES (Storefront Catalog Only)
CREATE POLICY "Public read products" ON products
  FOR SELECT USING (true);

CREATE POLICY "Public read product variants" ON product_variants
  FOR SELECT USING (true);

CREATE POLICY "Public read product notes" ON product_notes
  FOR SELECT USING (true);

CREATE POLICY "Public read reviews" ON product_reviews
  FOR SELECT USING (true);

CREATE POLICY "Public read store settings" ON store_settings
  FOR SELECT USING (true);

-- Note: coupons, orders, order_items, customers, audit_logs, and admin_users
-- are NOT directly readable by anonymous clients; all validations & mutations
-- go through server-side verified TanStack Start functions.

-- 4. SERVICE ROLE FULL PRIVILEGES (Server-Side Authoritative Functions)
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

CREATE POLICY "Service role full access admin users" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- 5. STRICT RBAC ADMIN POLICIES (Only Verified Admins, Never Generic Authenticated Users)
CREATE POLICY "Staff can view all orders" ON orders
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'superadmin')
  );

CREATE POLICY "Staff can view customers" ON customers
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'superadmin')
  );

CREATE POLICY "Staff can view audit logs" ON audit_logs
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'superadmin')
  );
