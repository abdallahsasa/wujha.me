CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text NOT NULL,
  description_en text,
  address_ar text NOT NULL,
  city_id uuid NOT NULL REFERENCES public.cities(id),
  latitude decimal NOT NULL,
  longitude decimal NOT NULL,
  phone text,
  website text,
  whatsapp text,
  instagram text,
  cover_image text,
  images jsonb DEFAULT '[]'::jsonb,
  capacity integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read venues"
  ON public.venues FOR SELECT USING (true);