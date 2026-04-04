
CREATE OR REPLACE FUNCTION public.is_scanner_or_admin(_auth_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_id = _auth_id AND is_active = true
    AND role IN ('super_admin', 'admin', 'scanner')
  );
$$;

CREATE POLICY "Scanners can update tickets for check-in"
ON public.tickets FOR UPDATE TO authenticated
USING (is_scanner_or_admin(auth.uid()));

CREATE POLICY "Scanners can read event_scanners"
ON public.event_scanners FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_id = auth.uid() AND is_active = true
    AND role IN ('super_admin', 'admin', 'scanner')
  )
);
