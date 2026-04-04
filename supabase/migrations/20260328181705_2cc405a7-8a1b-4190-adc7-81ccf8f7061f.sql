ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_user_id_fkey;
ALTER TABLE public.tickets 
  ADD CONSTRAINT tickets_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;