CREATE TABLE public.organizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  description_ar text,
  description_en text,
  logo text,
  phone text,
  email text,
  website text,
  instagram text,
  whatsapp text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read organizers"
  ON public.organizers FOR SELECT USING (true);

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  title_en text,
  description_ar text NOT NULL,
  description_en text,
  short_description_ar text NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id),
  city_id uuid NOT NULL REFERENCES public.cities(id),
  venue_id uuid REFERENCES public.venues(id),
  organizer_id uuid REFERENCES public.organizers(id),
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  doors_open timestamptz,
  cover_image text,
  images jsonb DEFAULT '[]'::jsonb,
  video_url text,
  is_free boolean NOT NULL DEFAULT false,
  is_invitation_only boolean NOT NULL DEFAULT false,
  min_price decimal,
  max_price decimal,
  currency text NOT NULL DEFAULT 'SYP',
  age_restriction text,
  dress_code text,
  terms_ar text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'past')),
  is_featured boolean NOT NULL DEFAULT false,
  max_capacity integer,
  total_tickets_sold integer NOT NULL DEFAULT 0,
  share_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published events"
  ON public.events FOR SELECT USING (true);