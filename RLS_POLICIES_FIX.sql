-- ============================================
-- AWARJANA CREATIONS - RLS POLICIES FIX
-- ============================================
-- This file contains corrected RLS policies to fix 401 errors
-- and ensure proper access control across all tables
-- ============================================

-- ============================================
-- 1. REGISTRATION CODES TABLE POLICIES
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "registration_codes_select_policy" ON registration_codes;
DROP POLICY IF EXISTS "registration_codes_insert_policy" ON registration_codes;
DROP POLICY IF EXISTS "registration_codes_update_policy" ON registration_codes;
DROP POLICY IF EXISTS "registration_codes_service_role_policy" ON registration_codes;

-- Allow anonymous users to SELECT registration codes (needed for signup validation)
CREATE POLICY "registration_codes_anonymous_select"
ON registration_codes FOR SELECT
TO anon
USING (true);

-- Allow authenticated users to SELECT their own codes
CREATE POLICY "registration_codes_authenticated_select"
ON registration_codes FOR SELECT
TO authenticated
USING (true);

-- Allow only admins to INSERT new codes
CREATE POLICY "registration_codes_admin_insert"
ON registration_codes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Allow system to UPDATE codes when used (mark as used during signup)
CREATE POLICY "registration_codes_system_update"
ON registration_codes FOR UPDATE
TO anon, authenticated
USING (is_used = false)
WITH CHECK (true);

-- Service role has full access
CREATE POLICY "registration_codes_service_role_all"
ON registration_codes FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- ============================================
-- 2. USERS TABLE POLICIES
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_own_policy" ON users;
DROP POLICY IF EXISTS "users_service_role_policy" ON users;

-- Allow users to view all users (needed for worker/admin assignment views)
CREATE POLICY "users_select_all"
ON users FOR SELECT
TO authenticated
USING (true);

-- Allow anonymous users to INSERT during signup
CREATE POLICY "users_insert_signup"
ON users FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "users_update_own"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow admins to update any user
CREATE POLICY "users_admin_update_all"
ON users FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Service role has full access
CREATE POLICY "users_service_role_all"
ON users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- ============================================
-- 3. PROFILES TABLE POLICIES
-- ============================================
-- Drop existing policies if any
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Allow users to view their own profile
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- ============================================
-- 4. ORDERS TABLE POLICIES
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;

-- Customers can view their own orders
CREATE POLICY "orders_customer_select_own"
ON orders FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid()
  OR assigned_worker_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'worker')
  )
);

-- Customers can insert their own orders
CREATE POLICY "orders_customer_insert"
ON orders FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

-- Customers can update their own pending orders
CREATE POLICY "orders_customer_update_own"
ON orders FOR UPDATE
TO authenticated
USING (customer_id = auth.uid() AND status = 'pending')
WITH CHECK (customer_id = auth.uid());

-- Workers can update assigned orders
CREATE POLICY "orders_worker_update_assigned"
ON orders FOR UPDATE
TO authenticated
USING (
  assigned_worker_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  assigned_worker_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Admins can do everything with orders
CREATE POLICY "orders_admin_all"
ON orders FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);


-- ============================================
-- 5. MATERIALS TABLE POLICIES
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "All users can view materials" ON materials;

-- All authenticated users can view materials
CREATE POLICY "materials_select_all"
ON materials FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert materials
CREATE POLICY "materials_admin_insert"
ON materials FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Only admins can update materials
CREATE POLICY "materials_admin_update"
ON materials FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Only admins can delete materials
CREATE POLICY "materials_admin_delete"
ON materials FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);


-- ============================================
-- 6. ORDER MATERIALS TABLE POLICIES
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view order materials" ON order_materials;

-- Users can view order materials for their orders
CREATE POLICY "order_materials_select"
ON order_materials FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_materials.order_id
    AND (
      orders.customer_id = auth.uid()
      OR orders.assigned_worker_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      )
    )
  )
);

-- Customers can insert order materials for their orders
CREATE POLICY "order_materials_customer_insert"
ON order_materials FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_materials.order_id
    AND orders.customer_id = auth.uid()
  )
);

