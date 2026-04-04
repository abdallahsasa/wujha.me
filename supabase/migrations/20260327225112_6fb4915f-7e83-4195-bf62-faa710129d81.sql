CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'scanner' CHECK (role IN ('super_admin', 'admin', 'organizer', 'scanner')),
  phone text,
  organizer_id uuid REFERENCES public.organizers(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_checked_in_by_fkey
  FOREIGN KEY (checked_in_by) REFERENCES public.admin_users(id);