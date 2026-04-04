-- Allow organizers to read their own events
CREATE POLICY "Organizers can read own events"
ON public.events
FOR SELECT
TO authenticated
USING (
  organizer_id IN (
    SELECT organizer_id FROM public.admin_users
    WHERE auth_id = auth.uid() AND is_active = true AND role = 'organizer'
  )
);

-- Allow organizers to update their own events
CREATE POLICY "Organizers can update own events"
ON public.events
FOR UPDATE
TO authenticated
USING (
  organizer_id IN (
    SELECT organizer_id FROM public.admin_users
    WHERE auth_id = auth.uid() AND is_active = true AND role = 'organizer'
  )
);

-- Allow organizers to insert events (linked to their organizer_id)
CREATE POLICY "Organizers can insert events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  organizer_id IN (
    SELECT organizer_id FROM public.admin_users
    WHERE auth_id = auth.uid() AND is_active = true AND role = 'organizer'
  )
);

-- Allow organizers to read tickets for their events
CREATE POLICY "Organizers can read own event tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM public.events e
    INNER JOIN public.admin_users au ON au.organizer_id = e.organizer_id
    WHERE au.auth_id = auth.uid() AND au.is_active = true AND au.role = 'organizer'
  )
);

-- Allow organizers to insert tickets for their events
CREATE POLICY "Organizers can insert own event tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  event_id IN (
    SELECT e.id FROM public.events e
    INNER JOIN public.admin_users au ON au.organizer_id = e.organizer_id
    WHERE au.auth_id = auth.uid() AND au.is_active = true AND au.role = 'organizer'
  )
);

-- Allow organizers to update tickets for their events
CREATE POLICY "Organizers can update own event tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM public.events e
    INNER JOIN public.admin_users au ON au.organizer_id = e.organizer_id
    WHERE au.auth_id = auth.uid() AND au.is_active = true AND au.role = 'organizer'
  )
);

-- Allow organizers to manage ticket_types for their events
CREATE POLICY "Organizers can read own ticket_types"
ON public.ticket_types
FOR SELECT
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM public.events e
    INNER JOIN public.admin_users au ON au.organizer_id = e.organizer_id
    WHERE au.auth_id = auth.uid() AND au.is_active = true AND au.role = 'organizer'
  )
);

CREATE POLICY "Organizers can insert own ticket_types"
ON public.ticket_types
FOR INSERT
TO authenticated
WITH CHECK (
  event_id IN (
    SELECT e.id FROM public.events e
    INNER JOIN public.admin_users au ON au.organizer_id = e.organizer_id
    WHERE au.auth_id = auth.uid() AND au.is_active = true AND au.role = 'organizer'
  )
);

CREATE POLICY "Organizers can update own ticket_types"
ON public.ticket_types
FOR UPDATE
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM public.events e
    INNER JOIN public.admin_users au ON au.organizer_id = e.organizer_id
    WHERE au.auth_id = auth.uid() AND au.is_active = true AND au.role = 'organizer'
  )
);

-- Allow organizers to manage event_scanners for their events
CREATE POLICY "Organizers can manage own event_scanners"
ON public.event_scanners
FOR ALL
TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM public.events e
    INNER JOIN public.admin_users au ON au.organizer_id = e.organizer_id
    WHERE au.auth_id = auth.uid() AND au.is_active = true AND au.role = 'organizer'
  )
)
WITH CHECK (
  event_id IN (
    SELECT e.id FROM public.events e
    INNER JOIN public.admin_users au ON au.organizer_id = e.organizer_id
    WHERE au.auth_id = auth.uid() AND au.is_active = true AND au.role = 'organizer'
  )
);

-- Allow organizers to insert venues (for admin approval)
CREATE POLICY "Organizers can insert venues"
ON public.venues
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_id = auth.uid() AND is_active = true AND role = 'organizer'
  )
);

-- Allow organizers to read their own organizer profile
CREATE POLICY "Organizers can update own profile"
ON public.organizers
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT organizer_id FROM public.admin_users
    WHERE auth_id = auth.uid() AND is_active = true AND role = 'organizer'
  )
);