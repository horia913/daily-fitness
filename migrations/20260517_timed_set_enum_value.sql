-- MUST run as its own migration (or run alone in SQL editor) and COMMIT before
-- 20260517_timed_set_protocol.sql. PostgreSQL forbids using a new enum label in the
-- same transaction that adds it (55P04).

ALTER TYPE public.workout_set_type ADD VALUE IF NOT EXISTS 'timed_set';
