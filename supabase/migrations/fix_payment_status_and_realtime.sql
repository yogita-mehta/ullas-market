-- Fix 1: Allow 'cod' value in payment_status check constraint
-- Drop the existing constraint and recreate with 'cod' included
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'cod'));

-- Fix 2: Enable real-time for orders table so buyer dashboard gets live updates
-- This is required for Supabase Realtime postgres_changes to work
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
