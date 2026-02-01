-- ============================================================================
-- Migration: Meal Options
-- Date: 2026-01-29
-- Description: Add meal options (variants) support to the nutrition system
-- 
-- A meal is the daily slot (breakfast/lunch/dinner/snack).
-- A meal option is what the client chooses to eat for that slot.
-- 
-- Key rules:
-- - 1 photo per MEAL per day (NOT per option)
-- - meal_option_id is INFORMATIONAL ONLY in meal_photo_logs
-- - Legacy meals (no options) continue to work with meal_option_id = NULL
-- ============================================================================

-- ============================================================================
-- 1. Create meal_options table
-- ============================================================================
CREATE TABLE IF NOT EXISTS meal_options (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    name text NOT NULL,
    order_index integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Index for faster lookups by meal_id
CREATE INDEX IF NOT EXISTS idx_meal_options_meal_id ON meal_options(meal_id);

-- ============================================================================
-- 2. Add meal_option_id column to meal_food_items
-- ============================================================================
-- This column is nullable for backward compatibility:
-- - NULL = legacy meal without options (food items belong directly to meal)
-- - NOT NULL = meal has options (food items belong to a specific option)
ALTER TABLE meal_food_items 
ADD COLUMN IF NOT EXISTS meal_option_id uuid REFERENCES meal_options(id) ON DELETE CASCADE;

-- Index for faster lookups by meal_option_id
CREATE INDEX IF NOT EXISTS idx_meal_food_items_meal_option_id ON meal_food_items(meal_option_id);

-- ============================================================================
-- 3. Add meal_option_id column to meal_photo_logs
-- ============================================================================
-- This column is INFORMATIONAL ONLY - records which option the client chose
-- The unique constraint remains: UNIQUE (client_id, meal_id, log_date)
-- DO NOT add meal_option_id to the unique constraint!
ALTER TABLE meal_photo_logs 
ADD COLUMN IF NOT EXISTS meal_option_id uuid REFERENCES meal_options(id);

-- Index for faster lookups/analytics
CREATE INDEX IF NOT EXISTS idx_meal_photo_logs_meal_option_id ON meal_photo_logs(meal_option_id);

-- ============================================================================
-- 4. Enable RLS on meal_options table
-- ============================================================================
ALTER TABLE meal_options ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS Policies for meal_options (IDEMPOTENT)
-- ============================================================================

-- Coaches can manage meal options for their own meal plans
DROP POLICY IF EXISTS "Coaches can manage meal options for their meal plans" ON meal_options;
CREATE POLICY "Coaches can manage meal options for their meal plans"
ON meal_options
FOR ALL
USING (
    meal_id IN (
        SELECT m.id 
        FROM meals m
        JOIN meal_plans mp ON m.meal_plan_id = mp.id
        WHERE mp.coach_id = auth.uid()
    )
)
WITH CHECK (
    meal_id IN (
        SELECT m.id 
        FROM meals m
        JOIN meal_plans mp ON m.meal_plan_id = mp.id
        WHERE mp.coach_id = auth.uid()
    )
);

-- Clients can read meal options from their assigned meal plans
DROP POLICY IF EXISTS "Clients can read meal options from assigned meal plans" ON meal_options;
CREATE POLICY "Clients can read meal options from assigned meal plans"
ON meal_options
FOR SELECT
USING (
    meal_id IN (
        SELECT m.id 
        FROM meals m
        JOIN meal_plan_assignments mpa ON mpa.meal_plan_id = m.meal_plan_id
        WHERE mpa.client_id = auth.uid() 
        AND mpa.is_active = true
        AND mpa.start_date <= CURRENT_DATE
        AND (mpa.end_date IS NULL OR mpa.end_date >= CURRENT_DATE)
    )
);

-- Admins can manage all meal options
DROP POLICY IF EXISTS "Admins can manage all meal options" ON meal_options;
CREATE POLICY "Admins can manage all meal options"
ON meal_options
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid()  
        AND profiles.role = 'admin'
    )
);

-- ============================================================================
-- 6. Update RLS policy for meal_food_items to handle options (IDEMPOTENT)
-- ============================================================================
-- Drop legacy policies that may overlap with new option-aware policies
DROP POLICY IF EXISTS "Clients can view food items from assigned meals" ON meal_food_items;
DROP POLICY IF EXISTS "Coaches can manage food items for their meals" ON meal_food_items;
DROP POLICY IF EXISTS "Coaches can manage meal food items" ON meal_food_items;

-- Drop new policies if they exist (for idempotency on re-run)
DROP POLICY IF EXISTS "Clients can view food items from assigned meal options" ON meal_food_items;
DROP POLICY IF EXISTS "Coaches can manage food items for their meal options" ON meal_food_items;

-- Clients can view food items from assigned meals (including option-based items)
-- This policy allows viewing food items whether they have meal_option_id or not
CREATE POLICY "Clients can view food items from assigned meal options"
ON meal_food_items
FOR SELECT
USING (
    -- Direct meal access (legacy meals without options)
    (
        meal_option_id IS NULL
        AND meal_id IN (
            SELECT m.id 
            FROM meals m
            JOIN meal_plan_assignments mpa ON mpa.meal_plan_id = m.meal_plan_id
            WHERE mpa.client_id = auth.uid() 
            AND mpa.is_active = true
            AND mpa.start_date <= CURRENT_DATE
            AND (mpa.end_date IS NULL OR mpa.end_date >= CURRENT_DATE)
        )
    )
    OR
    -- Option-based access (meals with options)
    (
        meal_option_id IS NOT NULL
        AND meal_option_id IN (
            SELECT mo.id 
            FROM meal_options mo
            JOIN meals m ON mo.meal_id = m.id
            JOIN meal_plan_assignments mpa ON mpa.meal_plan_id = m.meal_plan_id
            WHERE mpa.client_id = auth.uid() 
            AND mpa.is_active = true
            AND mpa.start_date <= CURRENT_DATE
            AND (mpa.end_date IS NULL OR mpa.end_date >= CURRENT_DATE)
        )
    )
);

-- Coaches can manage food items for their meals (including option-based items)
CREATE POLICY "Coaches can manage food items for their meal options"
ON meal_food_items
FOR ALL
USING (
    -- Direct meal access
    meal_id IN (
        SELECT m.id 
        FROM meals m
        JOIN meal_plans mp ON m.meal_plan_id = mp.id
        WHERE mp.coach_id = auth.uid()
    )
)
WITH CHECK (
    meal_id IN (
        SELECT m.id 
        FROM meals m
        JOIN meal_plans mp ON m.meal_plan_id = mp.id
        WHERE mp.coach_id = auth.uid()
    )
);

-- Admins can manage all meal food items
DROP POLICY IF EXISTS "Admins can manage all meal food items" ON meal_food_items;
CREATE POLICY "Admins can manage all meal food items"
ON meal_food_items
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- ============================================================================
-- 7. RLS Policies for meal_photo_logs (EXPLICIT + IDEMPOTENT)
-- ============================================================================
-- Note: meal_option_id is INFORMATIONAL ONLY and does NOT appear in policy logic.
-- Access control remains meal-scoped, not option-scoped.

-- Ensure RLS is enabled
ALTER TABLE meal_photo_logs ENABLE ROW LEVEL SECURITY;

-- Drop legacy policies that may overlap with new explicit policies
DROP POLICY IF EXISTS "meal_photo_logs_update" ON meal_photo_logs;
DROP POLICY IF EXISTS "meal_photos_delete_coach" ON meal_photo_logs;
DROP POLICY IF EXISTS "meal_photos_insert_own" ON meal_photo_logs;
DROP POLICY IF EXISTS "meal_photos_select_coach" ON meal_photo_logs;

-- Drop new policies if they exist (for idempotency on re-run)
DROP POLICY IF EXISTS "Clients can read their own meal photo logs" ON meal_photo_logs;
DROP POLICY IF EXISTS "Clients can insert their own meal photo logs" ON meal_photo_logs;
DROP POLICY IF EXISTS "Coaches can read meal photo logs for their meal plans" ON meal_photo_logs;
DROP POLICY IF EXISTS "Admins can manage all meal photo logs" ON meal_photo_logs;

-- Clients can read their own meal photo logs
CREATE POLICY "Clients can read their own meal photo logs"
ON meal_photo_logs
FOR SELECT
USING (client_id = auth.uid());

-- Clients can insert their own meal photo logs
CREATE POLICY "Clients can insert their own meal photo logs"
ON meal_photo_logs
FOR INSERT
WITH CHECK (client_id = auth.uid());

-- Coaches can read meal photo logs for meals in their meal plans
CREATE POLICY "Coaches can read meal photo logs for their meal plans"
ON meal_photo_logs
FOR SELECT
USING (
    meal_id IN (
        SELECT m.id
        FROM meals m
        JOIN meal_plans mp ON m.meal_plan_id = mp.id
        WHERE mp.coach_id = auth.uid()
    )
);

-- Admins can manage all meal photo logs
CREATE POLICY "Admins can manage all meal photo logs"
ON meal_photo_logs
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- ============================================================================
-- 8. Comments for documentation
-- ============================================================================
COMMENT ON TABLE meal_options IS 'Meal options (variants) for a meal. A meal can have 0-5 options. Clients choose one option when logging.';
COMMENT ON COLUMN meal_options.meal_id IS 'The meal this option belongs to';
COMMENT ON COLUMN meal_options.name IS 'Display name for the option (e.g., "Option A", "Vegetarian", "High Protein")';
COMMENT ON COLUMN meal_options.order_index IS 'Display order (0-based)';

COMMENT ON COLUMN meal_food_items.meal_option_id IS 'Which option this food item belongs to. NULL = legacy meal without options.';

COMMENT ON COLUMN meal_photo_logs.meal_option_id IS 'INFORMATIONAL: Which option the client chose when logging. Does NOT affect uniqueness - still 1 photo per meal per day.';
