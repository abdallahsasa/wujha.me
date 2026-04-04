
-- Create a SECURITY DEFINER function for booking tickets
-- This allows both anonymous and authenticated users to create tickets
CREATE OR REPLACE FUNCTION public.book_tickets(
  _tickets jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
  _ticket record;
  _inserted_ids jsonb := '[]'::jsonb;
  _row record;
BEGIN
  FOR _ticket IN SELECT * FROM jsonb_array_elements(_tickets)
  LOOP
    INSERT INTO public.tickets (
      event_id, ticket_type_id, user_id,
      guest_name, guest_phone, guest_email,
      qr_code, status, payment_status,
      payment_method, payment_reference, payment_amount
    ) VALUES (
      (_ticket.value->>'event_id')::uuid,
      (_ticket.value->>'ticket_type_id')::uuid,
      CASE WHEN _ticket.value->>'user_id' IS NOT NULL THEN (_ticket.value->>'user_id')::uuid ELSE NULL END,
      _ticket.value->>'guest_name',
      _ticket.value->>'guest_phone',
      _ticket.value->>'guest_email',
      _ticket.value->>'qr_code',
      _ticket.value->>'status',
      _ticket.value->>'payment_status',
      _ticket.value->>'payment_method',
      _ticket.value->>'payment_reference',
      CASE WHEN _ticket.value->>'payment_amount' IS NOT NULL THEN (_ticket.value->>'payment_amount')::numeric ELSE 0 END
    )
    RETURNING jsonb_build_object('id', id, 'qr_code', qr_code) INTO _result;
    
    _inserted_ids := _inserted_ids || _result;
  END LOOP;
  
  RETURN _inserted_ids;
END;
$$;
