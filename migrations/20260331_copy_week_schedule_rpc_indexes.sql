-- Speed up copy_week_schedule_with_rules: deletes join program_progression_rules → program_schedule.
-- Run this BEFORE or with the RPC migration if deletes time out on large datasets.
-- Safe to re-run (IF NOT EXISTS).

CREATE INDEX IF NOT EXISTS idx_ppr_program_schedule_id
  ON public.program_progression_rules (program_schedule_id);

CREATE INDEX IF NOT EXISTS idx_program_schedule_program_tb_week
  ON public.program_schedule (program_id, training_block_id, week_number);
