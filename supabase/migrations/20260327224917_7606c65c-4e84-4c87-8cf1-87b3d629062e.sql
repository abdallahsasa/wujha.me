CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id),
  ticket_type_id uuid NOT NULL REFERENCES public.ticket_types(id),
  user_id uuid REFERENCES auth.users(id),
  guest_name text NOT NULL,
  guest_phone text NOT NULL,
  guest_email text NOT NULL,
  guest_count integer NOT NULL DEFAULT 1,
  qr_code text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  qr_image_url text,
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'checked_in', 'cancelled', 'expired')),
  checked_in_at timestamptz,
  checked_in_by uuid,
  payment_status text NOT NULL DEFAULT 'free' CHECK (payment_status IN ('free', 'pending', 'paid', 'refunded')),
  payment_method text,
  payment_reference text,
  payment_amount decimal,
  notes text,
  invitation_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read own tickets by qr_code"
  ON public.tickets FOR SELECT USING (true);