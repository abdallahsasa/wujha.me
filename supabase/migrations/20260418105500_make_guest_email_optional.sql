-- Make guest_email column optional in public.tickets table
ALTER TABLE public.tickets ALTER COLUMN guest_email DROP NOT NULL;
