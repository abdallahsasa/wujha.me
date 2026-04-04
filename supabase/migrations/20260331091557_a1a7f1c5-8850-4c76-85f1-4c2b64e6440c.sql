
-- Create reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewer_name text NOT NULL DEFAULT 'زائر',
  rating integer NOT NULL,
  review_text text,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add rating constraint
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5);

-- Add denormalized columns to places
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS average_rating numeric;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS total_reviews integer NOT NULL DEFAULT 0;

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved reviews
CREATE POLICY "Anyone can read approved reviews" ON public.reviews
  FOR SELECT TO public USING (is_approved = true);

-- Admins can read all reviews
CREATE POLICY "Admins can read all reviews" ON public.reviews
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Anyone can insert reviews
CREATE POLICY "Anyone can insert reviews" ON public.reviews
  FOR INSERT TO public WITH CHECK (true);

-- Admins can update reviews (moderation)
CREATE POLICY "Admins can update reviews" ON public.reviews
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- Admins can delete reviews
CREATE POLICY "Admins can delete reviews" ON public.reviews
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Create function to recalculate place rating stats
CREATE OR REPLACE FUNCTION public.recalculate_place_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_place_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_place_id := OLD.place_id;
  ELSE
    target_place_id := NEW.place_id;
  END IF;

  UPDATE public.places
  SET
    average_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.reviews WHERE place_id = target_place_id AND is_approved = true),
    total_reviews = (SELECT COUNT(*) FROM public.reviews WHERE place_id = target_place_id AND is_approved = true)
  WHERE id = target_place_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-update rating stats
CREATE TRIGGER update_place_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.recalculate_place_rating();
