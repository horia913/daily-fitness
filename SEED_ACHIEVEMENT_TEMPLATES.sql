-- ============================================================================
-- SEED ACHIEVEMENT TEMPLATES
-- Purpose: Insert initial achievement templates (same for everyone)
-- These are predefined achievements that all clients can unlock
-- ============================================================================

-- ============================================================================
-- WORKOUT COUNT ACHIEVEMENTS (Tiered)
-- ============================================================================
INSERT INTO achievement_templates (
  name,
  description,
  icon,
  category,
  achievement_type,
  is_tiered,
  tier_bronze_threshold,
  tier_bronze_label,
  tier_silver_threshold,
  tier_silver_label,
  tier_gold_threshold,
  tier_gold_label,
  tier_platinum_threshold,
  tier_platinum_label,
  is_active
) VALUES (
  'Workout Master',
  'Complete workouts and progress through the tiers',
  'dumbbell',
  'activity',
  'workout_count',
  true,
  10,    -- Bronze: 10 workouts
  'Bronze',
  50,    -- Silver: 50 workouts
  'Silver',
  100,   -- Gold: 100 workouts
  'Gold',
  500,   -- Platinum: 500 workouts
  'Platinum',
  true
);

-- ============================================================================
-- STREAK WEEKS ACHIEVEMENTS (Tiered)
-- ============================================================================
INSERT INTO achievement_templates (
  name,
  description,
  icon,
  category,
  achievement_type,
  is_tiered,
  tier_bronze_threshold,
  tier_bronze_label,
  tier_silver_threshold,
  tier_silver_label,
  tier_gold_threshold,
  tier_gold_label,
  tier_platinum_threshold,
  tier_platinum_label,
  is_active
) VALUES (
  'Streak Legend',
  'Maintain consecutive weeks of completed workouts',
  'flame',
  'activity',
  'streak_weeks',
  true,
  1,     -- Bronze: 1 week streak
  'Bronze',
  4,     -- Silver: 4 weeks streak
  'Silver',
  8,     -- Gold: 8 weeks streak
  'Gold',
  12,    -- Platinum: 12 weeks streak
  'Platinum',
  true
);

-- ============================================================================
-- PERSONAL RECORD COUNT ACHIEVEMENTS (Tiered)
-- ============================================================================
INSERT INTO achievement_templates (
  name,
  description,
  icon,
  category,
  achievement_type,
  is_tiered,
  tier_bronze_threshold,
  tier_bronze_label,
  tier_silver_threshold,
  tier_silver_label,
  tier_gold_threshold,
  tier_gold_label,
  tier_platinum_threshold,
  tier_platinum_label,
  is_active
) VALUES (
  'PR Champion',
  'Set personal records across your workouts',
  'trophy',
  'performance',
  'pr_count',
  true,
  5,     -- Bronze: 5 PRs
  'Bronze',
  10,    -- Silver: 10 PRs
  'Silver',
  25,    -- Gold: 25 PRs
  'Gold',
  50,    -- Platinum: 50 PRs
  'Platinum',
  true
);

-- ============================================================================
-- PROGRAM COMPLETION ACHIEVEMENTS (Tiered)
-- ============================================================================
INSERT INTO achievement_templates (
  name,
  description,
  icon,
  category,
  achievement_type,
  is_tiered,
  tier_bronze_threshold,
  tier_bronze_label,
  tier_silver_threshold,
  tier_silver_label,
  tier_gold_threshold,
  tier_gold_label,
  tier_platinum_threshold,
  tier_platinum_label,
  is_active
) VALUES (
  'Program Completer',
  'Complete programs and reach your goals',
  'check-circle',
  'activity',
  'program_completion',
  true,
  1,     -- Bronze: 1 program
  'Bronze',
  3,     -- Silver: 3 programs
  'Silver',
  5,     -- Gold: 5 programs
  'Gold',
  10,    -- Platinum: 10 programs
  'Platinum',
  true
);

-- ============================================================================
-- VOLUME ACHIEVEMENTS (Tiered) - Optional
-- ============================================================================
INSERT INTO achievement_templates (
  name,
  description,
  icon,
  category,
  achievement_type,
  is_tiered,
  tier_bronze_threshold,
  tier_bronze_label,
  tier_silver_threshold,
  tier_silver_label,
  tier_gold_threshold,
  tier_gold_label,
  tier_platinum_threshold,
  tier_platinum_label,
  is_active
) VALUES (
  'Volume Warrior',
  'Lift heavy volume across all your workouts',
  'weight',
  'volume',
  'total_volume',
  true,
  10000,   -- Bronze: 10,000 lbs total volume
  'Bronze',
  50000,   -- Silver: 50,000 lbs total volume
  'Silver',
  100000,  -- Gold: 100,000 lbs total volume
  'Gold',
  500000,  -- Platinum: 500,000 lbs total volume
  'Platinum',
  true
);

-- ============================================================================
-- FIRST WORKOUT (Non-tiered) - Milestone
-- ============================================================================
INSERT INTO achievement_templates (
  name,
  description,
  icon,
  category,
  achievement_type,
  is_tiered,
  single_threshold,
  is_active
) VALUES (
  'First Steps',
  'Complete your very first workout',
  'star',
  'milestone',
  'workout_count',
  false,
  1,     -- Single threshold: 1 workout
  true
);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
SELECT 
  id,
  name,
  category,
  achievement_type,
  is_tiered,
  is_active,
  created_at
FROM achievement_templates
ORDER BY 
  category,
  achievement_type,
  name;
