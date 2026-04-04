
-- Create organizer_applications table
CREATE TABLE public.organizer_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'pending',
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  admin_notes text,
  reviewed_by uuid REFERENCES public.admin_users(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizer_applications ENABLE ROW LEVEL SECURITY;

-- Users can read their own applications
CREATE POLICY "Users can read own applications"
  ON public.organizer_applications
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- Users can insert their own applications
CREATE POLICY "Users can insert own applications"
  ON public.organizer_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = auth.uid());

-- Admins can read all applications
CREATE POLICY "Admins can read all applications"
  ON public.organizer_applications
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Admins can update applications
CREATE POLICY "Admins can update applications"
  ON public.organizer_applications
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Storage bucket for organizer documents
INSERT INTO storage.buckets (id, name, public) VALUES ('organizer-documents', 'organizer-documents', false);

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload own documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'organizer-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can read their own documents
CREATE POLICY "Users can read own documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'organizer-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can read all documents
CREATE POLICY "Admins can read all organizer documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'organizer-documents' AND is_admin(auth.uid()));
