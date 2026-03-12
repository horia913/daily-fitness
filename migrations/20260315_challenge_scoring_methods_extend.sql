-- Extend scoring_method to include max_weight, max_reps, max_volume, completion_count, body_recomp_percentage, custom.
ALTER TABLE public.challenge_scoring_categories
  DROP CONSTRAINT IF EXISTS challenge_scoring_categories_scoring_method_check;

ALTER TABLE public.challenge_scoring_categories
  ADD CONSTRAINT challenge_scoring_categories_scoring_method_check
  CHECK (scoring_method = ANY (ARRAY[
    'pr_improvement'::text, 'bw_multiple'::text, 'tonnage'::text, 'waist_delta'::text,
    'muscle_gain_bw_multiple'::text, 'adherence_percentage'::text,
    'max_weight'::text, 'max_reps'::text, 'max_volume'::text,
    'completion_count'::text, 'body_recomp_percentage'::text, 'custom'::text
  ]));
