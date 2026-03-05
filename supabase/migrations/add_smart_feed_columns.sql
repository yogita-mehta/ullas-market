-- ============================================================
-- ADDITIVE MIGRATION: Smart Feed Support
-- Adds view_count to products for trending calculation
-- ============================================================

-- Add view_count column to products (additive, non-destructive)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
