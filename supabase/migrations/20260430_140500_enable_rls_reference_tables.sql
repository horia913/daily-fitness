-- Enable RLS on reference/guideline tables. Authenticated users can read
-- but cannot modify. Service role bypasses for admin operations.

ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rp_volume_landmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volume_guidelines ENABLE ROW LEVEL SECURITY;

-- Read policies: anyone authenticated can read
CREATE POLICY "Authenticated users can read muscle_groups"
  ON public.muscle_groups FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read progression_guidelines"
  ON public.progression_guidelines FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read rp_volume_landmarks"
  ON public.rp_volume_landmarks FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read volume_guidelines"
  ON public.volume_guidelines FOR SELECT
  TO authenticated USING (true);

-- No insert/update/delete policies — only service role can write.
