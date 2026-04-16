-- Allow coach_week_reviews.action = 'note' for week-review note-only (Stage B.3).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'coach_week_reviews_action_check'
      AND conrelid = 'public.coach_week_reviews'::regclass
  ) THEN
    ALTER TABLE public.coach_week_reviews DROP CONSTRAINT coach_week_reviews_action_check;
  END IF;
END $$;

ALTER TABLE public.coach_week_reviews
  ADD CONSTRAINT coach_week_reviews_action_check
  CHECK (action IN ('advance', 'repeat', 'adjust_and_advance', 'note'));

COMMENT ON CONSTRAINT coach_week_reviews_action_check ON public.coach_week_reviews IS
  'note = coach saved a weekly note without progression unlock (B.3). Legacy actions retained for historical rows.';
