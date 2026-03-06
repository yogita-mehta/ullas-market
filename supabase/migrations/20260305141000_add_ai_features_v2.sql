-- ============================================================
-- ADDITIVE MIGRATION: AI Features v2
-- Adds user_activity table, product district column,
-- dialect dictionary seeding, and performance indexes.
-- ============================================================

-- 1. Create user_activity table for personalized feed scoring
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('view', 'add_to_cart', 'buy')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Users can view/insert their own activity
CREATE POLICY "Users can view own activity"
  ON public.user_activity FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activity"
  ON public.user_activity FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Service role (edge functions) can read all activity
CREATE POLICY "Service role can read all activity"
  ON public.user_activity FOR SELECT
  USING (true);

-- Index for fast category scoring queries
CREATE INDEX IF NOT EXISTS idx_user_activity_user_category
  ON public.user_activity (user_id, category, action_type);

CREATE INDEX IF NOT EXISTS idx_user_activity_created
  ON public.user_activity (created_at);

-- 2. Add district column to products for regional price queries
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS district TEXT;

-- Index for fast price suggestion queries
CREATE INDEX IF NOT EXISTS idx_products_category_district_price
  ON public.products (category, district) WHERE is_active = true AND price > 0;

-- 3. Add ai_explanation column to risk_flags
ALTER TABLE public.risk_flags
  ADD COLUMN IF NOT EXISTS ai_explanation TEXT;

-- 4. Seed dish_dictionary with common Kerala/Tamil/Hindi food terms
-- Using ON CONFLICT to avoid duplicates if run multiple times
INSERT INTO public.dish_dictionary (local_name, official_name, short_description, category)
VALUES
  -- Kerala (Malayalam)
  ('puttu', 'Rice Cake (Puttu)', 'Steamed cylindrical rice cake with coconut', 'Ready-to-Eat'),
  ('appam', 'Hoppers (Appam)', 'Fermented rice pancake with crispy edges and soft center', 'Ready-to-Eat'),
  ('kappa', 'Tapioca (Kappa)', 'Boiled tapioca/cassava, a Kerala staple', 'Ready-to-Eat'),
  ('idiyappam', 'String Hoppers', 'Steamed rice noodle nests, light and fluffy', 'Ready-to-Eat'),
  ('ada', 'Rice Ada', 'Steamed rice parcels with sweet coconut filling', 'Sweets'),
  ('unniyappam', 'Sweet Rice Fritters', 'Deep-fried rice and jaggery balls with banana', 'Sweets'),
  ('achappam', 'Rose Cookies', 'Deep-fried crispy flower-shaped cookies', 'Snacks'),
  ('murukku', 'Murukku', 'Crunchy spiral-shaped rice flour snack', 'Snacks'),
  ('pazham pori', 'Banana Fritters', 'Ripe banana slices deep-fried in batter', 'Snacks'),
  ('parippu vada', 'Lentil Fritters', 'Crispy deep-fried lentil patties with spices', 'Snacks'),
  ('nei choru', 'Ghee Rice', 'Fragrant basmati rice cooked with ghee and spices', 'Ready-to-Eat'),
  ('avial', 'Mixed Vegetable Curry (Avial)', 'Kerala mixed vegetable curry with coconut and yogurt', 'Ready-to-Eat'),
  ('payasam', 'Payasam', 'Traditional Kerala sweet milk pudding', 'Sweets'),
  ('kozhukatta', 'Sweet Rice Dumplings', 'Steamed rice dumplings with jaggery coconut filling', 'Sweets'),
  ('elayappam', 'Jackfruit Rice Cake', 'Steamed rice cake wrapped in banana leaf', 'Sweets'),
  ('mango pickle', 'Mango Pickle', 'Spicy Kerala-style raw mango pickle', 'Pickles'),
  ('naranga achar', 'Lemon Pickle', 'Tangy Kerala lemon pickle with mustard', 'Pickles'),
  ('kaduku manga', 'Baby Mango Pickle', 'Small raw mangoes pickled with mustard', 'Pickles'),
  ('chammanthi podi', 'Coconut Chutney Powder', 'Dry roasted coconut spice powder', 'Spices'),
  ('rasam podi', 'Rasam Powder', 'Aromatic spice blend for South Indian rasam', 'Spices'),
  ('sambar podi', 'Sambar Powder', 'Spice blend for traditional sambar', 'Spices'),

  -- Tamil
  ('vadai', 'Medu Vada', 'Crispy deep-fried urad dal doughnut', 'Snacks'),
  ('sundal', 'Chickpea Sundal', 'Spiced chickpea stir-fry, a temple festival snack', 'Snacks'),
  ('thattai', 'Thattai', 'Crispy thin rice flour crackers with spices', 'Snacks'),
  ('mysore pak', 'Mysore Pak', 'Rich ghee and gram flour fudge sweet', 'Sweets'),
  ('laddu', 'Laddu', 'Sweet round ball made from gram flour and sugar', 'Sweets'),
  ('jangiri', 'Jangiri (Jalebi)', 'Crispy pretzel-shaped sweet soaked in sugar syrup', 'Sweets'),
  ('milagai podi', 'Gunpowder (Chili Powder)', 'Spicy ground lentil and chili powder', 'Spices'),
  ('filter coffee', 'South Indian Filter Coffee', 'Traditional drip-brewed coffee with chicory', 'Beverages'),

  -- Hindi / North Indian
  ('mathri', 'Mathri', 'Crispy flaky deep-fried snack from North India', 'Snacks'),
  ('namak pare', 'Namak Pare', 'Salty diamond-shaped crispy snack', 'Snacks'),
  ('shakkar pare', 'Shakkar Pare', 'Sweet sugar-coated crispy snack', 'Sweets'),
  ('gulab jamun', 'Gulab Jamun', 'Soft milk balls soaked in rose-scented sugar syrup', 'Sweets'),
  ('barfi', 'Barfi', 'Dense milk-based fudge sweet', 'Sweets'),
  ('peda', 'Peda', 'Soft sweet made from reduced milk and sugar', 'Sweets'),
  ('aam ka achar', 'Mango Pickle (North Indian)', 'Spicy North Indian raw mango pickle with mustard oil', 'Pickles'),
  ('nimbu ka achar', 'Lemon Pickle (North Indian)', 'Tangy preserved lemon pickle', 'Pickles'),
  ('garam masala', 'Garam Masala', 'Aromatic Indian spice blend', 'Spices'),
  ('chaat masala', 'Chaat Masala', 'Tangy spice blend for street food', 'Spices'),
  ('chai masala', 'Chai Masala', 'Spice blend for Indian masala chai tea', 'Spices')
ON CONFLICT (local_name) DO NOTHING;

-- 5. RPC function to increment product view_count atomically
CREATE OR REPLACE FUNCTION public.increment_view_count(p_product_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.products
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_product_id;
$$;
