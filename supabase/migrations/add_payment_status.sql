-- ============================================================
-- ADD payment_status COLUMN TO orders TABLE
-- Separates payment tracking from order lifecycle status.
-- ============================================================

-- 1. Add the new column
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'failed'));

-- 2. Backfill: rows with status='paid' → move to payment_status='paid', reset status to 'pending'
UPDATE public.orders
SET payment_status = 'paid', status = 'pending'
WHERE status = 'paid';

-- 3. Backfill: rows with status='completed' → set status to 'delivered', payment_status to 'paid'
UPDATE public.orders
SET payment_status = 'paid', status = 'delivered'
WHERE status = 'completed';
