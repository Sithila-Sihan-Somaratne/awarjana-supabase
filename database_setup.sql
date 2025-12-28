-- ============================================
-- AWARJANA CREATIONS - COMPLETE DATABASE SETUP
-- ============================================
-- This script creates all tables, RLS policies, and triggers
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. DROP EXISTING TABLES (if needed for fresh start)
-- ============================================
-- Uncomment these lines if you need to reset the database
-- DROP TABLE IF EXISTS drafts CASCADE;
-- DROP TABLE IF EXISTS job_cards CASCADE;
-- DROP TABLE IF EXISTS order_materials CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS materials CASCADE;
-- DROP TABLE IF EXISTS registration_codes CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('customer', 'worker', 'admin')) DEFAULT 'customer',
  registration_code_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_password_change TIMESTAMP WITH TIME ZONE
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
  height2 INT CHECK (height2 >= 0),
  width2 INT CHECK (width2 >= 0),
  cost DECIMAL(10, 2) CHECK (cost >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'review', 'completed', 'cancelled', 'delayed')),
  deadline_type TEXT CHECK (deadline_type IN ('standard', 'express', 'custom')),
  requested_deadline TIMESTAMP WITH TIME ZONE,
  confirmed_deadline TIMESTAMP WITH TIME ZONE,
  assigned_worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_delayed BOOLEAN DEFAULT FALSE,
  delay_reason TEXT,
  refund_amount DECIMAL(10, 2) DEFAULT 0 CHECK (refund_amount >= 0),
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
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
  worker_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(order_id, worker_id)
);

-- Drafts table
CREATE TABLE IF NOT EXISTS drafts (
  id BIGSERIAL PRIMARY KEY,
  job_card_id BIGINT REFERENCES job_cards(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  draft_url TEXT NOT NULL,
  version INT DEFAULT 1 CHECK (version > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Registration Codes table
CREATE TABLE IF NOT EXISTS registration_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('worker', 'admin')),
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_worker_id ON orders(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_cards_worker_id ON job_cards(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_order_id ON job_cards(order_id);
CREATE INDEX IF NOT EXISTS idx_drafts_worker_id ON drafts(worker_id);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);
CREATE INDEX IF NOT EXISTS idx_registration_codes_code ON registration_codes(code);
CREATE INDEX IF NOT EXISTS idx_registration_codes_is_used ON registration_codes(is_used);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_codes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES
-- ============================================

-- USERS TABLE POLICIES
-- Users can read their own data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- MATERIALS TABLE POLICIES
-- Everyone can view materials
CREATE POLICY "Anyone can view materials"
  ON materials FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert materials
CREATE POLICY "Admins can insert materials"
  ON materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Only admins can update materials
CREATE POLICY "Admins can update materials"
  ON materials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Only admins can delete materials
CREATE POLICY "Admins can delete materials"
  ON materials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ORDERS TABLE POLICIES
-- Customers can view their own orders
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Workers can view assigned orders
CREATE POLICY "Workers can view assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (assigned_worker_id = auth.uid());

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Customers can create orders
CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- Admins can update any order
CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Workers can update their assigned orders (limited fields)
CREATE POLICY "Workers can update assigned orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (assigned_worker_id = auth.uid());

-- ORDER_MATERIALS TABLE POLICIES
-- Users can view materials for orders they can see
CREATE POLICY "Users can view order materials"
  ON order_materials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_materials.order_id
      AND (
        orders.customer_id = auth.uid()
        OR orders.assigned_worker_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
      )
    )
  );

-- Customers and admins can insert order materials
CREATE POLICY "Customers and admins can insert order materials"
  ON order_materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_materials.order_id
      AND (
        orders.customer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
      )
    )
  );

-- JOB_CARDS TABLE POLICIES
-- Workers can view their own job cards
CREATE POLICY "Workers can view own job cards"
  ON job_cards FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

-- Admins can view all job cards
CREATE POLICY "Admins can view all job cards"
  ON job_cards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Admins can create job cards
CREATE POLICY "Admins can create job cards"
  ON job_cards FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Workers can update their own job cards
CREATE POLICY "Workers can update own job cards"
  ON job_cards FOR UPDATE
  TO authenticated
  USING (worker_id = auth.uid());

-- Admins can update any job card
CREATE POLICY "Admins can update job cards"
  ON job_cards FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- DRAFTS TABLE POLICIES
-- Workers can view their own drafts
CREATE POLICY "Workers can view own drafts"
  ON drafts FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

-- Admins can view all drafts
CREATE POLICY "Admins can view all drafts"
  ON drafts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Workers can create drafts for their job cards
CREATE POLICY "Workers can create drafts"
  ON drafts FOR INSERT
  TO authenticated
  WITH CHECK (worker_id = auth.uid());

-- Admins can update drafts (for review)
CREATE POLICY "Admins can update drafts"
  ON drafts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- REGISTRATION_CODES TABLE POLICIES
-- Only admins can view registration codes
CREATE POLICY "Admins can view registration codes"
  ON registration_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Only admins can create registration codes
CREATE POLICY "Admins can create registration codes"
  ON registration_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Only admins can update registration codes
CREATE POLICY "Admins can update registration codes"
  ON registration_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- 6. CREATE FUNCTIONS AND TRIGGERS
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
DROP TRIGGER IF EXISTS set_updated_at_users ON users;
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_materials ON materials;
CREATE TRIGGER set_updated_at_materials
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_orders ON orders;
CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to generate unique order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INT;
BEGIN
  counter := (SELECT COUNT(*) FROM orders) + 1;
  new_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. INSERT SAMPLE DATA
-- ============================================

-- Insert sample materials
INSERT INTO materials (name, cost, stock_quantity, low_stock_threshold, unit, category) VALUES
  ('Wood Frame - Small', 15.00, 50, 10, 'piece', 'frames'),
  ('Wood Frame - Medium', 25.00, 40, 10, 'piece', 'frames'),
  ('Wood Frame - Large', 35.00, 30, 10, 'piece', 'frames'),
  ('Glass Sheet - Small', 8.00, 60, 15, 'piece', 'glass'),
  ('Glass Sheet - Medium', 12.00, 50, 15, 'piece', 'glass'),
  ('Glass Sheet - Large', 18.00, 40, 15, 'piece', 'glass'),
  ('Backing Board', 3.00, 100, 20, 'piece', 'backing'),
  ('Mounting Tape', 2.50, 80, 20, 'roll', 'supplies'),
  ('Corner Brackets', 1.50, 200, 30, 'set', 'hardware'),
  ('Hanging Wire', 1.00, 150, 25, 'meter', 'hardware')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. CREATE HELPER FUNCTIONS FOR APP
-- ============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is worker
CREATE OR REPLACE FUNCTION public.is_worker(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id AND role = 'worker'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get low stock materials
CREATE OR REPLACE FUNCTION public.get_low_stock_materials()
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  stock_quantity INT,
  low_stock_threshold INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.name, m.stock_quantity, m.low_stock_threshold
  FROM materials m
  WHERE m.stock_quantity <= m.low_stock_threshold
  ORDER BY m.stock_quantity ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Next steps:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Verify all tables were created: Check "Table Editor" in Supabase
-- 3. Verify RLS is enabled: Check "Authentication" > "Policies"
-- 4. Create your first admin user using the app signup
-- 5. Generate registration codes for workers
-- ============================================
