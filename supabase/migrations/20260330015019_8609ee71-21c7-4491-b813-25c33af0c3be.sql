
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_admin_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  reference_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    recipient_admin_id IN (
      SELECT id FROM public.admin_users WHERE auth_id = auth.uid() AND is_active = true
    )
  );

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    recipient_admin_id IN (
      SELECT id FROM public.admin_users WHERE auth_id = auth.uid() AND is_active = true
    )
  );

-- Authenticated users can insert notifications (for creating alerts)
CREATE POLICY "Authenticated can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
