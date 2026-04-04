INSERT INTO storage.buckets (id, name, public) VALUES ('event-covers', 'event-covers', true);

CREATE POLICY "Anyone can read event covers" ON storage.objects FOR SELECT USING (bucket_id = 'event-covers');
CREATE POLICY "Admins can upload event covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-covers' AND (SELECT public.is_admin(auth.uid())));
CREATE POLICY "Admins can update event covers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'event-covers' AND (SELECT public.is_admin(auth.uid())));
CREATE POLICY "Admins can delete event covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'event-covers' AND (SELECT public.is_admin(auth.uid())));