-- Simple ClipCards setup - run this if the main script fails

-- 1. Create clipcard_types table
CREATE TABLE IF NOT EXISTS public.clipcard_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL,
    name TEXT NOT NULL,
    sessions_count INTEGER NOT NULL DEFAULT 1,
    validity_days INTEGER NOT NULL DEFAULT 30,
    price DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create clipcards table
CREATE TABLE IF NOT EXISTS public.clipcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL,
    client_id UUID NOT NULL,
    clipcard_type_id UUID NOT NULL,
    sessions_total INTEGER NOT NULL,
    sessions_used INTEGER DEFAULT 0,
    sessions_remaining INTEGER GENERATED ALWAYS AS (sessions_total - sessions_used) STORED,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.clipcard_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipcards ENABLE ROW LEVEL SECURITY;

-- 4. Basic RLS policies for clipcard_types
DROP POLICY IF EXISTS "clipcard_types_select" ON public.clipcard_types;
CREATE POLICY "clipcard_types_select" ON public.clipcard_types
FOR SELECT USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "clipcard_types_insert" ON public.clipcard_types;
CREATE POLICY "clipcard_types_insert" ON public.clipcard_types
FOR INSERT WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS "clipcard_types_update" ON public.clipcard_types;
CREATE POLICY "clipcard_types_update" ON public.clipcard_types
FOR UPDATE USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "clipcard_types_delete" ON public.clipcard_types;
CREATE POLICY "clipcard_types_delete" ON public.clipcard_types
FOR DELETE USING (auth.uid() = coach_id);

-- 5. Basic RLS policies for clipcards
DROP POLICY IF EXISTS "clipcards_select" ON public.clipcards;
CREATE POLICY "clipcards_select" ON public.clipcards
FOR SELECT USING (auth.uid() = coach_id OR auth.uid() = client_id);

DROP POLICY IF EXISTS "clipcards_insert" ON public.clipcards;
CREATE POLICY "clipcards_insert" ON public.clipcards
FOR INSERT WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS "clipcards_update" ON public.clipcards;
CREATE POLICY "clipcards_update" ON public.clipcards
FOR UPDATE USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "clipcards_delete" ON public.clipcards;
CREATE POLICY "clipcards_delete" ON public.clipcards
FOR DELETE USING (auth.uid() = coach_id);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_clipcard_types_coach_id ON public.clipcard_types(coach_id);
CREATE INDEX IF NOT EXISTS idx_clipcards_coach_id ON public.clipcards(coach_id);
CREATE INDEX IF NOT EXISTS idx_clipcards_client_id ON public.clipcards(client_id);
CREATE INDEX IF NOT EXISTS idx_clipcards_type_id ON public.clipcards(clipcard_type_id);

-- 7. Simple function to create clipcard
CREATE OR REPLACE FUNCTION create_clipcard(
    p_coach_id UUID,
    p_client_id UUID,
    p_clipcard_type_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clipcard_type RECORD;
    v_clipcard_id UUID;
BEGIN
    -- Get clipcard type details
    SELECT * INTO v_clipcard_type
    FROM clipcard_types
    WHERE id = p_clipcard_type_id AND coach_id = p_coach_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ClipCard type not found';
    END IF;
    
    -- Create new clipcard
    INSERT INTO clipcards (
        coach_id,
        client_id,
        clipcard_type_id,
        sessions_total,
        end_date
    ) VALUES (
        p_coach_id,
        p_client_id,
        p_clipcard_type_id,
        v_clipcard_type.sessions_count,
        CURRENT_DATE + INTERVAL '1 day' * v_clipcard_type.validity_days
    ) RETURNING id INTO v_clipcard_id;
    
    RETURN v_clipcard_id;
END;
$$;

-- 8. Simple function to extend clipcard
CREATE OR REPLACE FUNCTION extend_clipcard_validity(
    p_clipcard_id UUID,
    p_coach_id UUID,
    p_extension_days INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE clipcards
    SET end_date = end_date + INTERVAL '1 day' * p_extension_days
    WHERE id = p_clipcard_id AND coach_id = p_coach_id;
    
    RETURN TRUE;
END;
$$;
