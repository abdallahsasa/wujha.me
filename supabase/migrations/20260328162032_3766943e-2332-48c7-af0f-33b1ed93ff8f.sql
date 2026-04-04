CREATE POLICY "Anyone can insert tickets" ON storage.objects FOR INSERT TO anon WITH CHECK (false);

-- Allow public/anonymous users to insert tickets (for guest registration)
CREATE POLICY "Public can insert tickets"
ON public.tickets
FOR INSERT
TO anon
WITH CHECK (true);
