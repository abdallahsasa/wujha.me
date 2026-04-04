
-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can read own tickets by qr_code" ON public.tickets;

-- Authenticated users can read their own tickets (via users table link)
CREATE POLICY "Users can read own tickets"
ON public.tickets FOR SELECT
TO authenticated
USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Security definer function: lookup a single ticket by its ID (for confirmation page)
CREATE OR REPLACE FUNCTION public.get_ticket_by_id(_ticket_id uuid)
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
  guest_count integer,
  checked_in_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.id, t.guest_name, t.guest_phone, t.qr_code, t.ticket_code,
         t.event_id, t.status, t.payment_status, t.payment_reference,
         t.guest_count, t.checked_in_at, t.created_at
  FROM public.tickets t
  WHERE t.id = _ticket_id;
$$;

-- Security definer function: lookup tickets by guest phone (for MyTickets guest view)
CREATE OR REPLACE FUNCTION public.get_tickets_by_guest(_phone text, _email text DEFAULT '')
RETURNS TABLE(
  id uuid,
  status text,
  qr_code text,
  guest_name text,
  guest_count integer,
  checked_in_at timestamptz,
  created_at timestamptz,
  event_id uuid,
  event_title_ar text,
  event_start_date timestamptz,
  event_cover_image text,
  venue_name_ar text,
  ticket_type_name_ar text,
  ticket_type_price numeric,
  ticket_type_currency text,
  ticket_code text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.id, t.status, t.qr_code, t.guest_name, t.guest_count,
         t.checked_in_at, t.created_at, t.event_id,
         e.title_ar, e.start_date, e.cover_image,
         v.name_ar,
         tt.name_ar, tt.price, tt.currency,
         t.ticket_code
  FROM public.tickets t
  LEFT JOIN public.events e ON e.id = t.event_id
  LEFT JOIN public.venues v ON v.id = e.venue_id
  LEFT JOIN public.ticket_types tt ON tt.id = t.ticket_type_id
  WHERE t.guest_phone = _phone
     OR (_email <> '' AND t.guest_email = _email)
  ORDER BY t.created_at DESC;
$$;
