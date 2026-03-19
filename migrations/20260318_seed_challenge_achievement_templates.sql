-- ============================================================================
-- Seed: Challenge achievement templates
-- Date: 2026-03-18
-- ============================================================================

INSERT INTO achievement_templates (
  name, description, icon, category, achievement_type,
  is_tiered, tier_bronze_threshold, tier_bronze_label,
  tier_silver_threshold, tier_silver_label,
  tier_gold_threshold, tier_gold_label,
  tier_platinum_threshold, tier_platinum_label,
  single_threshold, is_active
) VALUES
  (
    'Challenge Competitor',
    'Complete challenges to earn this badge',
    '🏅', 'challenges', 'challenges_completed',
    true, 1, 'First Challenge',
    3, 'Regular Competitor',
    5, 'Challenge Veteran',
    10, 'Challenge Legend',
    null, true
  ),
  (
    'Challenge Champion',
    'Win challenges to prove you''re the best',
    '🏆', 'challenges', 'challenges_won',
    true, 1, 'First Win',
    3, 'Serial Winner',
    5, 'Dominant Force',
    10, 'Unstoppable',
    null, true
  ),
  (
    'Podium Finisher',
    'Finish in the top 3 of challenges',
    '🥇', 'challenges', 'challenges_top3',
    true, 1, 'First Podium',
    3, 'Consistent Performer',
    5, 'Elite Competitor',
    10, 'Podium Master',
    null, true
  )
ON CONFLICT DO NOTHING;
