-- ============================================================================
-- Check if Bulk Insert Scripts Contain Duplicate Names
-- Purpose: Verify if the 400 exercises in the SQL files have duplicates
-- ============================================================================

-- This query simulates what would happen if we extract all exercise names
-- from the bulk insert scripts. Since we can't parse the SQL files directly,
-- we'll check if there are exercises in the database that match the pattern
-- of being created around the same time (which would indicate bulk insert)

-- Check for exercises created in the same second (bulk insert pattern)
SELECT 
  DATE_TRUNC('second', created_at) as created_second,
  COUNT(*) as exercises_created_in_second,
  COUNT(DISTINCT name) as unique_names_in_second
FROM exercises
WHERE coach_id = 'b6014e58-f696-4606-bc63-d7707a21d5f1'::uuid
GROUP BY DATE_TRUNC('second', created_at)
HAVING COUNT(*) > 10  -- Bulk inserts would create many in the same second
ORDER BY exercises_created_in_second DESC
LIMIT 20;
