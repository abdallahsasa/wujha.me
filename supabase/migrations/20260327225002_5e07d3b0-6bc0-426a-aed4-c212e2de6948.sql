ALTER TABLE public.organizers ADD COLUMN is_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.organizers DROP COLUMN IF EXISTS description_en;
ALTER TABLE public.organizers DROP COLUMN IF EXISTS updated_at;