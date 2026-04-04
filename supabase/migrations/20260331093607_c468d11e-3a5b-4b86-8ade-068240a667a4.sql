
-- Add slug columns to events and places
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS slug text;

-- Function to generate URL-safe slug from title (supports Arabic)
CREATE OR REPLACE FUNCTION public.generate_slug_from_title(title text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  base_slug text;
BEGIN
  base_slug := regexp_replace(trim(title), '[^[:alpha:][:digit:]-]', '-', 'g');
  base_slug := regexp_replace(base_slug, '-{2,}', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN
    base_slug := 'item';
  END IF;
  RETURN base_slug;
END;
$$;

-- Trigger function for events
CREATE OR REPLACE FUNCTION public.generate_event_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.generate_slug_from_title(NEW.title_ar);
    final_slug := base_slug;
    LOOP
      IF NOT EXISTS (SELECT 1 FROM public.events WHERE slug = final_slug AND id != NEW.id) THEN
        EXIT;
      END IF;
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function for places
CREATE OR REPLACE FUNCTION public.generate_place_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.generate_slug_from_title(NEW.name_ar);
    final_slug := base_slug;
    LOOP
      IF NOT EXISTS (SELECT 1 FROM public.places WHERE slug = final_slug AND id != NEW.id) THEN
        EXIT;
      END IF;
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER set_event_slug BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.generate_event_slug();

CREATE TRIGGER set_place_slug BEFORE INSERT OR UPDATE ON public.places
FOR EACH ROW EXECUTE FUNCTION public.generate_place_slug();

-- Populate existing rows
DO $$
DECLARE
  r RECORD;
  base_slug text;
  final_slug text;
  counter int;
BEGIN
  FOR r IN SELECT id, title_ar FROM public.events WHERE slug IS NULL OR slug = '' ORDER BY created_at LOOP
    base_slug := public.generate_slug_from_title(r.title_ar);
    final_slug := base_slug;
    counter := 0;
    LOOP
      IF NOT EXISTS (SELECT 1 FROM public.events WHERE slug = final_slug AND id != r.id) THEN
        EXIT;
      END IF;
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    UPDATE public.events SET slug = final_slug WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id, name_ar FROM public.places WHERE slug IS NULL OR slug = '' ORDER BY created_at LOOP
    base_slug := public.generate_slug_from_title(r.name_ar);
    final_slug := base_slug;
    counter := 0;
    LOOP
      IF NOT EXISTS (SELECT 1 FROM public.places WHERE slug = final_slug AND id != r.id) THEN
        EXIT;
      END IF;
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    UPDATE public.places SET slug = final_slug WHERE id = r.id;
  END LOOP;
END;
$$;

-- Add constraints after population
ALTER TABLE public.events ALTER COLUMN slug SET DEFAULT '';
ALTER TABLE public.places ALTER COLUMN slug SET DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS events_slug_unique ON public.events(slug);
CREATE UNIQUE INDEX IF NOT EXISTS places_slug_unique ON public.places(slug);
