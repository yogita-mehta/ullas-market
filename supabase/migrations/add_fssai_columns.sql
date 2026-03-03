-- Add FSSAI compliance columns to seller_profiles
ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS fssai_number text,
  ADD COLUMN IF NOT EXISTS fssai_certificate_url text,
  ADD COLUMN IF NOT EXISTS fssai_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Update existing rows: backfill fssai_status for rows that already have fssai_verified = true
UPDATE seller_profiles SET fssai_status = 'approved' WHERE fssai_verified = true;

-- Create storage bucket for FSSAI certificates (run in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('fssai-certificates', 'fssai-certificates', true) ON CONFLICT DO NOTHING;
