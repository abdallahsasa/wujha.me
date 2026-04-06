-- ============================================================
-- Full Schema Migration — generated 2026-04-04
-- Recreates all tables, indexes, functions, triggers & RLS
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. Extensions
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- 1. Sequences
-- ────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.event_code_seq START 1;

-- ────────────────────────────────────────────────────────────
-- 2. Tables
-- ────────────────────────────────────────────────────────────

-- cities
CREATE TABLE IF NOT EXISTS public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  slug text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  slug text NOT NULL,
  icon text,
  type text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- organizers
CREATE TABLE IF NOT EXISTS public.organizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  description_ar text,
  logo text,
  phone text,
  email text,
  website text,
  instagram text,
  whatsapp text,
  is_active boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- admin_users
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'scanner',
  organizer_id uuid REFERENCES public.organizers(id),
  auth_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- venues
CREATE TABLE IF NOT EXISTS public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text NOT NULL,
  description_en text,
  address_ar text NOT NULL,
  city_id uuid NOT NULL REFERENCES public.cities(id),
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  capacity integer,
  cover_image text,
  images jsonb DEFAULT '[]'::jsonb,
  phone text,
  website text,
  instagram text,
  whatsapp text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- events
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  title_en text,
  description_ar text NOT NULL,
  description_en text,
  short_description_ar text NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id),
  city_id uuid NOT NULL REFERENCES public.cities(id),
  venue_id uuid REFERENCES public.venues(id),
  organizer_id uuid REFERENCES public.organizers(id),
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  doors_open timestamptz,
  cover_image text,
  hero_video text,
  hero_thumbnail text,
  images jsonb DEFAULT '[]'::jsonb,
  video_url text,
  slug text DEFAULT '',
  event_code text,
  share_url text,
  status text NOT NULL DEFAULT 'draft',
  is_featured boolean NOT NULL DEFAULT false,
  is_free boolean NOT NULL DEFAULT false,
  is_invitation_only boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  currency text NOT NULL DEFAULT 'SYP',
  min_price numeric,
  max_price numeric,
  max_capacity integer,
  total_tickets_sold integer NOT NULL DEFAULT 0,
  age_restriction text,
  dress_code text,
  terms_ar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ticket_types
CREATE TABLE IF NOT EXISTS public.ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id),
  name_ar text NOT NULL,
  name_en text,
  description_ar text,
  price numeric NOT NULL DEFAULT 0,
  price_usd numeric,
  price_old_syp numeric,
  price_new_syp numeric,
  currency text NOT NULL DEFAULT 'SYP',
  quantity_total integer NOT NULL,
  quantity_sold integer NOT NULL DEFAULT 0,
  max_per_order integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sale_start timestamptz,
  sale_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- users (public users / guests)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  auth_id uuid,
  city_id uuid REFERENCES public.cities(id),
  is_active boolean NOT NULL DEFAULT true,
  total_events_attended integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- sub_organizer_allocations
CREATE TABLE IF NOT EXISTS public.sub_organizer_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sub_organizer_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  ticket_type_id uuid NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  quota integer NOT NULL DEFAULT 0,
  used_count integer NOT NULL DEFAULT 0,
  seating_area text,
  unique_slug text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- tickets
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id),
  ticket_type_id uuid NOT NULL REFERENCES public.ticket_types(id),
  allocation_id uuid REFERENCES public.sub_organizer_allocations(id),
  user_id uuid REFERENCES public.users(id),
  guest_name text NOT NULL,
  guest_phone text NOT NULL,
  guest_email text NOT NULL,
  guest_count integer NOT NULL DEFAULT 1,
  qr_code text,
  qr_image_url text,
  ticket_code text,
  status text NOT NULL DEFAULT 'valid',
  payment_status text NOT NULL DEFAULT 'free',
  payment_method text,
  payment_reference text,
  payment_amount numeric,
  notes text,
  invitation_sent boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz,
  checked_in_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  event_id uuid REFERENCES public.events(id),
  place_id uuid, -- FK added after places table
  created_at timestamptz NOT NULL DEFAULT now()
);

