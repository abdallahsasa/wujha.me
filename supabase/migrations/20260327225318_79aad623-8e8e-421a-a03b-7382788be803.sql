CREATE TABLE public.page_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL UNIQUE,
  title_ar text,
  title_en text,
  content_ar text NOT NULL,
  content_en text,
  image text,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_users(id)
);

ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read page content"
  ON public.page_content FOR SELECT USING (true);