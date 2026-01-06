-- First, let's see what versions of complete_workout exist
SELECT 
  proname,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'complete_workout';

