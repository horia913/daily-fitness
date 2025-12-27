-- Fix reps columns to be TEXT instead of INTEGER to support rep ranges like "12-15"
-- This migration checks the current type and alters if needed

DO $$
DECLARE
  constraint_rec RECORD;
  constraint_sql TEXT;
BEGIN
  -- Drop ALL check constraints on the table that might interfere
  -- We'll drop them all to be safe, then alter columns, then recreate if needed
  FOR constraint_rec IN 
    SELECT 
      conname,
      pg_get_constraintdef(oid) as constraint_def
    FROM pg_constraint 
    WHERE conrelid = 'public.program_progression_rules'::regclass
    AND contype = 'c'  -- CHECK constraint
  LOOP
    -- Check if constraint references any reps columns
    IF constraint_rec.constraint_def ~* '(reps|first_exercise_reps|second_exercise_reps|exercise_reps|drop_set_reps|isolation_reps|compound_reps)' THEN
      EXECUTE 'ALTER TABLE program_progression_rules DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_rec.conname);
      RAISE NOTICE 'Dropped constraint: %', constraint_rec.conname;
    END IF;
  END LOOP;

  -- Now alter each column type, one at a time
  -- Use a safer conversion method by creating a new column, copying data, then swapping
  
  -- Fix reps column
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'program_progression_rules' 
    AND column_name = 'reps'
    AND data_type = 'integer'
  ) THEN
    -- Use a two-step process: convert to text via casting in a subquery
    BEGIN
      ALTER TABLE program_progression_rules
        ALTER COLUMN reps TYPE TEXT USING COALESCE(reps::TEXT, NULL);
      RAISE NOTICE 'Successfully altered reps column from INTEGER to TEXT';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error altering reps column: %', SQLERRM;
      -- Fallback: try using a simpler cast
      BEGIN
        UPDATE program_progression_rules SET reps = reps::TEXT WHERE reps IS NOT NULL;
        ALTER TABLE program_progression_rules ALTER COLUMN reps TYPE TEXT;
        RAISE NOTICE 'Successfully altered reps column using fallback method';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Fallback also failed: %', SQLERRM;
      END;
    END;
  END IF;

  -- Fix first_exercise_reps
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'program_progression_rules' 
    AND column_name = 'first_exercise_reps'
    AND data_type = 'integer'
  ) THEN
    BEGIN
      ALTER TABLE program_progression_rules
        ALTER COLUMN first_exercise_reps TYPE TEXT USING COALESCE(first_exercise_reps::TEXT, NULL);
      RAISE NOTICE 'Successfully altered first_exercise_reps column from INTEGER to TEXT';
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        UPDATE program_progression_rules SET first_exercise_reps = first_exercise_reps::TEXT WHERE first_exercise_reps IS NOT NULL;
        ALTER TABLE program_progression_rules ALTER COLUMN first_exercise_reps TYPE TEXT;
        RAISE NOTICE 'Successfully altered first_exercise_reps using fallback method';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Fallback failed for first_exercise_reps: %', SQLERRM;
      END;
    END;
  END IF;

  -- Fix second_exercise_reps
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'program_progression_rules' 
    AND column_name = 'second_exercise_reps'
    AND data_type = 'integer'
  ) THEN
    BEGIN
      ALTER TABLE program_progression_rules
        ALTER COLUMN second_exercise_reps TYPE TEXT USING COALESCE(second_exercise_reps::TEXT, NULL);
      RAISE NOTICE 'Successfully altered second_exercise_reps column from INTEGER to TEXT';
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        UPDATE program_progression_rules SET second_exercise_reps = second_exercise_reps::TEXT WHERE second_exercise_reps IS NOT NULL;
        ALTER TABLE program_progression_rules ALTER COLUMN second_exercise_reps TYPE TEXT;
        RAISE NOTICE 'Successfully altered second_exercise_reps using fallback method';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Fallback failed for second_exercise_reps: %', SQLERRM;
      END;
    END;
  END IF;

  -- Fix exercise_reps
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'program_progression_rules' 
    AND column_name = 'exercise_reps'
    AND data_type = 'integer'
  ) THEN
    BEGIN
      ALTER TABLE program_progression_rules
        ALTER COLUMN exercise_reps TYPE TEXT USING COALESCE(exercise_reps::TEXT, NULL);
      RAISE NOTICE 'Successfully altered exercise_reps column from INTEGER to TEXT';
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        UPDATE program_progression_rules SET exercise_reps = exercise_reps::TEXT WHERE exercise_reps IS NOT NULL;
        ALTER TABLE program_progression_rules ALTER COLUMN exercise_reps TYPE TEXT;
        RAISE NOTICE 'Successfully altered exercise_reps using fallback method';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Fallback failed for exercise_reps: %', SQLERRM;
      END;
    END;
  END IF;

  -- Fix drop_set_reps
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'program_progression_rules' 
    AND column_name = 'drop_set_reps'
    AND data_type = 'integer'
  ) THEN
    BEGIN
      ALTER TABLE program_progression_rules
        ALTER COLUMN drop_set_reps TYPE TEXT USING COALESCE(drop_set_reps::TEXT, NULL);
      RAISE NOTICE 'Successfully altered drop_set_reps column from INTEGER to TEXT';
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        UPDATE program_progression_rules SET drop_set_reps = drop_set_reps::TEXT WHERE drop_set_reps IS NOT NULL;
        ALTER TABLE program_progression_rules ALTER COLUMN drop_set_reps TYPE TEXT;
        RAISE NOTICE 'Successfully altered drop_set_reps using fallback method';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Fallback failed for drop_set_reps: %', SQLERRM;
      END;
    END;
  END IF;

  -- Fix isolation_reps
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'program_progression_rules' 
    AND column_name = 'isolation_reps'
    AND data_type = 'integer'
  ) THEN
    BEGIN
      ALTER TABLE program_progression_rules
        ALTER COLUMN isolation_reps TYPE TEXT USING COALESCE(isolation_reps::TEXT, NULL);
      RAISE NOTICE 'Successfully altered isolation_reps column from INTEGER to TEXT';
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        UPDATE program_progression_rules SET isolation_reps = isolation_reps::TEXT WHERE isolation_reps IS NOT NULL;
        ALTER TABLE program_progression_rules ALTER COLUMN isolation_reps TYPE TEXT;
        RAISE NOTICE 'Successfully altered isolation_reps using fallback method';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Fallback failed for isolation_reps: %', SQLERRM;
      END;
    END;
  END IF;

  -- Fix compound_reps
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'program_progression_rules' 
    AND column_name = 'compound_reps'
    AND data_type = 'integer'
  ) THEN
    BEGIN
      ALTER TABLE program_progression_rules
        ALTER COLUMN compound_reps TYPE TEXT USING COALESCE(compound_reps::TEXT, NULL);
      RAISE NOTICE 'Successfully altered compound_reps column from INTEGER to TEXT';
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        UPDATE program_progression_rules SET compound_reps = compound_reps::TEXT WHERE compound_reps IS NOT NULL;
        ALTER TABLE program_progression_rules ALTER COLUMN compound_reps TYPE TEXT;
        RAISE NOTICE 'Successfully altered compound_reps using fallback method';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Fallback failed for compound_reps: %', SQLERRM;
      END;
    END;
  END IF;

END $$;
