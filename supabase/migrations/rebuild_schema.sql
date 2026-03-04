-- ============================================================
-- REBUILD SCHEMA MIGRATION
-- Adds new tables, columns, and non-recursive RLS policies
-- for the full marketplace workflow.
-- ============================================================

-- ============================================================
-- 1. Add columns to profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'buyer'
    CHECK (role IN ('buyer', 'seller', 'admin')),
  ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'en';

-- Backfill role from user_roles table
UPDATE public.profiles p
SET role = COALESCE(
  (SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin') THEN 'admin'
      WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'seller') THEN 'seller'
      ELSE 'buyer'
    END
  ),
  'buyer'
)
WHERE p.role IS NULL OR p.role = 'buyer';

-- ============================================================
-- 2. Add columns to products
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS official_name TEXT,
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;

-- Backfill quantity from stock
UPDATE public.products SET quantity = stock WHERE quantity = 0 OR quantity IS NULL;

-- ============================================================
-- 3. Add columns to orders
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS total_price NUMERIC DEFAULT 0;

-- Backfill total_price from total
UPDATE public.orders SET total_price = total WHERE total_price = 0 OR total_price IS NULL;

-- ============================================================
-- 4. Add verification_status to seller_profiles
-- ============================================================
ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- Backfill from fssai_verified
UPDATE public.seller_profiles
SET verification_status = CASE WHEN fssai_verified = true THEN 'approved' ELSE 'pending' END
WHERE verification_status = 'pending';

-- ============================================================
-- 5. Create reviews table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Reviews are viewable by everyone"
ON public.reviews FOR SELECT USING (true);

-- Buyers can create reviews
CREATE POLICY "Buyers can create reviews"
ON public.reviews FOR INSERT
WITH CHECK (buyer_id = auth.uid());

-- Buyers can update their own reviews
CREATE POLICY "Buyers can update their reviews"
ON public.reviews FOR UPDATE
USING (buyer_id = auth.uid());

-- ============================================================
-- 6. Create buyer_preferences table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.buyer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  UNIQUE (user_id, category)
);

ALTER TABLE public.buyer_preferences ENABLE ROW LEVEL SECURITY;

-- Buyers can manage their own preferences
CREATE POLICY "Users can view their preferences"
ON public.buyer_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their preferences"
ON public.buyer_preferences FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their preferences"
ON public.buyer_preferences FOR DELETE
USING (user_id = auth.uid());

-- ============================================================
-- 7. SECURITY DEFINER helper for admin check from profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- ============================================================
-- 8. Drop and recreate orders policies (non-recursive)
-- ============================================================
DROP POLICY IF EXISTS "Buyer can view their orders"      ON public.orders;
DROP POLICY IF EXISTS "Buyer can create orders"           ON public.orders;
DROP POLICY IF EXISTS "Buyer can update their orders"     ON public.orders;
DROP POLICY IF EXISTS "Seller can view product orders"    ON public.orders;
DROP POLICY IF EXISTS "Seller can update product orders"  ON public.orders;
DROP POLICY IF EXISTS "Admin full access orders"          ON public.orders;

-- Buyer SELECT
CREATE POLICY "Buyer can view their orders"
ON public.orders FOR SELECT
USING (buyer_id = auth.uid());

-- Buyer INSERT
CREATE POLICY "Buyer can create orders"
ON public.orders FOR INSERT
WITH CHECK (buyer_id = auth.uid());

-- Buyer UPDATE
CREATE POLICY "Buyer can update their orders"
ON public.orders FOR UPDATE
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());

-- Seller SELECT (direct column, no join needed)
CREATE POLICY "Seller can view their orders"
ON public.orders FOR SELECT
USING (seller_id = auth.uid());

-- Seller UPDATE
CREATE POLICY "Seller can update their orders"
ON public.orders FOR UPDATE
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- Admin full access
CREATE POLICY "Admin full access orders"
ON public.orders FOR ALL
USING (public.is_admin(auth.uid()));

-- ============================================================
-- 9. Drop and recreate order_items policies (non-recursive)
-- ============================================================
DROP POLICY IF EXISTS "Buyer can view their order items"   ON public.order_items;
DROP POLICY IF EXISTS "Buyer can insert their order items" ON public.order_items;
DROP POLICY IF EXISTS "Seller can view their order items"  ON public.order_items;
DROP POLICY IF EXISTS "Admin can view all order items"     ON public.order_items;

-- Use SECURITY DEFINER helpers (already created in fix_orders_rls_recursion.sql)
CREATE POLICY "Buyer can view their order items"
ON public.order_items FOR SELECT
USING (public.is_order_buyer(order_id, auth.uid()));

CREATE POLICY "Buyer can insert their order items"
ON public.order_items FOR INSERT
WITH CHECK (public.is_order_buyer(order_id, auth.uid()));

CREATE POLICY "Seller can view their order items"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = order_items.product_id
      AND products.seller_id = auth.uid()
  )
);

CREATE POLICY "Admin can view all order items"
ON public.order_items FOR SELECT
USING (public.is_admin(auth.uid()));

-- ============================================================
-- 10. Update profiles policies for admin reads
-- ============================================================
-- profiles already has "Profiles are viewable by everyone" — no change needed.

-- ============================================================
-- 11. Products admin policies (if not already present)
-- ============================================================
-- Keep existing product policies; admin policies already in admin_rls_policies.sql

-- ============================================================
-- 12. Ensure RLS on all tables
-- ============================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_preferences ENABLE ROW LEVEL SECURITY;
