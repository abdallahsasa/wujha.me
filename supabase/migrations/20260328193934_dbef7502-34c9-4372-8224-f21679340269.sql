-- Add auth_id column to users table to link with Supabase Auth
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_id uuid UNIQUE;

-- Allow authenticated users to update their own user record (by auth_id)
CREATE POLICY "Users can update own record"
ON public.users
FOR UPDATE
TO authenticated
USING (auth_id = auth.uid())
WITH CHECK (auth_id = auth.uid());

-- Allow authenticated users to insert into favorites
CREATE POLICY "Users can insert own favorites"
ON public.favorites
FOR INSERT
TO authenticated
WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Allow authenticated users to read own favorites
CREATE POLICY "Users can read own favorites"
ON public.favorites
FOR SELECT
TO authenticated
USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Allow authenticated users to delete own favorites
CREATE POLICY "Users can delete own favorites"
ON public.favorites
FOR DELETE
TO authenticated
USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));