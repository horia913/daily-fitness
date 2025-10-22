-- =====================================================
-- DailyFitness Meal Planning System
-- =====================================================
-- This file contains all meal planning and nutrition tracking functionality

-- 1. FOOD CATEGORIES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.food_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#10B981',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default food categories
INSERT INTO public.food_categories (name, description, icon, color) VALUES
('Protein', 'Meat, fish, dairy, and plant-based proteins', 'Beef', '#EF4444'),
('Carbohydrates', 'Grains, breads, rice, and starchy vegetables', 'Wheat', '#F59E0B'),
('Vegetables', 'Fresh and cooked vegetables', 'Carrot', '#10B981'),
('Fruits', 'Fresh and dried fruits', 'Apple', '#22C55E'),
('Dairy', 'Milk, cheese, yogurt, and dairy products', 'Milk', '#3B82F6'),
('Fats', 'Oils, nuts, seeds, and healthy fats', 'Nut', '#8B5CF6'),
('Beverages', 'Water, juices, and other drinks', 'Coffee', '#6B7280'),
('Snacks', 'Healthy snacks and treats', 'Cookie', '#F97316')
ON CONFLICT (name) DO NOTHING;

-- 2. FOODS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    serving_size DECIMAL(10,2) NOT NULL DEFAULT 100,
    serving_unit TEXT NOT NULL DEFAULT 'g',
    calories_per_serving DECIMAL(8,2) NOT NULL DEFAULT 0,
    protein DECIMAL(8,2) DEFAULT 0,
    carbs DECIMAL(8,2) DEFAULT 0,
    fat DECIMAL(8,2) DEFAULT 0,
    fiber DECIMAL(8,2) DEFAULT 0,
    sugar DECIMAL(8,2) DEFAULT 0,
    sodium DECIMAL(8,2) DEFAULT 0,
    category TEXT DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MEAL PLANS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    coach_id UUID NOT NULL,
    difficulty_level TEXT DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    target_calories INTEGER DEFAULT 2000,
    target_protein DECIMAL(8,2) DEFAULT 150,
    target_carbs DECIMAL(8,2) DEFAULT 250,
    target_fat DECIMAL(8,2) DEFAULT 65,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. MEAL PLAN ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.meal_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    day_of_week INTEGER CHECK (day_of_week >= 1 AND day_of_week <= 7), -- 1=Monday, 7=Sunday
    quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. MEAL PLAN ASSIGNMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.meal_plan_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'active', 'completed', 'paused')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. NUTRITION LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    logged_time TIME DEFAULT CURRENT_TIME,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.food_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES
-- =====================================================

-- Food Categories (read-only for all authenticated users)
DROP POLICY IF EXISTS "Anyone can read food categories" ON public.food_categories;
CREATE POLICY "Anyone can read food categories" ON public.food_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Foods (read-only for all authenticated users)
DROP POLICY IF EXISTS "Anyone can read foods" ON public.foods;
CREATE POLICY "Anyone can read foods" ON public.foods
    FOR SELECT USING (auth.role() = 'authenticated');

-- Meal Plans (coaches can manage their own, clients can read assigned)
DROP POLICY IF EXISTS "Coaches can manage their meal plans" ON public.meal_plans;
CREATE POLICY "Coaches can manage their meal plans" ON public.meal_plans
    FOR ALL USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Clients can read assigned meal plans" ON public.meal_plans;
CREATE POLICY "Clients can read assigned meal plans" ON public.meal_plans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.meal_plan_assignments 
            WHERE meal_plan_assignments.meal_plan_id = meal_plans.id 
            AND meal_plan_assignments.client_id = auth.uid()
        )
    );

-- Meal Plan Items (coaches can manage, clients can read assigned)
DROP POLICY IF EXISTS "Coaches can manage meal plan items" ON public.meal_plan_items;
CREATE POLICY "Coaches can manage meal plan items" ON public.meal_plan_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.meal_plans 
            WHERE meal_plans.id = meal_plan_items.meal_plan_id 
            AND meal_plans.coach_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Clients can read assigned meal plan items" ON public.meal_plan_items;
CREATE POLICY "Clients can read assigned meal plan items" ON public.meal_plan_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.meal_plans 
            JOIN public.meal_plan_assignments ON meal_plan_assignments.meal_plan_id = meal_plans.id
            WHERE meal_plans.id = meal_plan_items.meal_plan_id 
            AND meal_plan_assignments.client_id = auth.uid()
        )
    );

-- Meal Plan Assignments (coaches can manage, clients can read their own)
DROP POLICY IF EXISTS "Coaches can manage meal plan assignments" ON public.meal_plan_assignments;
CREATE POLICY "Coaches can manage meal plan assignments" ON public.meal_plan_assignments
    FOR ALL USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Clients can read their meal plan assignments" ON public.meal_plan_assignments;
CREATE POLICY "Clients can read their meal plan assignments" ON public.meal_plan_assignments
    FOR SELECT USING (client_id = auth.uid());

-- Nutrition Logs (clients can manage their own, coaches can read their clients')
DROP POLICY IF EXISTS "Clients can manage their nutrition logs" ON public.nutrition_logs;
CREATE POLICY "Clients can manage their nutrition logs" ON public.nutrition_logs
    FOR ALL USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can read their clients' nutrition logs" ON public.nutrition_logs;
CREATE POLICY "Coaches can read their clients' nutrition logs" ON public.nutrition_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clients 
            WHERE clients.client_id = nutrition_logs.client_id 
            AND clients.coach_id = auth.uid()
        )
    );

-- 9. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_foods_name ON public.foods(name);
CREATE INDEX IF NOT EXISTS idx_foods_category ON public.foods(category);
CREATE INDEX IF NOT EXISTS idx_meal_plans_coach_id ON public.meal_plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_is_active ON public.meal_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_meal_plan_id ON public.meal_plan_items(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_food_id ON public.meal_plan_items(food_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_meal_type ON public.meal_plan_items(meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_day_of_week ON public.meal_plan_items(day_of_week);
CREATE INDEX IF NOT EXISTS idx_meal_plan_assignments_client_id ON public.meal_plan_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_assignments_coach_id ON public.meal_plan_assignments(coach_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_assignments_assigned_date ON public.meal_plan_assignments(assigned_date);
CREATE INDEX IF NOT EXISTS idx_meal_plan_assignments_status ON public.meal_plan_assignments(status);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_client_id ON public.nutrition_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_food_id ON public.nutrition_logs(food_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_logged_date ON public.nutrition_logs(logged_date);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_meal_type ON public.nutrition_logs(meal_type);

-- 10. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.food_categories TO authenticated;
GRANT ALL ON public.foods TO authenticated;
GRANT ALL ON public.meal_plans TO authenticated;
GRANT ALL ON public.meal_plan_items TO authenticated;
GRANT ALL ON public.meal_plan_assignments TO authenticated;
GRANT ALL ON public.nutrition_logs TO authenticated;

-- Success message
SELECT 'Meal planning system setup completed successfully! 🍎' as message;
