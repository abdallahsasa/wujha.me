
-- Drop the overly restrictive authenticated INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert own tickets" ON public.tickets;

-- Create a broader INSERT policy for authenticated users
CREATE POLICY "Authenticated users can insert tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create a security definer function to safely increment quantity_sold
-- This avoids the need for non-admin users to have UPDATE on ticket_types
CREATE OR REPLACE FUNCTION public.increment_ticket_quantity_sold(_ticket_type_id uuid, _count integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ticket_types
  SET quantity_sold = quantity_sold + _count
  WHERE id = _ticket_type_id;
END;
$$;
