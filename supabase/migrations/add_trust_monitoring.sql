-- ============================================================
-- ADDITIVE MIGRATION: Trust & Fraud Monitoring
-- Adds trust_score to seller_profiles, creates risk_flags table
-- ============================================================

-- Add trust_score column to seller_profiles (additive, non-destructive)
ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 100;

-- Create risk_flags table
CREATE TABLE IF NOT EXISTS public.risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  details TEXT,
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_flags ENABLE ROW LEVEL SECURITY;

-- Only admins can view risk flags
CREATE POLICY "Admins can view risk flags"
  ON public.risk_flags FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Edge functions insert via service role key (bypasses RLS)
-- But we add an INSERT policy for safety
CREATE POLICY "Service role can insert risk flags"
  ON public.risk_flags FOR INSERT
  WITH CHECK (true);

-- Admins can update risk flags (mark as resolved)
CREATE POLICY "Admins can update risk flags"
  ON public.risk_flags FOR UPDATE
  USING (public.is_admin(auth.uid()));
