-- ============================================
-- AWARJANA CREATIONS - RLS POLICIES & QUERIES (2026 EDITION)
-- ============================================

-- 1. RESET POLICIES
-- Run these if you need to clear existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "registration_codes_anonymous_select" ON registration_codes;
DROP POLICY IF EXISTS "registration_codes_authenticated_select" ON registration_codes;
DROP POLICY IF EXISTS "registration_codes_admin_insert" ON registration_codes;
DROP POLICY IF EXISTS "registration_codes_system_update" ON registration_codes;
DROP POLICY IF EXISTS "registration_codes_service_role_all" ON registration_codes;
DROP POLICY IF EXISTS "Users can view own activity" ON activity_logs;
DROP POLICY IF EXISTS "Users can insert activity" ON activity_logs;
DROP POLICY IF EXISTS "Admins can view all activity" ON activity_logs;

-- 2. USERS TABLE POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
ON users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON users FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users" 
ON users FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 3. REGISTRATION CODES POLICIES
ALTER TABLE registration_codes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to SELECT registration codes (needed for signup validation)
CREATE POLICY "registration_codes_anonymous_select"
ON registration_codes FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can manage codes" 
ON registration_codes FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Allow system to UPDATE codes when used (mark as used during signup)
CREATE POLICY "registration_codes_system_update"
ON registration_codes FOR UPDATE
TO anon, authenticated
USING (is_used = false)
WITH CHECK (true);

-- 4. ORDERS POLICIES
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own orders" 
ON orders FOR SELECT 
TO authenticated 
USING (customer_id = auth.uid());

CREATE POLICY "Employers can view assigned orders" 
ON orders FOR SELECT 
TO authenticated 
USING (assigned_employer_id = auth.uid());

CREATE POLICY "Admins can view all orders" 
ON orders FOR SELECT 
TO authenticated 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Customers can create orders" 
ON orders FOR INSERT 
TO authenticated 
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins can update orders" 
ON orders FOR UPDATE 
TO authenticated 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 5. ACTIVITY LOGS POLICIES
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity" 
ON activity_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert activity" 
ON activity_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity" 
ON activity_logs FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 6. HELPER QUERIES FOR ADMIN

-- Query to check registration code count
-- SELECT * FROM registration_code_count;

-- Query to reset all registration codes
-- DELETE FROM registration_codes;

-- Query to view recent user activity (Session Tracker)
-- SELECT u.email, al.action_type, al.action_details, al.created_at 
-- FROM activity_logs al
-- JOIN users u ON al.user_id = u.id
-- ORDER BY al.created_at DESC
-- LIMIT 50;
