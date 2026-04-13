-- Update foreign key constraints to allow deleting admin/sub-organizer users
-- Fix notifications
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_recipient_admin_id_fkey,
ADD CONSTRAINT notifications_recipient_admin_id_fkey
  FOREIGN KEY (recipient_admin_id)
  REFERENCES public.admin_users(id)
  ON DELETE CASCADE;

-- Fix organizer_applications
ALTER TABLE public.organizer_applications
DROP CONSTRAINT IF EXISTS organizer_applications_reviewed_by_fkey,
ADD CONSTRAINT organizer_applications_reviewed_by_fkey
  FOREIGN KEY (reviewed_by)
  REFERENCES public.admin_users(id)
  ON DELETE SET NULL;

-- Fix page_content
ALTER TABLE public.page_content
DROP CONSTRAINT IF EXISTS page_content_updated_by_fkey,
ADD CONSTRAINT page_content_updated_by_fkey
  FOREIGN KEY (updated_by)
  REFERENCES public.admin_users(id)
  ON DELETE SET NULL;

-- Fix email_templates
ALTER TABLE public.email_templates
DROP CONSTRAINT IF EXISTS email_templates_updated_by_fkey,
ADD CONSTRAINT email_templates_updated_by_fkey
  FOREIGN KEY (updated_by)
  REFERENCES public.admin_users(id)
  ON DELETE SET NULL;
