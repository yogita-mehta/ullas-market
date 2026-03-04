-- Add location columns to profiles table for Phase 1 location-aware marketplace
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS village text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pincode text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude numeric;
