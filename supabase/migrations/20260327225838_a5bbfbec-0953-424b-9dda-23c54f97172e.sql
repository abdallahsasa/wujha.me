-- Add auth_id to admin_users to link with Supabase Auth
ALTER TABLE public.admin_users ADD COLUMN auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- Security definer function to get admin user by auth id (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_admin_user_by_auth_id(_auth_id uuid)
RETURNS SETOF public.admin_users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.admin_users WHERE auth_id = _auth_id AND is_active = true LIMIT 1;
$$;

-- RLS: authenticated users can read their own admin_users row
CREATE POLICY "Admins can read own row"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- NEW POLICY: Super admins and admins can view all admin users (for scanners list)
CREATE POLICY "Super admins can view all admin users"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Admin role check function
CREATE OR REPLACE FUNCTION public.is_admin(_auth_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_id = _auth_id
      AND is_active = true
      AND role IN ('super_admin', 'admin')
  );
$$;

-- Admin write policies for content tables
CREATE POLICY "Admins can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert places" ON public.places FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update places" ON public.places FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete places" ON public.places FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert venues" ON public.venues FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update venues" ON public.venues FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete venues" ON public.venues FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert cities" ON public.cities FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update cities" ON public.cities FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete cities" ON public.cities FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert organizers" ON public.organizers FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update organizers" ON public.organizers FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete organizers" ON public.organizers FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert ticket_types" ON public.ticket_types FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update ticket_types" ON public.ticket_types FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete ticket_types" ON public.ticket_types FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update tickets" ON public.tickets FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete tickets" ON public.tickets FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert admin_users" ON public.admin_users FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update admin_users" ON public.admin_users FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete admin_users" ON public.admin_users FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert page_content" ON public.page_content FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update page_content" ON public.page_content FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete page_content" ON public.page_content FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert event_scanners" ON public.event_scanners FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update event_scanners" ON public.event_scanners FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete event_scanners" ON public.event_scanners FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can select event_scanners" ON public.event_scanners FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage users" ON public.users FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete users" ON public.users FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage favorites" ON public.favorites FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete favorites" ON public.favorites FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));