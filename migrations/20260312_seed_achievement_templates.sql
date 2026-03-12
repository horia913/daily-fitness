-- Seed default achievement templates (unified with achievementService types).
-- Uses fixed UUIDs so ON CONFLICT DO NOTHING makes the migration idempotent.

INSERT INTO public.achievement_templates (
  id, name, description, icon, category, achievement_type, is_tiered,
  tier_bronze_threshold, tier_bronze_label, tier_silver_threshold, tier_silver_label,
  tier_gold_threshold, tier_gold_label, tier_platinum_threshold, tier_platinum_label,
  single_threshold, is_active
) VALUES
-- Workout (workout_count)
('a1000001-0000-4000-8000-000000000001', 'Workout Warrior', 'Complete workouts and unlock tiers', '💪', 'workout', 'workout_count', true, 10, 'First Steps', 25, 'Regular', 50, 'Centurion', 100, 'Elite', NULL, true),
('a1000002-0000-4000-8000-000000000002', 'Iron Dedication', 'Long-term workout consistency', '🏋️', 'workout', 'workout_count', true, 200, 'Dedicated', 500, 'Iron', 750, 'Steel', 1000, 'Legend', NULL, true),
-- Streak (streak_weeks)
('a1000003-0000-4000-8000-000000000003', 'Consistency King', 'Consecutive weeks hitting your workout goal', '🔥', 'consistency', 'streak_weeks', true, 2, 'Starting Strong', 4, 'Perfect Month', 8, 'Habit Builder', 12, 'All-Weather', NULL, true),
('a1000004-0000-4000-8000-000000000004', 'Unstoppable', 'Keep your streak alive', '⚡', 'consistency', 'streak_weeks', true, 16, 'Four Months', 24, 'Half Year', 36, 'Nine Months', 52, 'Full Year', NULL, true),
-- PR (pr_count)
('a1000005-0000-4000-8000-000000000005', 'Record Breaker', 'Set new personal records', '💪', 'performance', 'pr_count', true, 5, 'Getting Stronger', 15, 'PR Hunter', 30, 'Record Setter', 50, 'PR Legend', NULL, true),
-- Check-in streak (checkin_streak)
('a1000006-0000-4000-8000-000000000006', 'Check-In Champion', 'Consecutive days with a complete wellness check-in', '✅', 'wellness', 'checkin_streak', true, 7, 'One Week', 14, 'Two Weeks', 30, 'One Month', 60, 'Two Months', NULL, true),
('a1000007-0000-4000-8000-000000000007', 'Wellness Warrior', 'Long-term check-in consistency', '🌟', 'wellness', 'checkin_streak', true, 90, '90 Days', 180, 'Half Year', 270, 'Nine Months', 365, 'Full Year', NULL, true),
-- Program completion (program_completion)
('a1000008-0000-4000-8000-000000000008', 'Program Finisher', 'Complete full training programs', '📋', 'program', 'program_completion', true, 1, 'Finisher', 3, 'Committed', 5, 'Dedicated', 10, 'Program Master', NULL, true),
-- Volume (total_volume)
('a1000009-0000-4000-8000-000000000009', 'Volume Machine', 'Total weight lifted (kg)', '⚡', 'volume', 'total_volume', true, 10000, '10k kg', 50000, '50k kg', 100000, '100k kg', 500000, '500k kg', NULL, true),
-- Weight goal (weight_goal) – single
('a1000010-0000-4000-8000-000000000010', 'First 5kg Lost', 'Lose your first 5 kg from your starting weight', '🎯', 'transformation', 'weight_goal', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, true),
('a1000011-0000-4000-8000-000000000011', 'Transformation', 'Lose 10 kg from your starting weight', '🔥', 'transformation', 'weight_goal', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 10, true)
ON CONFLICT (id) DO NOTHING;
