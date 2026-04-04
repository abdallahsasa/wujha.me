
-- Deduplicate users by email: keep the one with auth_id, or the oldest
-- First, update tickets referencing duplicate user IDs to point to the kept user
DO $$
DECLARE
  dup_email TEXT;
  keep_id UUID;
  dup_ids UUID[];
BEGIN
  FOR dup_email IN
    SELECT email FROM users WHERE email IS NOT NULL AND email != '' GROUP BY email HAVING COUNT(*) > 1
  LOOP
    -- Prefer the one with auth_id, otherwise the oldest
    SELECT id INTO keep_id FROM users WHERE email = dup_email ORDER BY (auth_id IS NOT NULL) DESC, created_at ASC LIMIT 1;
    SELECT array_agg(id) INTO dup_ids FROM users WHERE email = dup_email AND id != keep_id;
    
    -- Reassign tickets
    UPDATE tickets SET user_id = keep_id WHERE user_id = ANY(dup_ids);
    -- Reassign favorites
    UPDATE favorites SET user_id = keep_id WHERE user_id = ANY(dup_ids);
    -- Delete duplicates
    DELETE FROM users WHERE id = ANY(dup_ids);
  END LOOP;
END $$;

-- Now add unique partial index for email (only non-null, non-empty)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email) WHERE email IS NOT NULL AND email != '';

-- Add unique partial index for phone (only non-placeholder phones)
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users (phone) WHERE phone IS NOT NULL AND phone NOT LIKE 'no-phone-%';
