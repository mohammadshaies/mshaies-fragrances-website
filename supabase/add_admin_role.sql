-- ==============================================================================
-- M.SHAIES HAUTE PARFUMERIE — SUPABASE ADMIN ROLE SETUP
-- ==============================================================================
-- Run this SQL in your Supabase Dashboard:
-- 1. Go to https://supabase.com/dashboard/project/_/sql
-- 2. Open a "New query"
-- 3. Paste and run this script
-- ==============================================================================

-- STEP 1: Create an optional admin_users table for persistent role tracking
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admins to view the admin_users table
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users"
    ON public.admin_users
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
        OR auth.email() = email
    );

-- Allow service_role to manage admin_users
DROP POLICY IF EXISTS "Service role full access on admin_users" ON public.admin_users;
CREATE POLICY "Service role full access on admin_users"
    ON public.admin_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- STEP 2: Helper Function to grant 'admin' role to any email address
-- This updates auth.users.raw_app_meta_data (tamper-proof by clients)
-- and also registers them in public.admin_users.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.assign_admin_role(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_clean_email TEXT;
BEGIN
    v_clean_email := LOWER(TRIM(target_email));

    -- Locate user in auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE LOWER(email) = v_clean_email;

    IF v_user_id IS NULL THEN
        RETURN 'Error: No user found in Supabase Auth with email ' || v_clean_email || '. Please create the user in Supabase Authentication first.';
    END IF;

    -- Update auth.users app_metadata with role: admin
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
    WHERE id = v_user_id;

    -- Record in public.admin_users table
    INSERT INTO public.admin_users (user_id, email, role)
    VALUES (v_user_id, v_clean_email, 'admin')
    ON CONFLICT (email) 
    DO UPDATE SET role = 'admin', updated_at = NOW();

    RETURN 'Success: Admin role successfully granted to ' || v_clean_email;
END;
$$;

-- Revoke public execution and restrict to service_role and postgres
REVOKE ALL ON FUNCTION public.assign_admin_role(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_admin_role(TEXT) TO postgres, service_role;

-- ==============================================================================
-- STEP 3: EXECUTE THIS TO MAKE YOUR ACCOUNT AN ADMIN
-- Replace 'your-email@example.com' with the email address you use to sign in!
-- ==============================================================================
-- Example usage:
-- SELECT public.assign_admin_role('admin@mshaies.com');
--
-- Alternatively, if you want a direct one-line update without using the function:
-- UPDATE auth.users
-- SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
-- WHERE LOWER(email) = LOWER('your-email@example.com');
-- ==============================================================================
