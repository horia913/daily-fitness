/**
 * Step 9 — drop duration-window orphan schedule cleanup (phases define length now).
 * One-paste in Supabase SQL editor.
 */

DROP FUNCTION IF EXISTS public.cleanup_orphan_schedule(uuid, integer);
