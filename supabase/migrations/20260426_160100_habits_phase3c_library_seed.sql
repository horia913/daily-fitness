BEGIN;

-- ============================================================================
-- Phase 3c (Part 2): Seed platform habit_templates library (23 rows).
-- Run after 20260426_160000_habits_phase3c.sql
-- ============================================================================

INSERT INTO public.habit_templates (
  slug,
  name,
  description,
  category,
  source_type,
  source_config,
  default_target,
  user_configurable_keys,
  icon,
  color,
  sort_order,
  is_active
)
VALUES
  (
    'drink_water_target',
    'Drink water target',
    'Stay hydrated by hitting your daily water goal',
    'hydration',
    'water_log',
    '{}'::jsonb,
    '{"liters": 2}'::jsonb,
    ARRAY['liters']::text[],
    'droplet',
    NULL,
    10,
    true
  ),
  (
    'hit_calorie_target',
    'Hit calorie target',
    'Match your daily calorie intake to your nutrition plan',
    'nutrition',
    'nutrition_field',
    '{"field": "calories"}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'flame',
    NULL,
    20,
    true
  ),
  (
    'hit_protein_target',
    'Hit protein target',
    'Hit your daily protein goal in grams',
    'nutrition',
    'nutrition_field',
    '{"field": "protein_g"}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'beef',
    NULL,
    30,
    true
  ),
  (
    'hit_fiber_target',
    'Hit fiber target',
    'Hit your daily fiber goal in grams',
    'nutrition',
    'nutrition_field',
    '{"field": "fiber_g"}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'wheat',
    NULL,
    40,
    true
  ),
  (
    'log_all_meals',
    'Log all meals',
    'Log every meal you eat each day',
    'nutrition',
    'meal_completion_count',
    '{}'::jsonb,
    '{"min_meals": 3}'::jsonb,
    ARRAY['min_meals']::text[],
    'utensils',
    NULL,
    50,
    true
  ),
  (
    'take_creatine',
    'Take creatine',
    'Daily creatine supplement',
    'nutrition',
    'manual',
    '{}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'pill',
    NULL,
    60,
    true
  ),
  (
    'workout_today',
    'Workout today',
    'Get a training session in today',
    'movement',
    'workout_logged',
    '{}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'dumbbell',
    NULL,
    70,
    true
  ),
  (
    'hit_step_target',
    'Hit step target',
    'Reach your daily step goal',
    'movement',
    'wellness_field',
    '{"field": "steps", "operator": "gte"}'::jsonb,
    '{"steps": 10000}'::jsonb,
    ARRAY['steps']::text[],
    'footprints',
    NULL,
    80,
    true
  ),
  (
    'walk_after_meals',
    'Walk after meals',
    'Take a short walk after eating',
    'movement',
    'manual',
    '{}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'walking',
    NULL,
    90,
    true
  ),
  (
    'take_stairs',
    'Take stairs over elevator',
    'Choose stairs whenever possible',
    'movement',
    'manual',
    '{}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'trending-up',
    NULL,
    100,
    true
  ),
  (
    'sleep_hours_target',
    'Sleep hours target',
    'Get at least your target hours of sleep',
    'sleep_recovery',
    'wellness_field',
    '{"field": "sleep_hours", "operator": "gte"}'::jsonb,
    '{"hours": 7}'::jsonb,
    ARRAY['hours']::text[],
    'moon',
    NULL,
    110,
    true
  ),
  (
    'sleep_quality_threshold',
    'Sleep quality threshold',
    'Hit a quality threshold on your sleep self-rating',
    'sleep_recovery',
    'wellness_field',
    '{"field": "sleep_quality", "operator": "gte"}'::jsonb,
    '{"quality": 4}'::jsonb,
    ARRAY['quality']::text[],
    'bed',
    NULL,
    120,
    true
  ),
  (
    'stretch_mobility',
    'Stretch / mobility 10 min',
    'Spend at least 10 minutes on stretching or mobility',
    'sleep_recovery',
    'manual',
    '{}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'activity',
    NULL,
    130,
    true
  ),
  (
    'cold_exposure',
    'Cold shower / exposure',
    'Cold shower or cold-water immersion',
    'sleep_recovery',
    'manual',
    '{}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'snowflake',
    NULL,
    140,
    true
  ),
  (
    'stress_under_threshold',
    'Stress under threshold',
    'Keep your stress self-rating below the threshold',
    'mindfulness',
    'wellness_field',
    '{"field": "stress_level", "operator": "lte"}'::jsonb,
    '{"max_stress": 2}'::jsonb,
    ARRAY['max_stress']::text[],
    'brain',
    NULL,
    150,
    true
  ),
  (
    'meditate',
    'Meditate / breathwork 5+ min',
    'At least 5 minutes of meditation or breathwork',
    'mindfulness',
    'manual',
    '{}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'wind',
    NULL,
    160,
    true
  ),
  (
    'no_phone_morning',
    'No phone first 30 min',
    'Avoid your phone for 30 min after waking',
    'mindfulness',
    'manual',
    '{}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'smartphone',
    NULL,
    170,
    true
  ),
  (
    'sunlight_morning',
    'Sunlight before noon',
    'Get outside in sunlight before noon',
    'lifestyle',
    'manual',
    '{}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'sun',
    NULL,
    180,
    true
  ),
  (
    'no_alcohol',
    'No alcohol',
    'No alcoholic drinks today',
    'lifestyle',
    'manual',
    '{}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'wine-off',
    NULL,
    190,
    true
  ),
  (
    'no_caffeine_afternoon',
    'No caffeine after 2pm',
    'Avoid caffeine after 2pm',
    'lifestyle',
    'manual',
    '{}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'coffee-off',
    NULL,
    200,
    true
  ),
  (
    'bed_by_target_time',
    'Be in bed by target time',
    'Be in bed by your target bedtime',
    'lifestyle',
    'manual',
    '{}'::jsonb,
    '{"bedtime": "23:00"}'::jsonb,
    ARRAY['bedtime']::text[],
    'clock',
    NULL,
    210,
    true
  ),
  (
    'daily_checkin_done',
    'Daily check-in completed',
    'Submit your daily wellness check-in',
    'checkin',
    'wellness_check',
    '{}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'clipboard-check',
    NULL,
    220,
    true
  ),
  (
    'weekly_weight_log',
    'Log weight weekly',
    'Log your weight at least once per week',
    'checkin',
    'body_metric_count',
    '{"field": "weight_kg", "window": "weekly"}'::jsonb,
    '{}'::jsonb,
    ARRAY[]::text[],
    'scale',
    NULL,
    230,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  source_type = EXCLUDED.source_type,
  source_config = EXCLUDED.source_config,
  default_target = EXCLUDED.default_target,
  user_configurable_keys = EXCLUDED.user_configurable_keys,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

DO $$
DECLARE
  v_cnt integer;
BEGIN
  SELECT COUNT(*) INTO v_cnt FROM public.habit_templates WHERE is_active = true;
  IF v_cnt <> 23 THEN
    RAISE EXCEPTION '[habits_phase3c_library_seed] expected 23 active habit_templates, got %', v_cnt;
  END IF;
  RAISE NOTICE '[habits_phase3c_library_seed] active habit_templates: %', v_cnt;
END $$;

COMMIT;
