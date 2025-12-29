-- ==========================================
-- RELATIONSHIP FIX: USERS & PROFILES
-- ==========================================

-- 1. DROP THE VIEW
DROP VIEW IF EXISTS public.profiles;

-- 2. CREATE A TABLE INSTEAD OF A VIEW
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SYNC DATA FROM USERS TO PROFILES
INSERT INTO public.profiles (id, email, role, email_verified, full_name)
SELECT id, email, role, email_verified, email as full_name
FROM public.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    email_verified = EXCLUDED.email_verified;

-- 4. UPDATE THE TRIGGER TO SYNC BOTH TABLES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  assigned_role TEXT;
  is_verified BOOLEAN;
BEGIN
  assigned_role := COALESCE(new.raw_user_meta_data->>'role', 'customer');
  is_verified := (new.email_confirmed_at IS NOT NULL);

  -- Sync to public.users
  INSERT INTO public.users (id, email, role, email_verified)
  VALUES (new.id, new.email, assigned_role, is_verified)
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    email_verified = EXCLUDED.email_verified;
    
  -- Sync to public.profiles
  INSERT INTO public.profiles (id, email, role, email_verified, full_name)
  VALUES (new.id, new.email, assigned_role, is_verified, new.email)
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    email_verified = EXCLUDED.email_verified;
  
  -- Sync to app_metadata for RLS
  UPDATE auth.users 
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    format('"%s"', assigned_role)::jsonb
  )
  WHERE id = new.id;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ENABLE RLS ON PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 6. GRANT PERMISSIONS
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
