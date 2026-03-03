
-- Sellers need to see orders that contain their products
CREATE POLICY "Sellers can view orders for their products"
ON public.orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = orders.id AND p.seller_id = auth.uid()
  )
);

-- Sellers can view order items for their products
CREATE POLICY "Sellers can view their order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = order_items.product_id AND p.seller_id = auth.uid()
  )
);

-- Buyers can update their own orders (for "Mark as Paid")
CREATE POLICY "Buyers can update their own orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id)
WITH CHECK (auth.uid() = buyer_id);

-- Sellers can update orders for their products (for "Mark as Completed")
CREATE POLICY "Sellers can update orders for their products"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = orders.id AND p.seller_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = orders.id AND p.seller_id = auth.uid()
  )
);

-- Storage policies for product-images bucket
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Users can update their own product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
