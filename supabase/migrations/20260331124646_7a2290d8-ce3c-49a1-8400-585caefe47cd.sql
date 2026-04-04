
-- RPC for confirmation page: get all tickets for a guest in an event, anchored by a ticket ID
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
  event_title_ar text,
  event_slug text,
  event_code text,
  event_start_date timestamptz,
  event_end_date timestamptz,
  event_cover_image text,
  venue_name_ar text,
  venue_address_ar text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _event_id uuid;
  _guest_phone text;
BEGIN
  SELECT t.event_id, t.guest_phone INTO _event_id, _guest_phone
  FROM public.tickets t WHERE t.id = _ticket_id;
  
  IF _event_id IS NULL THEN RETURN; END IF;
  
  RETURN QUERY
  SELECT t.id, t.guest_name, t.guest_phone, t.qr_code, t.ticket_code,
         t.event_id, t.status, t.payment_status, t.payment_reference,
         e.title_ar, e.slug, e.event_code, e.start_date, e.end_date, e.cover_image,
         v.name_ar, v.address_ar
  FROM public.tickets t
  LEFT JOIN public.events e ON e.id = t.event_id
  LEFT JOIN public.venues v ON v.id = e.venue_id
  WHERE t.event_id = _event_id AND t.guest_phone = _guest_phone
  ORDER BY t.created_at;
END;
$$;
