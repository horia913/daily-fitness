-- =====================================================================
-- PROGRAM SPINE REBUILD — STEP 7: remove master→client propagation
-- Run manually in the Supabase SQL editor.
--
-- Per-client instances (assign_program_instance) are deep copies. Master
-- program_schedule / template edits must NOT leak into active assignments.
-- Step 7 removes the TS propagation machinery; this paste is defensive:
-- drop any server-side trigger/function that might sync master schedule
-- into program_day_assignments (none shipped in repo migrations, but safe
-- to run if a stray object exists in a live DB).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Drop hypothetical propagation triggers on program_schedule (none in repo)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tgname, c.relname AS table_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('program_schedule', 'workout_templates', 'training_blocks')
      AND NOT t.tgisinternal
      AND (
        tgname ILIKE '%propagat%'
        OR tgname ILIKE '%snapshot%sync%'
        OR tgname ILIKE '%sync%snapshot%'
        OR tgname ILIKE '%program_day_assign%'
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.tgname, r.table_name);
    RAISE NOTICE 'Dropped trigger % on public.%', r.tgname, r.table_name;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 2) Drop hypothetical propagation functions (none in repo)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (
        p.proname ILIKE '%propagat%schedule%'
        OR p.proname ILIKE '%sync%snapshot%'
        OR p.proname ILIKE '%snapshot%sync%'
        OR p.proname ILIKE '%program_day_assign%sync%'
      )
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.sig);
    RAISE NOTICE 'Dropped function %', r.sig;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 3) Read-only verification (replace UUIDs before running)
-- ---------------------------------------------------------------------
-- Confirm no propagation triggers remain on master schedule tables:
--   SELECT tgname, c.relname
--   FROM pg_trigger t
--   JOIN pg_class c ON c.oid = t.tgrelid
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public'
--     AND c.relname = 'program_schedule'
--     AND NOT t.tgisinternal;
--
-- Baseline instance row BEFORE coach edits master (note updated_at + names):
--   SELECT pda.id, pda.week_number, pda.program_day, pda.name,
--          pda.program_instance_workout_id, pda.updated_at
--   FROM public.program_day_assignments pda
--   WHERE pda.program_assignment_id = '<assignment-uuid>'::uuid
--   ORDER BY pda.week_number, pda.program_day;
--
-- After coach edits master program_schedule / template in the station editor,
-- re-run the query above — instance rows MUST be byte-identical (updated_at
-- unchanged). Master change only:
--   SELECT ps.week_number, ps.day_number, ps.template_id, ps.updated_at
--   FROM public.program_schedule ps
--   WHERE ps.program_id = '<master-program-uuid>'::uuid
--   ORDER BY ps.week_number, ps.day_number;
--
-- New assignment picks up master (future-only):
--   SELECT public.assign_program_instance(
--     '<master-program-uuid>'::uuid,
--     '<other-client-uuid>'::uuid,
--     '<coach-uuid>'::uuid,
--     CURRENT_DATE,
--     'auto',
--     'UTC',
--     NULL
--   );
