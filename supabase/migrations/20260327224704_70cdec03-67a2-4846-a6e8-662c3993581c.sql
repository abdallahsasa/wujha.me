CREATE TABLE public.places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  description_ar text NOT NULL,
  description_en text,
  category_id uuid NOT NULL REFERENCES public.categories(id),
  city_id uuid NOT NULL REFERENCES public.cities(id),
  venue_id uuid REFERENCES public.venues(id),
  address_ar text NOT NULL,
  latitude decimal NOT NULL,
  longitude decimal NOT NULL,
  phone text,
  website text,
  whatsapp text,
  instagram text,
  opening_hours jsonb DEFAULT '{}'::jsonb,
  price_range text,
  cover_image text,
  images jsonb DEFAULT '[]'::jsonb,
  tags jsonb DEFAULT '[]'::jsonb,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read places"
  ON public.places FOR SELECT USING (true);