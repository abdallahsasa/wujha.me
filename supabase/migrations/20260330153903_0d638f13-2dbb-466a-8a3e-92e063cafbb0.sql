CREATE POLICY "Authenticated users can insert own tickets"
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );