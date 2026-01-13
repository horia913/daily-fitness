-- ============================================================================
-- Bulk Insert: Exercises 301-400
-- Purpose: Insert exercise library with muscle groups and equipment (JSONB)
-- Coach ID: b6014e58-f696-4606-bc63-d7707a21d5f1
-- ============================================================================

BEGIN;

INSERT INTO exercises (name, coach_id, category, muscle_groups, equipment_types)
VALUES
  ('Preacher Curl Machine', 'b6014e58-f696-4606-bc63-d7707a21d5f1'::uuid, 'Uncategorized', '["Biceps"]'::jsonb, '["Machine"]'::jsonb),
  ('Cable Preacher Curl', 'b6014e58-f696-4606-bc63-d7707a21d5f1'::uuid, 'Uncategorized', '["Biceps"]'::jsonb, '["Cable Machine"]'::jsonb),
  ('Machine Bicep Curl', 'b6014e58-f696-4606-bc63-d7707a21d5f1'::uuid, 'Uncategorized', '["Biceps"]'::jsonb, '["Machine"]'::jsonb),
  ('Single-Arm Cable Curl', 'b6014e58-f696-4606-bc63-d7707a21d5f1'::uuid, 'Uncategorized', '["Biceps"]'::jsonb, '["Cable Machine"]'::jsonb),
  ('High Cable Curl', 'b6014e58-f696-4606-bc63-d7707a21d5f1'::uuid, 'Uncategorized', '["Biceps"]'::jsonb, '["Cable Machine"]'::jsonb),
  ('Low Cable Curl', 'b6014e58-f696-4606-bc63-d7707a21d5f1'::uuid, 'Uncategorized', '["Biceps"]'::jsonb, '["Cable Machine"]'::jsonb),
  ('Rope Cable Curl', 'b6014e58-f696-4606-bc63-d7707a21d5f1'::uuid, 'Uncategorized', '["Biceps"]'::jsonb, '["Cable Machine"]'::jsonb),
  ('Cross-Body Cable Curl', 'b6014e58-f696-4606-bc63-d7707a21d5f1'::uuid, 'Uncategorized', '["Biceps"]'::jsonb, '["Cable Machine"]'::jsonb),
  ('Machine Tricep Extension', 'b6014e58-f696-4606-bc63-d7707a21d5f1'::uuid, 'Uncategorized', '["Triceps"]'::jsonb, '["Machine"]'::jsonb);

COMMIT;
