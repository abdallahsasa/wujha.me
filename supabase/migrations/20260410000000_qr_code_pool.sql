-- Create qr_code_pool table
CREATE TABLE IF NOT EXISTS public.qr_code_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  is_used boolean DEFAULT false,
  assigned_ticket_id uuid REFERENCES public.tickets(id),
  created_at timestamptz DEFAULT now(),
  used_at timestamptz
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_qr_code_pool_event_unused ON public.qr_code_pool(event_id) WHERE is_used = false;

-- RLS
ALTER TABLE public.qr_code_pool ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy: Admins can manage, Anyone can read (for scans/verification if needed)
CREATE POLICY "Admins can manage qr_code_pool" ON public.qr_code_pool FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND role IN ('super_admin', 'admin')));

CREATE POLICY "Anyone can read codes" ON public.qr_code_pool FOR SELECT TO public USING (true);

-- RPC to generate pool
CREATE OR REPLACE FUNCTION public.generate_qr_code_pool(_event_id uuid, _count integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _slug text;
  _i integer;
  _random_suffix text;
  _full_code text;
BEGIN
  -- Get event slug
  SELECT slug INTO _slug FROM public.events WHERE id = _event_id;
  IF _slug IS NULL OR _slug = '' THEN
    _slug := 'event';
  END IF;

  FOR _i IN 1.._count LOOP
    LOOP
      -- Generate 6 char random suffix
      _random_suffix := lower(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      _full_code := _slug || '-' || _random_suffix;
      
      -- Ensure uniqueness (unlikely to collide but good practice)
      IF NOT EXISTS (SELECT 1 FROM public.qr_code_pool WHERE code = _full_code) THEN
        INSERT INTO public.qr_code_pool (event_id, code) VALUES (_event_id, _full_code);
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END; $$;

-- Update book_tickets RPC to use pool
CREATE OR REPLACE FUNCTION public.book_tickets(_tickets jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE 
  _result jsonb; 
  _ticket jsonb; 
  _inserted_ids jsonb := '[]'::jsonb;
  _new_id uuid;
  _qr_code text;
  _event_id uuid;
BEGIN
  FOR _ticket IN SELECT * FROM jsonb_array_elements(_tickets) LOOP
    _event_id := (_ticket->>'event_id')::uuid;
    
    -- Pick a QR code from the pool
    UPDATE public.qr_code_pool 
    SET is_used = true, used_at = now()
    WHERE id = (
      SELECT id FROM public.qr_code_pool 
      WHERE event_id = _event_id AND is_used = false 
      LIMIT 1 
      FOR UPDATE SKIP LOCKED
    )
    RETURNING code INTO _qr_code;

    -- If no QR code available, throw error
    IF _qr_code IS NULL THEN
      RAISE EXCEPTION 'No QR codes available for this event. Capacity reached.';
    END IF;
    
    INSERT INTO public.tickets (
      event_id, ticket_type_id, allocation_id, user_id, guest_name, guest_phone, guest_email,
      guest_birthday, qr_code, status, payment_status, payment_method, payment_reference, payment_amount
    ) VALUES (
      _event_id, 
      (_ticket->>'ticket_type_id')::uuid,
      (_ticket->>'allocation_id')::uuid,
      (_ticket->>'user_id')::uuid,
      (_ticket->>'guest_name'), 
      (_ticket->>'guest_phone'), 
      (_ticket->>'guest_email'),
      (_ticket->>'guest_birthday')::date,
      _qr_code, 
      (_ticket->>'status'), 
      (_ticket->>'payment_status'),
      (_ticket->>'payment_method'), 
      (_ticket->>'payment_reference'),
      COALESCE((_ticket->>'payment_amount')::numeric, 0)
    ) RETURNING id INTO _new_id;
    
    -- Update pool entry with the assigned ticket id
    UPDATE public.qr_code_pool SET assigned_ticket_id = _new_id WHERE code = _qr_code;

    -- Increment allocation count if applicable
    IF (_ticket->>'allocation_id') IS NOT NULL THEN
      UPDATE public.sub_organizer_allocations 
      SET used_count = used_count + 1 
      WHERE id = (_ticket->>'allocation_id')::uuid;
    END IF;

    _inserted_ids := _inserted_ids || jsonb_build_object('id', _new_id, 'qr_code', _qr_code);
  END LOOP;
  RETURN _inserted_ids;
END; $$;
