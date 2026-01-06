-- Find all tables with "assignment" or "program" in the name
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND (
    table_name LIKE '%assignment%' 
    OR table_name LIKE '%program%'
  )
ORDER BY table_name;

