-- ============================================
-- AWARJANA CREATIONS - COMPLETE DATABASE SETUP
-- ============================================
-- This script creates all tables, RLS policies, and triggers
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. DROP EXISTING TABLES (CLEAN START)
-- ============================================
-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS drafts CASCADE;
DROP TABLE IF EXISTS job_cards CASCADE;
DROP TABLE IF EXISTS order_materials CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS credit_usage CASCADE;
DROP TABLE IF EXISTS credits CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS registration_codes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop views
DROP VIEW IF EXISTS admin_code_usage_stats CASCADE;

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('customer', 'worker', 'admin')) DEFAULT 'customer',
  registration_code_id BIGINT,
  api_key_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_password_change TIMESTAMP WITH TIME ZONE,
  credits_remaining INTEGER DEFAULT 10 CHECK (credits_remaining >= 0),
  total_credits_used INTEGER DEFAULT 0 CHECK (total_credits_used >= 0)
);

-- API Keys table for managing API access
CREATE TABLE IF NOT EXISTS api_keys (
  id BIGSERIAL PRIMARY KEY,
  key_name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credits INTEGER DEFAULT 10 CHECK (credits >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Credits table for tracking user credits
CREATE TABLE IF NOT EXISTS credits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_key_id BIGINT REFERENCES api_keys(id) ON DELETE CASCADE,
  total_credits INTEGER DEFAULT 10 CHECK (total_credits >= 0),
  used_credits INTEGER DEFAULT 0 CHECK (used_credits >= 0),
  remaining_credits INTEGER GENERATED ALWAYS AS (total_credits - used_credits) STORED CHECK (remaining_credits >= 0),
  credit_type TEXT DEFAULT 'registration' CHECK (credit_type IN ('registration', 'purchase', 'bonus', 'promotional')),
  source TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit Usage table for detailed tracking
CREATE TABLE IF NOT EXISTS credit_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_key_id BIGINT REFERENCES api_keys(id) ON DELETE CASCADE,
  credit_id BIGINT REFERENCES credits(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('order_create', 'order_update', 'draft_submit', 'material_view', 'report_generate', 'api_call', 'email_sent', 'login', 'signup')),
  credits_consumed DECIMAL(3,2) DEFAULT 1.00 CHECK (credits_consumed > 0),
  action_details JSONB DEFAULT '{}',
  action_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  cost_lkr DECIMAL(10, 2) CHECK (cost_lkr >= 0),
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
  credits_consumed DECIMAL(3,2) DEFAULT 0.10 CHECK (credits_consumed >= 0),
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
  credits_consumed DECIMAL(3,2) DEFAULT 0.05 CHECK (credits_consumed >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Registration Codes table
CREATE TABLE IF NOT EXISTS registration_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('worker', 'admin')),
  credits INTEGER DEFAULT 10 CHECK (credits >= 0),
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CREATE VIEWS
-- ============================================

-- Admin code usage statistics view
CREATE VIEW admin_code_usage_stats AS
SELECT 
  rc.id AS code_id,
  rc.code AS code_hash,
  rc.role,
  rc.credits,
  rc.is_used,
  rc.created_at AS code_created_at,
  rc.used_at,
  u.id AS user_id,
  u.email AS user_email,
  u.created_at AS user_created_at,
  c.total_credits,
  c.remaining_credits,
  c.credit_type,
  cu.id AS usage_id,
  cu.action_type,
  cu.credits_consumed,
  cu.created_at AS usage_created_at,
  COALESCE(SUM(cu.credits_consumed) OVER (PARTITION BY rc.id), 0) AS total_usage_from_code
FROM registration_codes rc
LEFT JOIN users u ON rc.used_by = u.id
LEFT JOIN credits c ON c.user_id = u.id
LEFT JOIN credit_usage cu ON cu.user_id = u.id
ORDER BY rc.created_at DESC;

-- ============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_credits ON users(credits_remaining);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_id ON credit_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_action ON credit_usage(action_type);
CREATE INDEX IF NOT EXISTS idx_credit_usage_created ON credit_usage(created_at DESC);
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
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);

-- ============================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_codes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CREATE RLS POLICIES
-- ============================================

-- USERS TABLE POLICIES
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- API_KEYS TABLE POLICIES
CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create API keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all API keys"
  ON api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- CREDITS TABLE POLICIES
CREATE POLICY "Users can view own credits"
  ON credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits"
  ON credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON credits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all credits"
  ON credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- CREDIT_USAGE TABLE POLICIES
CREATE POLICY "Users can view own credit usage"
  ON credit_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert credit usage"
  ON credit_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all credit usage"
  ON credit_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- MATERIALS TABLE POLICIES
CREATE POLICY "Anyone can view materials"
  ON materials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert materials"
  ON materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update materials"
  ON materials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

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
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Workers can view assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (assigned_worker_id = auth.uid());

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Workers can update assigned orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (assigned_worker_id = auth.uid());

-- ORDER_MATERIALS TABLE POLICIES
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
CREATE POLICY "Workers can view own job cards"
  ON job_cards FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

CREATE POLICY "Admins can view all job cards"
  ON job_cards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can create job cards"
  ON job_cards FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Workers can update own job cards"
  ON job_cards FOR UPDATE
  TO authenticated
  USING (worker_id = auth.uid());

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
CREATE POLICY "Workers can view own drafts"
  ON drafts FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

CREATE POLICY "Admins can view all drafts"
  ON drafts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Workers can create drafts"
  ON drafts FOR INSERT
  TO authenticated
  WITH CHECK (worker_id = auth.uid());

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
CREATE POLICY "Anyone can verify registration codes"
  ON registration_codes FOR SELECT
  USING (true);

CREATE POLICY "Admins can view registration codes"
  ON registration_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can create registration codes"
  ON registration_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

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
-- 7. CREATE FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to automatically create user record after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, created_at, updated_at, credits_remaining, total_credits_used)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NOW(),
    NOW(),
    COALESCE((NEW.raw_user_meta_data->>'credits')::INTEGER, 10),
    0
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

