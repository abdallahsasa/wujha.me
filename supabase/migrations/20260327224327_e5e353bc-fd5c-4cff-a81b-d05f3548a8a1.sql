CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  slug text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cities"
  ON public.cities FOR SELECT USING (true);

INSERT INTO public.cities (name_ar, name_en, slug, is_active, sort_order) VALUES
  ('دمشق', 'Damascus', 'damascus', true, 1),
  ('حلب', 'Aleppo', 'aleppo', false, 2),
  ('حماة', 'Hama', 'hama', false, 3),
  ('اللاذقية', 'Latakia', 'latakia', false, 4),
  ('حمص', 'Homs', 'homs', false, 5);