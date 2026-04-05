-- Seeding Premium Demonstration Data for Wujha

-- 1. Create a Venue
INSERT INTO public.venues (id, name_ar, address_ar, latitude, longitude, phone, whatsapp)
VALUES 
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'قاعة آمال الملكية', 'دمشق، أوتوستراد المزة، خلف مبنى الحكومة', 33.5131, 36.2765, '0112233445', '963933653365')
ON CONFLICT (id) DO NOTHING;

-- 2. Create an Organizer
INSERT INTO public.organizers (id, name_ar, logo, description_ar)
VALUES
  ('b2c3d4e5-f6a7-4b5c-8d9e-1f0a1b2c3d4e', 'مجموعة الفعاليات الراقية', 'https://via.placeholder.com/200', 'المجموعة الرائدة في تنظيم أضخم الحفلات الموسيقية والفعاليات التقنية في سوريا.')
ON CONFLICT (id) DO NOTHING;

-- 3. Create Events
-- A. Techno Concert
INSERT INTO public.events (
  id, slug, title_ar, short_description_ar, description_ar, 
  start_date, end_date, venue_id, organizer_id, status, category_id,
  is_free, currency, min_price, cover_image
) VALUES (
  'c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f', 
  'damascus-night-techno', 
  'ليلة دمشق: موسيقى التكنو', 
  'تجربة موسيقية غامرة في قلب دمشق لأول مرة مع نخبة من الفنانين.',
  'استعد لأكبر حفل تكنو في العاصمة! انضم إلينا في ليلة لا تُنسى تجمع بين الموسيقى العالية، الإضاءة السينمائية، والأجواء المذهلة. الفعالية تضم 3 فنانين عالميين ونظام صوتي متطور.',
  '2026-10-19 22:00:00', '2026-10-20 04:00:00',
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'b2c3d4e5-f6a7-4b5c-8d9e-1f0a1b2c3d4e',
  'published', (SELECT id FROM categories LIMIT 1),
  false, 'SYP', 150000,
  '/Users/abdullahalsasa/.gemini/antigravity/brain/f70abf72-65aa-4ceb-8df8-b3bc6decf524/techno_concert_poster_1775382661295.png'
) ON CONFLICT (id) DO NOTHING;

-- B. Tech Summit
INSERT INTO public.events (
  id, slug, title_ar, short_description_ar, description_ar, 
  start_date, venue_id, organizer_id, status, category_id,
  is_free, currency, min_price, cover_image
) VALUES (
  'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f7a', 
  'tech-summit-2026', 
  'قمة التكنولوجيا 2026', 
  'استكشف مستقبل الابتكار والتحول الرقمي في دمشق.',
  'قمة التكنولوجيا هي الحدث الأبرز الذي يجمع المبتكرين والخبراء التقنيين. سنناقش الذكاء الاصطناعي، الأمن السيبراني، ومستقبل الاقتصاد الرقمي في المنطقة من خلال ورشات عمل وجلسات حوارية.',
  '2026-11-12 09:00:00',
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'b2c3d4e5-f6a7-4b5c-8d9e-1f0a1b2c3d4e',
  'published', (SELECT id FROM categories LIMIT 1),
  false, 'SYP', 75000,
  '/Users/abdullahalsasa/.gemini/antigravity/brain/f70abf72-65aa-4ceb-8df8-b3bc6decf524/tech_summit_poster_1775382683145.png'
) ON CONFLICT (id) DO NOTHING;

-- 4. Create Ticket Types for events
INSERT INTO public.ticket_types (event_id, name_ar, price, currency, price_new_syp, quantity_total, is_active)
VALUES
  ('c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f', 'عادية (Regular)', 150000, 'SYP', 150000, 500, true),
  ('c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f', 'ذهبية (VIP)', 350000, 'SYP', 350000, 100, true),
  ('d4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f7a', 'دخول اليوم الكامل', 75000, 'SYP', 75000, 300, true);

-- 5. Create a Sub-Organizer Allocation for Testing the New Registration Page
INSERT INTO public.sub_organizer_allocations (
  event_id, ticket_type_id, user_id, quota, used_count, unique_slug, seating_area
) VALUES (
  'c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f',
  (SELECT id FROM public.ticket_types WHERE event_id = 'c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f' AND name_ar LIKE '%VIP%' LIMIT 1),
  (SELECT id FROM public.users WHERE is_admin = false LIMIT 1), -- Assign to first regular user for testing
  20, 0, 'exclusive-vip-access', 'الجناح الذهبي (Golden Suite)'
) ON CONFLICT DO NOTHING;
