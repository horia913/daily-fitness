-- ============================================================================
-- Migration: Exercise JSON Columns to Relational Tables
-- Purpose: Convert exercises.muscle_groups, equipment_types, instructions, tips
--          from JSONB arrays to proper relational tables
-- ============================================================================

-- Step 1: Create new relational tables
-- ============================================================================

-- Exercise Muscle Groups Table
CREATE TABLE IF NOT EXISTS exercise_muscle_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_group TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_exercise_muscle_group UNIQUE(exercise_id, muscle_group)
);

CREATE INDEX IF NOT EXISTS idx_exercise_muscle_groups_exercise_id 
  ON exercise_muscle_groups(exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_muscle_groups_muscle_group 
  ON exercise_muscle_groups(muscle_group);

-- Exercise Equipment Table
CREATE TABLE IF NOT EXISTS exercise_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_exercise_equipment UNIQUE(exercise_id, equipment_type)
);

CREATE INDEX IF NOT EXISTS idx_exercise_equipment_exercise_id 
  ON exercise_equipment(exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_equipment_type 
  ON exercise_equipment(equipment_type);

-- Exercise Instructions Table
CREATE TABLE IF NOT EXISTS exercise_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  instruction_order INTEGER NOT NULL,
  instruction_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_exercise_instruction_order UNIQUE(exercise_id, instruction_order)
);

CREATE INDEX IF NOT EXISTS idx_exercise_instructions_exercise_id 
  ON exercise_instructions(exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_instructions_order 
  ON exercise_instructions(exercise_id, instruction_order);

-- Exercise Tips Table
CREATE TABLE IF NOT EXISTS exercise_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  tip_order INTEGER NOT NULL,
  tip_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_exercise_tip_order UNIQUE(exercise_id, tip_order)
);

CREATE INDEX IF NOT EXISTS idx_exercise_tips_exercise_id 
  ON exercise_tips(exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_tips_order 
  ON exercise_tips(exercise_id, tip_order);

-- Step 2: Migrate existing data from JSON columns
-- ============================================================================

-- NOTE: Investigation results show all exercise JSON columns are currently empty arrays []
-- This migration will create the relational structure for future use
-- No data will be migrated, but the structure is ready

-- Migrate muscle_groups
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group, is_primary, created_at)
SELECT 
  e.id as exercise_id,
  jsonb_array_elements_text(e.muscle_groups)::TEXT as muscle_group,
  false as is_primary, -- First element could be marked as primary if needed
  e.created_at
FROM exercises e
WHERE e.muscle_groups IS NOT NULL
  AND jsonb_typeof(e.muscle_groups) = 'array'
  AND jsonb_array_length(e.muscle_groups) > 0
ON CONFLICT (exercise_id, muscle_group) DO NOTHING;

-- Mark first muscle group as primary for each exercise
UPDATE exercise_muscle_groups emg
SET is_primary = true
WHERE emg.id IN (
  SELECT DISTINCT ON (exercise_id) id
  FROM exercise_muscle_groups
  ORDER BY exercise_id, created_at
);

-- Migrate equipment_types
INSERT INTO exercise_equipment (exercise_id, equipment_type, is_required, created_at)
SELECT 
  e.id as exercise_id,
  jsonb_array_elements_text(e.equipment_types)::TEXT as equipment_type,
  true as is_required, -- All equipment is required by default
  e.created_at
FROM exercises e
WHERE e.equipment_types IS NOT NULL
  AND jsonb_typeof(e.equipment_types) = 'array'
  AND jsonb_array_length(e.equipment_types) > 0
ON CONFLICT (exercise_id, equipment_type) DO NOTHING;

-- Migrate instructions
INSERT INTO exercise_instructions (exercise_id, instruction_order, instruction_text, created_at)
SELECT 
  e.id as exercise_id,
  (jsonb_array_elements(e.instructions)::jsonb->>'order')::INTEGER as instruction_order,
  jsonb_array_elements(e.instructions)::jsonb->>'text' as instruction_text,
  e.created_at
FROM exercises e
WHERE e.instructions IS NOT NULL
  AND jsonb_typeof(e.instructions) = 'array'
  AND jsonb_array_length(e.instructions) > 0
ON CONFLICT (exercise_id, instruction_order) DO NOTHING;

-- If instructions array contains strings directly (not objects), use array index as order
INSERT INTO exercise_instructions (exercise_id, instruction_order, instruction_text, created_at)
SELECT 
  e.id as exercise_id,
  row_number() OVER (PARTITION BY e.id ORDER BY ordinality) - 1 as instruction_order,
  value::TEXT as instruction_text,
  e.created_at
FROM exercises e,
  jsonb_array_elements_text(e.instructions) WITH ORDINALITY
WHERE e.instructions IS NOT NULL
  AND jsonb_typeof(e.instructions) = 'array'
  AND jsonb_array_length(e.instructions) > 0
  AND NOT EXISTS (
    SELECT 1 FROM exercise_instructions ei 
    WHERE ei.exercise_id = e.id
  )
ON CONFLICT (exercise_id, instruction_order) DO NOTHING;

