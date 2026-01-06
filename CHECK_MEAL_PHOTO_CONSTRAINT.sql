-- Check if the uniqueness constraint exists for "1 photo per meal per day"
SELECT 
  c.conname AS constraint_name,
  c.contype AS constraint_type,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE t.relname = 'meal_photo_logs'
  AND n.nspname = 'public'
  AND c.contype = 'u'  -- u = unique constraint
ORDER BY c.conname;

-- Expected: Should see a UNIQUE constraint on (client_id, meal_id, log_date)
-- Constraint name might be: unique_meal_photo_per_day or similar

