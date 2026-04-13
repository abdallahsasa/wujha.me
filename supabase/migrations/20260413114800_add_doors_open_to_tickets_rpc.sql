-- Drop existing functions first because return types (TABLE columns) are changing
DROP FUNCTION IF EXISTS public.get_tickets_for_confirmation(uuid);
DROP FUNCTION IF EXISTS public.get_tickets_by_guest(text, text);

-- Update get_tickets_for_confirmation to include event_doors_open
CREATE OR REPLACE FUNCTION public.get_tickets_for_confirmation(_ticket_id uuid)
RETURNS TABLE(
  id uuid,
  guest_name text,
  guest_phone text,
  qr_code text,
  ticket_code text,
  event_id uuid,
  status text,
  payment_status text,
  payment_reference text,
  seating_area text,
  event_title_ar text,
  event_slug text,
  event_code text,
  event_start_date timestamptz,
  event_end_date timestamptz,
  event_doors_open timestamptz,
  event_cover_image text,
  venue_name_ar text,
  venue_address_ar text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _event_id uuid; _guest_phone text;
BEGIN
  SELECT t.event_id, t.guest_phone INTO _event_id, _guest_phone
  FROM public.tickets t WHERE t.id = _ticket_id;
  
  IF _event_id IS NULL THEN RETURN; END IF;
  
  RETURN QUERY
  SELECT t.id, t.guest_name, t.guest_phone, t.qr_code, t.ticket_code,
         t.event_id, t.status, t.payment_status, t.payment_reference, s.seating_area,
         e.title_ar, e.slug, e.event_code, e.start_date, e.end_date, e.doors_open, e.cover_image,
         v.name_ar, v.address_ar
  FROM public.tickets t
  LEFT JOIN public.events e ON e.id = t.event_id
  LEFT JOIN public.venues v ON v.id = e.venue_id
  LEFT JOIN public.sub_organizer_allocations s ON s.id = t.allocation_id
  WHERE t.event_id = _event_id AND t.guest_phone = _guest_phone
  ORDER BY t.created_at;
END; $$;

-- Update get_tickets_by_guest to include event_doors_open
CREATE OR REPLACE FUNCTION public.get_tickets_by_guest(_phone text, _email text DEFAULT '')
RETURNS TABLE(
  id uuid,
  status text,
  qr_code text,
  guest_name text,
  guest_count integer,
  seating_area text,
  checked_in_at timestamptz,
  created_at timestamptz,
  event_id uuid,
  event_title_ar text,
  event_start_date timestamptz,
  event_doors_open timestamptz,
  event_cover_image text,
  venue_name_ar text,
  ticket_type_name_ar text,
  ticket_type_price numeric,
  ticket_type_currency text,
  ticket_code text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.id, t.status, t.qr_code, t.guest_name, t.guest_count, s.seating_area,
         t.checked_in_at, t.created_at, t.event_id,
         e.title_ar, e.start_date, e.doors_open, e.cover_image, v.name_ar,
         tt.name_ar, tt.price, tt.currency, t.ticket_code
  FROM public.tickets t
  LEFT JOIN public.events e ON e.id = t.event_id
  LEFT JOIN public.venues v ON v.id = e.venue_id
  LEFT JOIN public.ticket_types tt ON tt.id = t.ticket_type_id
  LEFT JOIN public.sub_organizer_allocations s ON s.id = t.allocation_id
  WHERE t.guest_phone = _phone OR (_email <> '' AND t.guest_email = _email)
  ORDER BY t.created_at DESC;
$$;