DROP TRIGGER IF EXISTS set_updated_at_credits ON credits;
CREATE TRIGGER set_updated_at_credits
  BEFORE UPDATE ON credits
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

-- Function to check if user has enough credits
CREATE OR REPLACE FUNCTION public.has_enough_credits(user_id UUID, required_credits DECIMAL)
RETURNS BOOLEAN AS $$
DECLARE
  user_remaining INTEGER;
BEGIN
  SELECT credits_remaining INTO user_remaining FROM users WHERE id = user_id;
  RETURN user_remaining >= required_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consume credits
CREATE OR REPLACE FUNCTION public.consume_credits(
  p_user_id UUID,
  p_action_type TEXT,
  p_credits_consumed DECIMAL,
  p_action_details JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  -- Check if user has enough credits
  SELECT credits_remaining INTO v_remaining FROM users WHERE id = p_user_id;
  
  IF v_remaining < p_credits_consumed THEN
    RETURN FALSE;
  END IF;
  
  -- Update user credits
  UPDATE users 
  SET 
    credits_remaining = credits_remaining - p_credits_consumed::INTEGER,
    total_credits_used = total_credits_used + p_credits_consumed::INTEGER,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log credit usage
  INSERT INTO credit_usage (user_id, action_type, credits_consumed, action_details)
  VALUES (p_user_id, p_action_type, p_credits_consumed, p_action_details);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits to user
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_credit_type TEXT DEFAULT 'bonus',
  p_source TEXT DEFAULT 'admin'
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO credits (user_id, total_credits, credit_type, source)
  VALUES (p_user_id, p_credits, p_credit_type, p_source);
  
  UPDATE users 
  SET 
    credits_remaining = credits_remaining + p_credits,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate API key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT AS $$
DECLARE
  v_key TEXT;
BEGIN
  v_key := 'awr_' || encode(gen_random_bytes(24), 'hex');
  RETURN v_key;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. INSERT SAMPLE DATA
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
-- 9. CREATE HELPER FUNCTIONS FOR APP
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

-- Function to get user credit status
CREATE OR REPLACE FUNCTION public.get_user_credit_status(user_id UUID)
RETURNS TABLE (
  total_credits INTEGER,
  used_credits INTEGER,
  remaining_credits INTEGER,
  usage_percentage DECIMAL,
  credit_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(c.total_credits), 0) AS total_credits,
    COALESCE(SUM(c.used_credits), 0) AS used_credits,
    COALESCE(SUM(c.remaining_credits), 0) AS remaining_credits,
    CASE 
      WHEN COALESCE(SUM(c.total_credits), 0) > 0 
      THEN (COALESCE(SUM(c.used_credits), 0) / COALESCE(SUM(c.total_credits), 1) * 100)::DECIMAL
      ELSE 0 
    END AS usage_percentage,
    CASE 
      WHEN COALESCE(SUM(c.remaining_credits), 0) <= 1 THEN 'critical'
      WHEN COALESCE(SUM(c.remaining_credits), 0) <= 3 THEN 'low'
      WHEN COALESCE(SUM(c.remaining_credits), 0) <= 5 THEN 'warning'
      ELSE 'healthy'
    END AS credit_status
  FROM credits c
  WHERE c.user_id = get_user_credit_status.user_id;
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
-- 6. Add API keys for users to manage credits
-- ============================================

-- Log completion
SELECT '✅ Database setup completed successfully!' AS status, 
       NOW() AS completed_at,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS table_count;
