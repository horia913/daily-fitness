-- DEPRECATED: Use user_achievements + achievement_templates instead.
-- This migration documents the deprecation; the achievements table is not dropped.

COMMENT ON TABLE public.achievements IS 'DEPRECATED: Use user_achievements + achievement_templates instead.';
