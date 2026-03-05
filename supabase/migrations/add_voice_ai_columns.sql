-- Add voice/AI columns to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS voice_transcript TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT false;

-- Dish dictionary for caching standardized dish names
CREATE TABLE IF NOT EXISTS public.dish_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_name TEXT NOT NULL UNIQUE,
  official_name TEXT NOT NULL,
  short_description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dish_dictionary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dish dictionary is readable by everyone"
  ON public.dish_dictionary FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert dish dictionary"
  ON public.dish_dictionary FOR INSERT WITH CHECK (true);
