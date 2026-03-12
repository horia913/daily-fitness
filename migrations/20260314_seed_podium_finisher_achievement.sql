-- Seed Podium Finisher achievement (leaderboard rank: lower is better).
-- Bronze = top 3, Silver = top 2, Gold = champion (rank 1).

INSERT INTO public.achievement_templates (
  id, name, description, icon, category, achievement_type, is_tiered,
  tier_bronze_threshold, tier_bronze_label, tier_silver_threshold, tier_silver_label,
  tier_gold_threshold, tier_gold_label, tier_platinum_threshold, tier_platinum_label,
  single_threshold, is_active
) VALUES
('a1000012-0000-4000-8000-000000000012', 'Podium Finisher', 'Reach the top of a leaderboard (rank 1–3)', '🏆', 'performance', 'leaderboard_rank', true, 3, 'Top 3', 2, 'Top 2', 1, 'Champion', NULL, NULL, NULL, true)
ON CONFLICT (id) DO NOTHING;
