-- Fix: Infinite recursion in RLS policies for orders table
-- Root cause: orders policies reference order_items, and order_items
-- policies reference orders, creating a circular RLS evaluation loop.
-- Fix: Use SECURITY DEFINER helper functions that bypass RLS for
-- cross-table ownership checks, breaking the recursion cycle.

-- ============================================================
-- 1. Helper Functions (SECURITY DEFINER = bypass RLS)
-- ============================================================

-- Check if a user is a seller for any product in a given order
CREATE OR REPLACE FUNCTION public.is_order_seller(_order_id UUID, _seller_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = _order_id
      AND p.seller_id = _seller_id
  );
$$;

-- Check if a user is the buyer/owner of a given order
CREATE OR REPLACE FUNCTION public.is_order_buyer(_order_id UUID, _buyer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM orders
    WHERE id = _order_id
      AND buyer_id = _buyer_id
  );
$$;


-- ============================================================
-- 2. Drop ALL existing policies on orders
-- ============================================================
DROP POLICY IF EXISTS "Buyers can view their own orders"         ON public.orders;
DROP POLICY IF EXISTS "Buyers can create orders"                 ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders"               ON public.orders;
DROP POLICY IF EXISTS "Sellers can view orders for their products" ON public.orders;
DROP POLICY IF EXISTS "Buyers can update their own orders"       ON public.orders;
DROP POLICY IF EXISTS "Sellers can update orders for their products" ON public.orders;


-- ============================================================
-- 3. Drop ALL existing policies on order_items
-- ============================================================
DROP POLICY IF EXISTS "Order items viewable by order owner"      ON public.order_items;
DROP POLICY IF EXISTS "Order items insertable by order owner"    ON public.order_items;
DROP POLICY IF EXISTS "Sellers can view their order items"       ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items"          ON public.order_items;


-- ============================================================
-- 4. Recreate orders policies (NO cross-table RLS recursion)
-- ============================================================

-- Buyer can view their own orders (direct column check)
CREATE POLICY "Buyer can view their orders"
ON public.orders FOR SELECT
USING (buyer_id = auth.uid());

-- Buyer can create orders (direct column check)
CREATE POLICY "Buyer can create orders"
ON public.orders FOR INSERT
WITH CHECK (buyer_id = auth.uid());

-- Buyer can update their own orders (direct column check)
CREATE POLICY "Buyer can update their orders"
ON public.orders FOR UPDATE
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());

-- Seller can view orders containing their products
-- Uses SECURITY DEFINER function → no RLS on order_items during check
CREATE POLICY "Seller can view product orders"
ON public.orders FOR SELECT
USING (public.is_order_seller(id, auth.uid()));

-- Seller can update orders containing their products
CREATE POLICY "Seller can update product orders"
ON public.orders FOR UPDATE
USING (public.is_order_seller(id, auth.uid()))
WITH CHECK (public.is_order_seller(id, auth.uid()));

-- Admin full access on orders
CREATE POLICY "Admin full access orders"
ON public.orders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  )
);


-- ============================================================
-- 5. Recreate order_items policies (NO cross-table RLS recursion)
-- ============================================================

-- Buyer can view order items for their orders
-- Uses SECURITY DEFINER function → no RLS on orders during check
CREATE POLICY "Buyer can view their order items"
ON public.order_items FOR SELECT
USING (public.is_order_buyer(order_id, auth.uid()));

-- Buyer can insert order items into their orders
CREATE POLICY "Buyer can insert their order items"
ON public.order_items FOR INSERT
WITH CHECK (public.is_order_buyer(order_id, auth.uid()));

-- Seller can view order items for their products (direct products check)
CREATE POLICY "Seller can view their order items"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = order_items.product_id
      AND products.seller_id = auth.uid()
  )
);

-- Admin can view all order items
CREATE POLICY "Admin can view all order items"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  )
);


-- ============================================================
-- 6. Ensure RLS is enabled (idempotent)
-- ============================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
