-- Add guest_birthday to tickets and users
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS guest_birthday date;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birthday date;

-- Update book_tickets RPC to handle birthday
CREATE OR REPLACE FUNCTION public.book_tickets(_tickets jsonb)
RETURNS SETOF public.tickets AS $$
DECLARE
    ticket_record jsonb;
    new_ticket_id uuid;
BEGIN
    FOR ticket_record IN SELECT * FROM jsonb_array_elements(_tickets)
    LOOP
        INSERT INTO public.tickets (
            event_id,
            ticket_type_id,
            allocation_id,
            user_id,
            guest_name,
            guest_phone,
            guest_email,
            guest_birthday,
            guest_count,
            qr_code,
            status,
            payment_status,
            payment_method,
            payment_reference,
            payment_amount
        ) VALUES (
            (ticket_record->>'event_id')::uuid,
            (ticket_record->>'ticket_type_id')::uuid,
            (ticket_record->>'allocation_id')::uuid,
            (ticket_record->>'user_id')::uuid,
            ticket_record->>'guest_name',
            ticket_record->>'guest_phone',
            ticket_record->>'guest_email',
            (ticket_record->>'guest_birthday')::date,
            (ticket_record->>'guest_count')::integer,
            ticket_record->>'qr_code',
            ticket_record->>'status',
            ticket_record->>'payment_status',
            ticket_record->>'payment_method',
            ticket_record->>'payment_reference',
            (ticket_record->>'payment_amount')::numeric
        )
        RETURNING id INTO new_ticket_id;
        
        RETURN NEXT (SELECT * FROM public.tickets WHERE id = new_ticket_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
