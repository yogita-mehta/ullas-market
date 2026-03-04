-- Admin RLS policies: allow admin users full read access for platform management

-- Admin can see ALL products (including inactive ones)
CREATE POLICY "Admins can view all products"
ON public.products FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any product
CREATE POLICY "Admins can delete any product"
ON public.products FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all seller profiles
CREATE POLICY "Admins can view all seller profiles"
ON public.seller_profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update any seller profile (for approve/reject)
CREATE POLICY "Admins can update any seller profile"
ON public.seller_profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all order items
CREATE POLICY "Admins can view all order items"
ON public.order_items FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all profiles (already public for SELECT, but explicit for safety)
-- profiles already have: "Profiles are viewable by everyone" FOR SELECT USING (true)
-- so no extra policy needed for profiles.
