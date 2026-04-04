
ALTER TABLE public.ticket_types ADD COLUMN price_usd numeric DEFAULT NULL;
ALTER TABLE public.ticket_types ADD COLUMN price_new_syp numeric DEFAULT NULL;
ALTER TABLE public.ticket_types ADD COLUMN price_old_syp numeric DEFAULT NULL;
