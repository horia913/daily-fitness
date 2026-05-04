BEGIN;

-- Find dupes: rows where (client_id, exercise_id, record_type, record_value, achieved_date) appears > 1 time
WITH dupes AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, exercise_id, record_type, record_value, achieved_date
      ORDER BY created_at ASC
    ) AS rn
  FROM personal_records
  WHERE client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
)
DELETE FROM personal_records
WHERE id IN (SELECT id FROM dupes WHERE rn > 1);

-- Report
DO $$
DECLARE v_remaining int;
BEGIN
  SELECT COUNT(*) INTO v_remaining FROM personal_records WHERE client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';
  RAISE NOTICE 'Popescu PR rows remaining: %', v_remaining;
END $$;

COMMIT;
