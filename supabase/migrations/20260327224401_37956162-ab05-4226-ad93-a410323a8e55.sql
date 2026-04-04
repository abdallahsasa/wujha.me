CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  slug text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('event', 'place')),
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories"
  ON public.categories FOR SELECT USING (true);

INSERT INTO public.categories (name_ar, name_en, slug, type, icon, sort_order) VALUES
  ('حفلات', 'Concerts', 'concerts', 'event', '🎵', 1),
  ('مهرجانات', 'Festivals', 'festivals', 'event', '🎪', 2),
  ('حياة ليلية', 'Nightlife', 'nightlife', 'event', '🌙', 3),
  ('عروض ومسرح', 'Shows & Theatre', 'shows-theatre', 'event', '🎭', 4),
  ('معارض', 'Exhibitions', 'exhibitions', 'event', '🖼️', 5),
  ('فعاليات ثقافية', 'Cultural Events', 'cultural-events', 'event', '📚', 6),
  ('رياضة', 'Sports', 'sports', 'event', '⚽', 7);