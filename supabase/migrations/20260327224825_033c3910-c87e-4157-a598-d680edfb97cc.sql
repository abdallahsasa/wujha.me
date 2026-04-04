CREATE TABLE public.ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text,
  description_ar text,
  price decimal NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SYP',
  quantity_total integer NOT NULL,
  quantity_sold integer NOT NULL DEFAULT 0,
  max_per_order integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sale_start timestamptz,
  sale_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ticket types"
  ON public.ticket_types FOR SELECT USING (true);