CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text,
  city_id uuid REFERENCES public.cities(id),
  is_active boolean NOT NULL DEFAULT true,
  total_events_attended integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read users"
  ON public.users FOR SELECT USING (true);

CREATE POLICY "Anyone can insert users"
  ON public.users FOR INSERT WITH CHECK (true);