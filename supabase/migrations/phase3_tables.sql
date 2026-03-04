-- Phase 3: Logistics, Village Batching, Delivery Partners & Payment Gateway
-- Run this migration in your Supabase SQL Editor

-- 1. Add delivery_partner to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'delivery_partner';

-- 2. Create delivery_batches table
CREATE TABLE IF NOT EXISTS delivery_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  village text NOT NULL,
  district text,
  status text NOT NULL DEFAULT 'created',
  delivery_partner uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create delivery_partners table
CREATE TABLE IF NOT EXISTS delivery_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) UNIQUE,
  name text NOT NULL,
  phone text,
  vehicle_type text,
  assigned_village text,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Add new columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'batch_id') THEN
    ALTER TABLE orders ADD COLUMN batch_id uuid REFERENCES delivery_batches(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_id') THEN
    ALTER TABLE orders ADD COLUMN payment_id text;
  END IF;
END $$;

-- 5. RLS policies for delivery_batches
ALTER TABLE delivery_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on delivery_batches"
  ON delivery_batches FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Authenticated users can create batches"
  ON delivery_batches FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view batches"
  ON delivery_batches FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Delivery partners can view assigned batches"
  ON delivery_batches FOR SELECT
  USING (delivery_partner = auth.uid());

CREATE POLICY "Authenticated users can view batches"
  ON delivery_batches FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 6. RLS policies for delivery_partners
ALTER TABLE delivery_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on delivery_partners"
  ON delivery_partners FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Delivery partners can view own profile"
  ON delivery_partners FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Delivery partners can update own profile"
  ON delivery_partners FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can view delivery partners"
  ON delivery_partners FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 7. Index for batch lookups by village and date
CREATE INDEX IF NOT EXISTS idx_delivery_batches_village_date
  ON delivery_batches (village, created_at);

-- 8. Index for delivery partner lookups
CREATE INDEX IF NOT EXISTS idx_delivery_partners_user_id
  ON delivery_partners (user_id);

CREATE INDEX IF NOT EXISTS idx_orders_batch_id
  ON orders (batch_id);

-- 9. Admin-only function to look up user_id by email (for delivery partner registration)
CREATE OR REPLACE FUNCTION get_user_id_by_email(lookup_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM auth.users WHERE email = lookup_email LIMIT 1;
$$;

-- 10. Allow admins to manage user_roles for delivery partner registration
CREATE POLICY "Admins can insert user_roles"
  ON user_roles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update user_roles"
  ON user_roles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 11. Delete user account function (user deletes their own account)
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete user data from all tables
  DELETE FROM delivery_partners WHERE user_id = uid;
  DELETE FROM notifications WHERE user_id = uid;
  DELETE FROM cart_items WHERE user_id = uid;
  DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE buyer_id = uid);
  DELETE FROM orders WHERE buyer_id = uid;
  DELETE FROM addresses WHERE user_id = uid;
  DELETE FROM seller_profiles WHERE user_id = uid;
  DELETE FROM user_roles WHERE user_id = uid;
  DELETE FROM profiles WHERE user_id = uid;

  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

-- 12. Delivery partner can update batches assigned to them
CREATE POLICY "Delivery partners can update assigned batches"
  ON delivery_batches FOR UPDATE
  USING (delivery_partner = auth.uid());

-- 13. Delivery partner can update orders in their assigned batches
CREATE POLICY "Delivery partners can update orders in their batches"
  ON orders FOR UPDATE
  USING (
    batch_id IN (
      SELECT id FROM delivery_batches WHERE delivery_partner = auth.uid()
    )
  );

