BEGIN;

-- For each (client, exercise, record_type) group, only the row with max(record_value) should be is_current_record = true
-- (in case of tie on value, keep the most recent achieved_date)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, exercise_id, record_type
      ORDER BY record_value DESC, achieved_date DESC, created_at DESC
    ) AS rn
  FROM personal_records
  WHERE client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
)
UPDATE personal_records pr
SET is_current_record = (ranked.rn = 1),
    updated_at = now()
FROM ranked
WHERE pr.id = ranked.id;

-- Report
DO $$
DECLARE v_current int;
BEGIN
  SELECT COUNT(*) INTO v_current FROM personal_records
  WHERE client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8' AND is_current_record = true;
  RAISE NOTICE 'Popescu current PR rows: %', v_current;
END $$;

COMMIT;
