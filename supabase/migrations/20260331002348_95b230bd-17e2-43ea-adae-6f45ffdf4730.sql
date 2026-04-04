
-- Add event_code column
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_code text UNIQUE;

-- Add ticket_code column  
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_code text;

-- Create sequence for event codes
CREATE SEQUENCE IF NOT EXISTS public.event_code_seq START 1;

-- Function to auto-generate event_code on insert
CREATE OR REPLACE FUNCTION public.generate_event_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.event_code IS NULL OR NEW.event_code = '' THEN
    NEW.event_code := 'EVT-' || LPAD(nextval('public.event_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for events
DROP TRIGGER IF EXISTS trg_generate_event_code ON public.events;
CREATE TRIGGER trg_generate_event_code
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_event_code();

-- Function to auto-generate ticket_code on insert
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  evt_code text;
  ticket_seq int;
BEGIN
  IF NEW.ticket_code IS NULL OR NEW.ticket_code = '' THEN
    SELECT event_code INTO evt_code FROM public.events WHERE id = NEW.event_id;
    IF evt_code IS NULL THEN
      evt_code := 'EVT-0000';
    END IF;
    SELECT COALESCE(MAX(
      CASE WHEN ticket_code LIKE 'TKT-%-____' 
        THEN NULLIF(RIGHT(ticket_code, 4), '')::int 
        ELSE 0 END
    ), 0) + 1 INTO ticket_seq
    FROM public.tickets WHERE event_id = NEW.event_id AND ticket_code IS NOT NULL;
    NEW.ticket_code := 'TKT-' || SUBSTRING(evt_code FROM 5) || '-' || LPAD(ticket_seq::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for tickets
DROP TRIGGER IF EXISTS trg_generate_ticket_code ON public.tickets;
CREATE TRIGGER trg_generate_ticket_code
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ticket_code();

-- Backfill existing events that have no event_code
UPDATE public.events SET event_code = 'EVT-' || LPAD(nextval('public.event_code_seq')::text, 4, '0') WHERE event_code IS NULL;