-- Migrate tips
INSERT INTO exercise_tips (exercise_id, tip_order, tip_text, created_at)
SELECT 
  e.id as exercise_id,
  (jsonb_array_elements(e.tips)::jsonb->>'order')::INTEGER as tip_order,
  jsonb_array_elements(e.tips)::jsonb->>'text' as tip_text,
  e.created_at
FROM exercises e
WHERE e.tips IS NOT NULL
  AND jsonb_typeof(e.tips) = 'array'
  AND jsonb_array_length(e.tips) > 0
ON CONFLICT (exercise_id, tip_order) DO NOTHING;

-- If tips array contains strings directly (not objects), use array index as order
INSERT INTO exercise_tips (exercise_id, tip_order, tip_text, created_at)
SELECT 
  e.id as exercise_id,
  row_number() OVER (PARTITION BY e.id ORDER BY ordinality) - 1 as tip_order,
  value::TEXT as tip_text,
  e.created_at
FROM exercises e,
  jsonb_array_elements_text(e.tips) WITH ORDINALITY
WHERE e.tips IS NOT NULL
  AND jsonb_typeof(e.tips) = 'array'
  AND jsonb_array_length(e.tips) > 0
  AND NOT EXISTS (
    SELECT 1 FROM exercise_tips et 
    WHERE et.exercise_id = e.id
  )
ON CONFLICT (exercise_id, tip_order) DO NOTHING;

-- Step 3: Add RLS policies for new tables
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE exercise_muscle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_tips ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read all exercise data
CREATE POLICY "Anyone can read exercise muscle groups"
  ON exercise_muscle_groups FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read exercise equipment"
  ON exercise_equipment FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read exercise instructions"
  ON exercise_instructions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read exercise tips"
  ON exercise_tips FOR SELECT
  USING (true);

-- RLS Policy: Coaches can manage their own exercise data
CREATE POLICY "Coaches can manage their exercise muscle groups"
  ON exercise_muscle_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM exercises e
      JOIN profiles p ON e.coach_id = p.id
      WHERE e.id = exercise_muscle_groups.exercise_id
        AND p.id = auth.uid()
        AND p.role = 'coach'
    )
  );

CREATE POLICY "Coaches can manage their exercise equipment"
  ON exercise_equipment FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM exercises e
      JOIN profiles p ON e.coach_id = p.id
      WHERE e.id = exercise_equipment.exercise_id
        AND p.id = auth.uid()
        AND p.role = 'coach'
    )
  );

CREATE POLICY "Coaches can manage their exercise instructions"
  ON exercise_instructions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM exercises e
      JOIN profiles p ON e.coach_id = p.id
      WHERE e.id = exercise_instructions.exercise_id
        AND p.id = auth.uid()
        AND p.role = 'coach'
    )
  );

CREATE POLICY "Coaches can manage their exercise tips"
  ON exercise_tips FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM exercises e
      JOIN profiles p ON e.coach_id = p.id
      WHERE e.id = exercise_tips.exercise_id
        AND p.id = auth.uid()
        AND p.role = 'coach'
    )
  );

-- Step 4: Verification queries
-- ============================================================================

-- Verify migration counts
SELECT 
  'muscle_groups' as table_name,
  (SELECT COUNT(*) FROM exercise_muscle_groups) as migrated_rows,
  (SELECT COUNT(DISTINCT exercise_id) FROM exercise_muscle_groups) as exercises_with_data
UNION ALL
SELECT 
  'equipment',
  (SELECT COUNT(*) FROM exercise_equipment),
  (SELECT COUNT(DISTINCT exercise_id) FROM exercise_equipment)
UNION ALL
SELECT 
  'instructions',
  (SELECT COUNT(*) FROM exercise_instructions),
  (SELECT COUNT(DISTINCT exercise_id) FROM exercise_instructions)
UNION ALL
SELECT 
  'tips',
  (SELECT COUNT(*) FROM exercise_tips),
  (SELECT COUNT(DISTINCT exercise_id) FROM exercise_tips);

-- Verify data integrity
SELECT 
  'Exercises with muscle_groups JSON' as check_type,
  COUNT(*) as count
FROM exercises
WHERE muscle_groups IS NOT NULL
  AND jsonb_typeof(muscle_groups) = 'array'
  AND jsonb_array_length(muscle_groups) > 0
UNION ALL
SELECT 
  'Exercises with muscle_groups relational',
  COUNT(DISTINCT exercise_id)
FROM exercise_muscle_groups;

-- Step 5: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE exercise_muscle_groups IS 'Relational table for exercise muscle groups (migrated from exercises.muscle_groups JSONB)';
COMMENT ON TABLE exercise_equipment IS 'Relational table for exercise equipment types (migrated from exercises.equipment_types JSONB)';
COMMENT ON TABLE exercise_instructions IS 'Relational table for exercise instructions (migrated from exercises.instructions JSONB)';
COMMENT ON TABLE exercise_tips IS 'Relational table for exercise tips (migrated from exercises.tips JSONB)';

-- NOTE: JSON columns are kept for backward compatibility during transition
-- They will be removed in a future migration after all code is updated

