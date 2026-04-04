
-- Scanners and admins can read tickets for check-in
CREATE POLICY "Scanners can read tickets"
ON public.tickets FOR SELECT
TO authenticated
USING (is_scanner_or_admin(auth.uid()));
