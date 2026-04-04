
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  subject_ar text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read email_templates" ON public.email_templates
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert email_templates" ON public.email_templates
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update email_templates" ON public.email_templates
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete email_templates" ON public.email_templates
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Service role can read email_templates" ON public.email_templates
  FOR SELECT TO public USING (auth.role() = 'service_role');