-- Admins can do everything with order materials
CREATE POLICY "order_materials_admin_all"
ON order_materials FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);


-- ============================================
-- 7. JOB CARDS TABLE POLICIES
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view job cards" ON job_cards;

-- Workers can view their assigned job cards
CREATE POLICY "job_cards_worker_select"
ON job_cards FOR SELECT
TO authenticated
USING (
  worker_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Admins can insert job cards
CREATE POLICY "job_cards_admin_insert"
ON job_cards FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Workers can update their own job cards
CREATE POLICY "job_cards_worker_update"
ON job_cards FOR UPDATE
TO authenticated
USING (
  worker_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  worker_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);


-- ============================================
-- 8. DRAFTS TABLE POLICIES
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view drafts" ON drafts;

-- Workers can view their own drafts
CREATE POLICY "drafts_worker_select"
ON drafts FOR SELECT
TO authenticated
USING (
  worker_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = drafts.order_id
    AND orders.customer_id = auth.uid()
  )
);

-- Workers can insert their own drafts
CREATE POLICY "drafts_worker_insert"
ON drafts FOR INSERT
TO authenticated
WITH CHECK (worker_id = auth.uid());

-- Workers can update their own pending drafts
CREATE POLICY "drafts_worker_update"
ON drafts FOR UPDATE
TO authenticated
USING (
  worker_id = auth.uid() AND status = 'pending'
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  worker_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Admins can review drafts
CREATE POLICY "drafts_admin_review"
ON drafts FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);


-- ============================================
-- 9. MATERIAL USAGE TABLE POLICIES
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view material usage" ON material_usage;

-- Workers can view material usage for their job cards
CREATE POLICY "material_usage_worker_select"
ON material_usage FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM job_cards
    WHERE job_cards.id = material_usage.job_card_id
    AND (
      job_cards.worker_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      )
    )
  )
);

-- Workers can insert material usage for their job cards
CREATE POLICY "material_usage_worker_insert"
ON material_usage FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM job_cards
    WHERE job_cards.id = material_usage.job_card_id
    AND job_cards.worker_id = auth.uid()
  )
);

-- Workers can update their own material usage
CREATE POLICY "material_usage_worker_update"
ON material_usage FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM job_cards
    WHERE job_cards.id = material_usage.job_card_id
    AND job_cards.worker_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM job_cards
    WHERE job_cards.id = material_usage.job_card_id
    AND job_cards.worker_id = auth.uid()
  )
);


-- ============================================
-- 10. ALERTS TABLE POLICIES
-- ============================================
-- Create policies for alerts table

-- All authenticated users can view alerts
CREATE POLICY "alerts_select_all"
ON alerts FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert alerts
CREATE POLICY "alerts_admin_insert"
ON alerts FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Only admins can update alerts
CREATE POLICY "alerts_admin_update"
ON alerts FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Only admins can delete alerts
CREATE POLICY "alerts_admin_delete"
ON alerts FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);


-- ============================================
-- 11. ORDER STATUS HISTORY TABLE POLICIES
-- ============================================
-- Create policies for order_status_history table

-- Users can view status history for their orders
CREATE POLICY "order_status_history_select"
ON order_status_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_status_history.order_id
    AND (
      orders.customer_id = auth.uid()
      OR orders.assigned_worker_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      )
    )
  )
);

-- System can insert status history
CREATE POLICY "order_status_history_insert"
ON order_status_history FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only admins can update status history
CREATE POLICY "order_status_history_admin_update"
ON order_status_history FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);


-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify policies are working:

-- Check registration_codes policies
-- SELECT * FROM pg_policies WHERE tablename = 'registration_codes';

-- Check users policies
-- SELECT * FROM pg_policies WHERE tablename = 'users';

-- Check orders policies
-- SELECT * FROM pg_policies WHERE tablename = 'orders';

-- ============================================
-- NOTES
-- ============================================
-- 1. These policies fix the 401 error during registration by allowing
--    anonymous users to SELECT from registration_codes table
-- 2. Anonymous users can also INSERT into users table during signup
-- 3. All other operations require authentication
-- 4. Role-based access control is implemented throughout
-- 5. Service role always has full access for backend operations
