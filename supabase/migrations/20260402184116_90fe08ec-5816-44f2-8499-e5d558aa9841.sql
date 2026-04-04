DROP POLICY IF EXISTS "Anyone can create tickets" ON public.tickets;
CREATE POLICY "Anyone can create tickets"
ON public.tickets
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read tickets" ON public.tickets;
CREATE POLICY "Anyone can read tickets"
ON public.tickets
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Admins can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can update tickets" ON public.tickets;
CREATE POLICY "Admins can update tickets"
ON public.tickets
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can delete tickets" ON public.tickets;
CREATE POLICY "Admins can delete tickets"
ON public.tickets
FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Anyone can create users" ON public.users;
CREATE POLICY "Anyone can create users"
ON public.users
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read users" ON public.users;
CREATE POLICY "Anyone can read users"
ON public.users
FOR SELECT
TO public
USING (true);