-- places
CREATE TABLE IF NOT EXISTS public.places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  description_ar text NOT NULL,
  description_en text,
  address_ar text NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id),
  city_id uuid NOT NULL REFERENCES public.cities(id),
  venue_id uuid REFERENCES public.venues(id),
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  cover_image text,
  images jsonb DEFAULT '[]'::jsonb,
  tags jsonb DEFAULT '[]'::jsonb,
  opening_hours jsonb DEFAULT '{}'::jsonb,
  price_range text,
  phone text,
  website text,
  instagram text,
  whatsapp text,
  slug text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  average_rating numeric,
  total_reviews integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- add FK from favorites to places
ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id);

-- reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id),
  user_id uuid REFERENCES public.users(id),
  reviewer_name text NOT NULL DEFAULT 'زائر',
  rating integer NOT NULL,
  review_text text,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- contact_messages
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_admin_id uuid NOT NULL REFERENCES public.admin_users(id),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  reference_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- organizer_applications
CREATE TABLE IF NOT EXISTS public.organizer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- event_scanners
CREATE TABLE IF NOT EXISTS public.event_scanners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  entry_point text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, admin_user_id)
);

-- page_content
CREATE TABLE IF NOT EXISTS public.page_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  content_ar text NOT NULL,
  content_en text,
  title_ar text,
  title_en text,
  image text,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES public.admin_users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- email_templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  subject_ar text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES public.admin_users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- email_send_log
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  template_name text NOT NULL,
  status text NOT NULL,
  message_id text,
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- email_send_state
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id integer PRIMARY KEY DEFAULT 1,
  batch_size integer NOT NULL DEFAULT 10,
  send_delay_ms integer NOT NULL DEFAULT 200,
  auth_email_ttl_minutes integer NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes integer NOT NULL DEFAULT 60,
  retry_after_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- email_unsubscribe_tokens
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

