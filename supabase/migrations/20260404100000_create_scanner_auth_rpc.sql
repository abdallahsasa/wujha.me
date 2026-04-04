-- Enable pgcrypto if it's not already enabled (needed for hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Function to handle creating a new auth user and linking it to their admin profile
-- This function is SECURITY DEFINER so it runs with superuser privileges,
-- allowing it to insert into the auth.users table.
CREATE OR REPLACE FUNCTION public.create_scanner_auth(
  target_email text,
  target_password text,
  target_scanner_id uuid
)
RETURNS json AS $$
DECLARE
  new_user_id uuid;
  caller_id uuid;
  is_admin_check boolean;
BEGIN
  -- 1. Get the ID of the person calling this function
  caller_id := auth.uid();
  
  -- 2. Security Check: Only allow super_admin or admin to call this
  -- We use the existing admin_users table for the check
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE public.admin_users.auth_id = caller_id 
    AND (public.admin_users.role = 'super_admin' OR public.admin_users.role = 'admin')
  ) INTO is_admin_check;

  -- FOR DEVELOPMENT: If you are testing locally without a session, 
  -- you might need to bypass this check manually or ensure you are logged in as admin.
  IF NOT is_admin_check THEN
    -- RAISE EXCEPTION 'Unauthorized: Only admins can create scanner accounts.';
    -- For now, let's just return an error instead of crashing the whole transaction
    RETURN json_build_object('success', false, 'error', 'Unauthorized access');
  END IF;

  -- 3. Check if user already exists in auth.users
  SELECT id INTO new_user_id FROM auth.users WHERE email = target_email;

  IF new_user_id IS NOT NULL THEN
    -- Account already exists, just link it if not linked
    UPDATE public.admin_users
    SET auth_id = new_user_id
    WHERE id = target_scanner_id;
    
    -- If account exists, update password
    UPDATE auth.users 
    SET encrypted_password = extensions.crypt(target_password, extensions.gen_salt('bf'))
    WHERE id = new_user_id;

    RETURN json_build_object('success', true, 'message', 'Scanner account linked and password updated', 'user_id', new_user_id);
  END IF;

  -- 4. Create new user in auth.users
  -- This follows the standard Supabase structure for a new email user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, recovery_sent_at, last_sign_in_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    confirmation_token, email_change, email_change_token_new, recovery_token,
    is_super_admin, phone, phone_confirmed_at, phone_change, phone_change_token, 
    email_change_token_current, email_change_confirm_status, banned_until, 
    reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at,
    is_anonymous
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', 
    gen_random_uuid(), 
    'authenticated', 
    'authenticated', 
    target_email, 
    extensions.crypt(target_password, extensions.gen_salt('bf')), 
    now(), now(), now(), 
    '{"provider":"email","providers":["email"]}', 
    '{}', 
    now(), now(), 
    '', '', '', '',
    false, NULL, NULL, '', '', '', 0, NULL, '', NULL, false, NULL, false
  )
  RETURNING id INTO new_user_id;

  -- 5. Update the public.admin_users record with the new auth_id
  UPDATE public.admin_users 
  SET auth_id = new_user_id 
  WHERE id = target_scanner_id;

  RETURN json_build_object('success', true, 'message', 'Scanner account created successfully', 'user_id', new_user_id);

EXCEPTION WHEN others THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
