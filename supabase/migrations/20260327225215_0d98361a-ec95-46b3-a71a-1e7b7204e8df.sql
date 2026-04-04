CREATE TABLE public.event_scanners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  entry_point text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, admin_user_id)
);

ALTER TABLE public.event_scanners ENABLE ROW LEVEL SECURITY;