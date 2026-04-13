-- Fix foreign key constraint to allow deleting allocations by unlinking tickets instead of blocking
ALTER TABLE public.tickets
DROP CONSTRAINT IF EXISTS tickets_allocation_id_fkey,
ADD CONSTRAINT tickets_allocation_id_fkey
  FOREIGN KEY (allocation_id)
  REFERENCES public.sub_organizer_allocations(id)
  ON DELETE SET NULL;
