-- ==============================================================================
-- M.SHAIES HAUTE PARFUMERIE — SUPABASE ADMIN ROLE SETUP
-- ==============================================================================
-- Run this SQL in your Supabase Dashboard:
-- 1. Go to https://supabase.com/dashboard/project/_/sql
-- 2. Open a "New query"
-- 3. Paste and run this script
-- ==============================================================================

-- STEP 1: Assign the 'admin' role directly in Supabase Auth (App Metadata)
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE LOWER(email) = 'admin@mshaies.com';

-- STEP 2: Recreate public.admin_users registry without conflicting foreign keys
DROP TABLE IF EXISTS public.admin_users CASCADE;

CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own admin status or admins to view all
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users"
    ON public.admin_users
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow service_role full control
DROP POLICY IF EXISTS "Service role full access on admin_users" ON public.admin_users;
CREATE POLICY "Service role full access on admin_users"
    ON public.admin_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- STEP 3: Register admin@mshaies.com in the admin registry
INSERT INTO public.admin_users (email, role)
VALUES ('admin@mshaies.com', 'admin')
ON CONFLICT (email) 
DO UPDATE SET role = 'admin', updated_at = NOW();
