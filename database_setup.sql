-- ============================================
-- AWARJANA CREATIONS - COMPLETE DATABASE SETUP (2026 EDITION)
-- ============================================
-- This script creates all tables, RLS policies, and triggers
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. DROP EXISTING TABLES (CLEAN START)
-- ============================================
DROP TABLE IF EXISTS drafts CASCADE;
DROP TABLE IF EXISTS job_cards CASCADE;
DROP TABLE IF EXISTS order_materials CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS registration_codes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  company_name TEXT,
  role TEXT CHECK (role IN ('customer', 'employer', 'admin')) DEFAULT 'customer',
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  cost DECIMAL(10, 2) NOT NULL CHECK (cost >= 0),
  stock_quantity INT DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INT DEFAULT 10 CHECK (low_stock_threshold >= 0),
  unit TEXT DEFAULT 'unit',
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_number TEXT UNIQUE NOT NULL,
  height INT CHECK (height > 0),
  width INT CHECK (width > 0),
  cost DECIMAL(10, 2) CHECK (cost >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'review', 'completed', 'cancelled')),
  assigned_employer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Order Materials table (junction table)
CREATE TABLE IF NOT EXISTS order_materials (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  material_id BIGINT REFERENCES materials(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  cost_at_time DECIMAL(10, 2) NOT NULL CHECK (cost_at_time >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(order_id, material_id)
);

-- Job Cards table
CREATE TABLE IF NOT EXISTS job_cards (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  employer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
  employer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(order_id, employer_id)
);

-- Drafts table
CREATE TABLE IF NOT EXISTS drafts (
  id BIGSERIAL PRIMARY KEY,
  job_card_id BIGINT REFERENCES job_cards(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  employer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  draft_url TEXT NOT NULL,
  version INT DEFAULT 1 CHECK (version > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Registration Codes table
CREATE TABLE IF NOT EXISTS registration_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employer', 'admin')),
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity Logs table (Modern Session Tracker)
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CREATE VIEWS
-- ============================================

-- View for count of registration codes (Limit 10)
CREATE OR REPLACE VIEW registration_code_count AS
SELECT count(*) as total_codes, 10 as max_limit
FROM registration_codes;

-- ============================================
-- 4. CREATE FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to automatically create user record after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user after auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_materials BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_orders BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CREATE RLS POLICIES
-- ============================================

-- USERS
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- MATERIALS
CREATE POLICY "Anyone can view materials" ON materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage materials" ON materials FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ORDERS
CREATE POLICY "Customers can view own orders" ON orders FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Employers can view assigned orders" ON orders FOR SELECT TO authenticated USING (assigned_employer_id = auth.uid());
CREATE POLICY "Admins can view all orders" ON orders FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Customers can create orders" ON orders FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Admins can update orders" ON orders FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- REGISTRATION CODES
CREATE POLICY "Anyone can verify codes" ON registration_codes FOR SELECT USING (true);
CREATE POLICY "Admins can manage codes" ON registration_codes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ACTIVITY LOGS (Session Tracker)
CREATE POLICY "Users can view own activity" ON activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert activity" ON activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all activity" ON activity_logs FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- 7. INSERT SAMPLE DATA
-- ============================================

INSERT INTO materials (name, cost, stock_quantity, low_stock_threshold, unit, category) VALUES
  ('Frame', 518.52, 100, 10, 'piece', 'frames'),
  ('Glass', 300.00, 100, 10, 'piece', 'glass'),
  ('MDF', 115.00, 100, 10, 'piece', 'backing'),
  ('Stand', 50.00, 100, 10, 'piece', 'hardware'),
  ('Hook', 10.00, 100, 10, 'piece', 'hardware'),
  ('Under Pin', 20.00, 100, 10, 'piece', 'hardware'),
  ('Side Pin', 10.00, 100, 10, 'piece', 'hardware'),
  ('Wages', 100.00, 0, 0, 'service', 'labor'),
  ('Electricity', 50.00, 0, 0, 'service', 'utility')
ON CONFLICT DO NOTHING;