-- suppressed_emails
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reason text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 3. Functions
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_slug_from_title(title text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE base_slug text;
BEGIN
  base_slug := regexp_replace(trim(title), '[^[:alpha:][:digit:]-]', '-', 'g');
  base_slug := regexp_replace(base_slug, '-{2,}', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'item'; END IF;
  RETURN base_slug;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_event_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE base_slug text; final_slug text; counter int := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.generate_slug_from_title(NEW.title_ar);
    final_slug := base_slug;
    LOOP
      IF NOT EXISTS (SELECT 1 FROM public.events WHERE slug = final_slug AND id != NEW.id) THEN EXIT; END IF;
      counter := counter + 1; final_slug := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_place_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE base_slug text; final_slug text; counter int := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.generate_slug_from_title(NEW.name_ar);
    final_slug := base_slug;
    LOOP
      IF NOT EXISTS (SELECT 1 FROM public.places WHERE slug = final_slug AND id != NEW.id) THEN EXIT; END IF;
      counter := counter + 1; final_slug := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_event_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.event_code IS NULL OR NEW.event_code = '' THEN
    NEW.event_code := 'EVT-' || LPAD(nextval('public.event_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE evt_code text; ticket_seq int;
BEGIN
  IF NEW.ticket_code IS NULL OR NEW.ticket_code = '' THEN
    SELECT event_code INTO evt_code FROM public.events WHERE id = NEW.event_id;
    IF evt_code IS NULL THEN evt_code := 'EVT-0000'; END IF;
    SELECT COALESCE(MAX(
      CASE WHEN ticket_code LIKE 'TKT-%-____'
        THEN NULLIF(RIGHT(ticket_code, 4), '')::int ELSE 0 END
    ), 0) + 1 INTO ticket_seq
    FROM public.tickets WHERE event_id = NEW.event_id AND ticket_code IS NOT NULL;
    NEW.ticket_code := 'TKT-' || SUBSTRING(evt_code FROM 5) || '-' || LPAD(ticket_seq::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.is_admin(_auth_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_id = _auth_id AND is_active = true AND role IN ('super_admin', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_scanner_or_admin(_auth_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_id = _auth_id AND is_active = true AND role IN ('super_admin', 'admin', 'scanner')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_admin_user_by_auth_id(_auth_id uuid)
RETURNS SETOF public.admin_users LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.admin_users WHERE auth_id = _auth_id AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.increment_ticket_quantity_sold(_ticket_type_id uuid, _count integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.ticket_types SET quantity_sold = quantity_sold + _count WHERE id = _ticket_type_id;
END; $$;

CREATE OR REPLACE FUNCTION public.book_tickets(_tickets jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE 
  _result jsonb; 
  _ticket jsonb; 
  _inserted_ids jsonb := '[]'::jsonb;
  _new_id uuid;
  _qr_code text;
BEGIN
  FOR _ticket IN SELECT * FROM jsonb_array_elements(_tickets) LOOP
    _qr_code := (_ticket->>'qr_code');
    
    INSERT INTO public.tickets (
      event_id, ticket_type_id, allocation_id, user_id, guest_name, guest_phone, guest_email,
      guest_birthday, qr_code, status, payment_status, payment_method, payment_reference, payment_amount
    ) VALUES (
      (_ticket->>'event_id')::uuid, 
      (_ticket->>'ticket_type_id')::uuid,
      (_ticket->>'allocation_id')::uuid,
      (_ticket->>'user_id')::uuid,
      (_ticket->>'guest_name'), 
      (_ticket->>'guest_phone'), 
      (_ticket->>'guest_email'),
      (_ticket->>'guest_birthday'),
      _qr_code, 
      (_ticket->>'status'), 
      (_ticket->>'payment_status'),
      (_ticket->>'payment_method'), 
      (_ticket->>'payment_reference'),
      COALESCE((_ticket->>'payment_amount')::numeric, 0)
    ) RETURNING id INTO _new_id;
    
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

CREATE OR REPLACE FUNCTION public.get_ticket_by_id(_ticket_id uuid)
RETURNS TABLE(id uuid, guest_name text, guest_phone text, qr_code text, ticket_code text,
  event_id uuid, status text, payment_status text, payment_reference text,
  guest_count integer, checked_in_at timestamptz, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.guest_name, t.guest_phone, t.qr_code, t.ticket_code,
         t.event_id, t.status, t.payment_status, t.payment_reference,
         t.guest_count, t.checked_in_at, t.created_at
  FROM public.tickets t WHERE t.id = _ticket_id;
$$;

CREATE OR REPLACE FUNCTION public.get_tickets_for_confirmation(_ticket_id uuid)
RETURNS TABLE(id uuid, guest_name text, guest_phone text, qr_code text, ticket_code text,
  event_id uuid, status text, payment_status text, payment_reference text,
  event_title_ar text, event_slug text, event_code text,
  event_start_date timestamptz, event_end_date timestamptz, event_cover_image text,
  venue_name_ar text, venue_address_ar text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _event_id uuid; _guest_phone text;
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
END; $$;

CREATE OR REPLACE FUNCTION public.get_tickets_by_guest(_phone text, _email text DEFAULT '')
RETURNS TABLE(id uuid, status text, qr_code text, guest_name text, guest_count integer,
  checked_in_at timestamptz, created_at timestamptz, event_id uuid,
  event_title_ar text, event_start_date timestamptz, event_cover_image text,
  venue_name_ar text, ticket_type_name_ar text, ticket_type_price numeric,
  ticket_type_currency text, ticket_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.status, t.qr_code, t.guest_name, t.guest_count,
         t.checked_in_at, t.created_at, t.event_id,
         e.title_ar, e.start_date, e.cover_image, v.name_ar,
         tt.name_ar, tt.price, tt.currency, t.ticket_code
  FROM public.tickets t
  LEFT JOIN public.events e ON e.id = t.event_id
  LEFT JOIN public.venues v ON v.id = e.venue_id
  LEFT JOIN public.ticket_types tt ON tt.id = t.ticket_type_id
  WHERE t.guest_phone = _phone OR (_email <> '' AND t.guest_email = _email)
  ORDER BY t.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_place_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_place_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN target_place_id := OLD.place_id;
  ELSE target_place_id := NEW.place_id; END IF;
  UPDATE public.places SET
    average_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.reviews WHERE place_id = target_place_id AND is_approved = true),
    total_reviews = (SELECT COUNT(*) FROM public.reviews WHERE place_id = target_place_id AND is_approved = true)
  WHERE id = target_place_id;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_admin_user_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.admin_users SET auth_id = NEW.id WHERE email = NEW.email AND auth_id IS NULL;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.create_scanner_auth(target_email text, target_password text, target_scanner_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_user_id uuid; caller_id uuid; is_admin_check boolean;
BEGIN
  caller_id := auth.uid();
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE public.admin_users.auth_id = caller_id
    AND (public.admin_users.role = 'super_admin' OR public.admin_users.role = 'admin')) INTO is_admin_check;
  IF NOT is_admin_check THEN RETURN json_build_object('success', false, 'error', 'Unauthorized access'); END IF;
  SELECT id INTO new_user_id FROM auth.users WHERE email = target_email;
  IF new_user_id IS NOT NULL THEN
    UPDATE public.admin_users SET auth_id = new_user_id WHERE id = target_scanner_id;
    UPDATE auth.users SET encrypted_password = extensions.crypt(target_password, extensions.gen_salt('bf')) WHERE id = new_user_id;
    RETURN json_build_object('success', true, 'message', 'Scanner updated', 'user_id', new_user_id);
  END IF;
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), target_email, extensions.crypt(target_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated') RETURNING id INTO new_user_id;
  UPDATE public.admin_users SET auth_id = new_user_id WHERE id = target_scanner_id;
  RETURN json_build_object('success', true, 'message', 'Account created successfully', 'user_id', new_user_id);
END; $$;

-- PGMQ helper functions (require pgmq extension)
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END; $$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name); RETURN;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN RETURN FALSE;
END; $$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN PERFORM pgmq.create(dlq_name); EXCEPTION WHEN OTHERS THEN NULL; END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN PERFORM pgmq.delete(source_queue, message_id); EXCEPTION WHEN undefined_table THEN NULL; END;
  RETURN new_id;
END; $$;

-- ────────────────────────────────────────────────────────────
-- 4. Triggers
-- ────────────────────────────────────────────────────────────

CREATE TRIGGER generate_event_slug_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.generate_event_slug();

CREATE TRIGGER generate_event_code_trigger
  BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.generate_event_code();

CREATE TRIGGER generate_place_slug_trigger
  BEFORE INSERT OR UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.generate_place_slug();

CREATE TRIGGER generate_ticket_code_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_code();

CREATE TRIGGER recalculate_place_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_place_rating();

-- ────────────────────────────────────────────────────────────
-- 5. Enable RLS on all tables
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_scanners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_organizer_allocations ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 6. RLS Policies
-- ────────────────────────────────────────────────────────────

-- tickets (open for guest checkout)
CREATE POLICY "Anyone can create tickets" ON public.tickets FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read tickets" ON public.tickets FOR SELECT TO public USING (true);
CREATE POLICY "Admins can update tickets" ON public.tickets FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete tickets" ON public.tickets FOR DELETE TO public USING (true);

-- users (open for guest checkout)
CREATE POLICY "Anyone can create users" ON public.users FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read users" ON public.users FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage users" ON public.users FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Users can update own record" ON public.users FOR UPDATE TO authenticated USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());
CREATE POLICY "Admins can delete users" ON public.users FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- categories
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- cities
CREATE POLICY "Anyone can read cities" ON public.cities FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert cities" ON public.cities FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update cities" ON public.cities FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete cities" ON public.cities FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- events
CREATE POLICY "Anyone can read published events" ON public.events FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Organizers can insert events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (organizer_id IN (SELECT admin_users.organizer_id FROM admin_users WHERE admin_users.auth_id = auth.uid() AND admin_users.is_active = true AND admin_users.role = 'organizer'));
CREATE POLICY "Organizers can read own events" ON public.events FOR SELECT TO authenticated
  USING (organizer_id IN (SELECT admin_users.organizer_id FROM admin_users WHERE admin_users.auth_id = auth.uid() AND admin_users.is_active = true AND admin_users.role = 'organizer'));
CREATE POLICY "Organizers can update own events" ON public.events FOR UPDATE TO authenticated
  USING (organizer_id IN (SELECT admin_users.organizer_id FROM admin_users WHERE admin_users.auth_id = auth.uid() AND admin_users.is_active = true AND admin_users.role = 'organizer'));

-- ticket_types
CREATE POLICY "Anyone can read ticket types" ON public.ticket_types FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert ticket_types" ON public.ticket_types FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update ticket_types" ON public.ticket_types FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete ticket_types" ON public.ticket_types FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Organizers can insert own ticket_types" ON public.ticket_types FOR INSERT TO authenticated
  WITH CHECK (event_id IN (SELECT e.id FROM events e JOIN admin_users au ON au.organizer_id = e.organizer_id WHERE au.auth_id = auth.uid() AND au.is_active = true AND au.role = 'organizer'));
CREATE POLICY "Organizers can read own ticket_types" ON public.ticket_types FOR SELECT TO authenticated
  USING (event_id IN (SELECT e.id FROM events e JOIN admin_users au ON au.organizer_id = e.organizer_id WHERE au.auth_id = auth.uid() AND au.is_active = true AND au.role = 'organizer'));
CREATE POLICY "Organizers can update own ticket_types" ON public.ticket_types FOR UPDATE TO authenticated
  USING (event_id IN (SELECT e.id FROM events e JOIN admin_users au ON au.organizer_id = e.organizer_id WHERE au.auth_id = auth.uid() AND au.is_active = true AND au.role = 'organizer'));

-- organizers
CREATE POLICY "Anyone can read organizers" ON public.organizers FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert organizers" ON public.organizers FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update organizers" ON public.organizers FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete organizers" ON public.organizers FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Organizers can update own profile" ON public.organizers FOR UPDATE TO authenticated
  USING (id IN (SELECT admin_users.organizer_id FROM admin_users WHERE admin_users.auth_id = auth.uid() AND admin_users.is_active = true AND admin_users.role = 'organizer'));

-- venues
CREATE POLICY "Anyone can read venues" ON public.venues FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert venues" ON public.venues FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update venues" ON public.venues FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete venues" ON public.venues FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Organizers can insert venues" ON public.venues FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_id = auth.uid() AND admin_users.is_active = true AND admin_users.role = 'organizer'));

-- places
CREATE POLICY "Anyone can read places" ON public.places FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert places" ON public.places FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update places" ON public.places FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete places" ON public.places FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- reviews
CREATE POLICY "Anyone can read approved reviews" ON public.reviews FOR SELECT TO public USING (is_approved = true);
CREATE POLICY "Admins can read all reviews" ON public.reviews FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can insert reviews" ON public.reviews FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins can update reviews" ON public.reviews FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete reviews" ON public.reviews FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- admin_users
CREATE POLICY "Admins can read own row" ON public.admin_users FOR SELECT TO authenticated USING (auth_id = auth.uid());
CREATE POLICY "Super admins can view all admin users" ON public.admin_users FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert admin_users" ON public.admin_users FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update admin_users" ON public.admin_users FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete admin_users" ON public.admin_users FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- contact_messages
CREATE POLICY "Anyone can insert contact_messages" ON public.contact_messages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins can read contact_messages" ON public.contact_messages FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update contact_messages" ON public.contact_messages FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete contact_messages" ON public.contact_messages FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- favorites
CREATE POLICY "Users can read own favorites" ON public.favorites FOR SELECT TO authenticated
  USING (user_id IN (SELECT users.id FROM users WHERE users.auth_id = auth.uid()));
CREATE POLICY "Admins can manage favorites" ON public.favorites FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Users can insert own favorites" ON public.favorites FOR INSERT TO authenticated
  WITH CHECK (user_id IN (SELECT users.id FROM users WHERE users.auth_id = auth.uid()));
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE TO authenticated
  USING (user_id IN (SELECT users.id FROM users WHERE users.auth_id = auth.uid()));
CREATE POLICY "Admins can delete favorites" ON public.favorites FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- notifications
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (recipient_admin_id IN (SELECT admin_users.id FROM admin_users WHERE admin_users.auth_id = auth.uid() AND admin_users.is_active = true));
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_admin_id IN (SELECT admin_users.id FROM admin_users WHERE admin_users.auth_id = auth.uid() AND admin_users.is_active = true));

-- organizer_applications
CREATE POLICY "Users can insert own applications" ON public.organizer_applications FOR INSERT TO authenticated WITH CHECK (auth_id = auth.uid());
CREATE POLICY "Users can read own applications" ON public.organizer_applications FOR SELECT TO authenticated USING (auth_id = auth.uid());
CREATE POLICY "Admins can read all applications" ON public.organizer_applications FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update applications" ON public.organizer_applications FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- event_scanners
CREATE POLICY "Admins can select event_scanners" ON public.event_scanners FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert event_scanners" ON public.event_scanners FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update event_scanners" ON public.event_scanners FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete event_scanners" ON public.event_scanners FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Scanners can read event_scanners" ON public.event_scanners FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_id = auth.uid() AND admin_users.is_active = true AND admin_users.role IN ('super_admin','admin','scanner')));
CREATE POLICY "Organizers can manage own event_scanners" ON public.event_scanners FOR ALL TO authenticated
  USING (event_id IN (SELECT e.id FROM events e JOIN admin_users au ON au.organizer_id = e.organizer_id WHERE au.auth_id = auth.uid() AND au.is_active = true AND au.role = 'organizer'))
  WITH CHECK (event_id IN (SELECT e.id FROM events e JOIN admin_users au ON au.organizer_id = e.organizer_id WHERE au.auth_id = auth.uid() AND au.is_active = true AND au.role = 'organizer'));

-- page_content
CREATE POLICY "Anyone can read page content" ON public.page_content FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert page_content" ON public.page_content FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update page_content" ON public.page_content FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete page_content" ON public.page_content FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- email_templates
CREATE POLICY "Admins can read email_templates" ON public.email_templates FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Service role can read email_templates" ON public.email_templates FOR SELECT TO public USING (auth.role() = 'service_role');
CREATE POLICY "Admins can insert email_templates" ON public.email_templates FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update email_templates" ON public.email_templates FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete email_templates" ON public.email_templates FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- email_send_log
CREATE POLICY "Service role can insert send log" ON public.email_send_log FOR INSERT TO public WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can read send log" ON public.email_send_log FOR SELECT TO public USING (auth.role() = 'service_role');
CREATE POLICY "Service role can update send log" ON public.email_send_log FOR UPDATE TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- email_send_state
CREATE POLICY "Service role can manage send state" ON public.email_send_state FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- email_unsubscribe_tokens
CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens FOR INSERT TO public WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens FOR SELECT TO public USING (auth.role() = 'service_role');
CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens FOR UPDATE TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- suppressed_emails
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails FOR INSERT TO public WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails FOR SELECT TO public USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- Done!
-- ────────────────────────────────────────────────────────────
