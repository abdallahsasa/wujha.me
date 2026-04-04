-- Function to handle linking a new auth user to their admin profile
CREATE OR REPLACE FUNCTION public.handle_new_admin_user_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Update public.admin_users if a match is found by email
  UPDATE public.admin_users
  SET auth_id = NEW.id
  WHERE email = NEW.email
  AND auth_id IS NULL; -- Only link if not already linked
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run on every new user creation in auth.users
-- Note: We apply it to the auth.users table via a handle in the public or extensions schema 
-- or directly if supported by the environment. 
-- In Supabase, we can't always create triggers on auth.users directly via standard SQL files 
-- unless it's done through the dashboard or a migration specifically targeting it.
-- We'll try common syntax for Supabase migrations.

DROP TRIGGER IF EXISTS on_auth_user_created_link ON auth.users;
CREATE TRIGGER on_auth_user_created_link
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin_user_link();
