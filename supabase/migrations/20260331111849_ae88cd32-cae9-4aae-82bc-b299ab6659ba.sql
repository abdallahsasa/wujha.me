
-- Create contact_messages table
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a contact message
CREATE POLICY "Anyone can insert contact_messages" ON public.contact_messages
  FOR INSERT TO public WITH CHECK (true);

-- Admins can read all contact messages
CREATE POLICY "Admins can read contact_messages" ON public.contact_messages
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Admins can update contact messages (mark read)
CREATE POLICY "Admins can update contact_messages" ON public.contact_messages
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- Admins can delete contact messages
CREATE POLICY "Admins can delete contact_messages" ON public.contact_messages
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Seed terms and privacy page_content if not exists
INSERT INTO public.page_content (page_key, content_ar, title_ar)
VALUES
  ('terms', 'سيتم تحديث الشروط والأحكام قريباً.', 'الشروط والأحكام'),
  ('privacy', 'سيتم تحديث سياسة الخصوصية قريباً.', 'سياسة الخصوصية')
ON CONFLICT DO NOTHING;
