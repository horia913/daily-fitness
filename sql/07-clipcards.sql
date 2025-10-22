-- =====================================================
-- DailyFitness ClipCards System
-- =====================================================
-- This file contains all tables and RLS policies for managing ClipCards.

-- 1. CLIPCARD TYPES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.clipcard_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sessions_count INTEGER NOT NULL DEFAULT 1 CHECK (sessions_count > 0),
    validity_days INTEGER NOT NULL DEFAULT 30 CHECK (validity_days > 0),
    price DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for clipcard_types
ALTER TABLE public.clipcard_types ENABLE ROW LEVEL SECURITY;

-- Coaches can see and manage their own clipcard types
DROP POLICY IF EXISTS "Coaches can view their own clipcard types" ON public.clipcard_types;
CREATE POLICY "Coaches can view their own clipcard types" ON public.clipcard_types
FOR SELECT USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can insert their own clipcard types" ON public.clipcard_types;
CREATE POLICY "Coaches can insert their own clipcard types" ON public.clipcard_types
FOR INSERT WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can update their own clipcard types" ON public.clipcard_types;
CREATE POLICY "Coaches can update their own clipcard types" ON public.clipcard_types
FOR UPDATE USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can delete their own clipcard types" ON public.clipcard_types;
CREATE POLICY "Coaches can delete their own clipcard types" ON public.clipcard_types
FOR DELETE USING (auth.uid() = coach_id);

-- 2. CLIPCARDS TABLE (Individual client ClipCards)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.clipcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    clipcard_type_id UUID NOT NULL REFERENCES public.clipcard_types(id) ON DELETE CASCADE,
    sessions_total INTEGER NOT NULL,
    sessions_used INTEGER DEFAULT 0 CHECK (sessions_used >= 0),
    sessions_remaining INTEGER GENERATED ALWAYS AS (sessions_total - sessions_used) STORED,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_sessions CHECK (sessions_used <= sessions_total)
);

-- RLS for clipcards
ALTER TABLE public.clipcards ENABLE ROW LEVEL SECURITY;

-- Coaches can manage clipcards they created
DROP POLICY IF EXISTS "Coaches can view their clipcards" ON public.clipcards;
CREATE POLICY "Coaches can view their clipcards" ON public.clipcards
FOR SELECT USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can insert their clipcards" ON public.clipcards;
CREATE POLICY "Coaches can insert their clipcards" ON public.clipcards
FOR INSERT WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can update their clipcards" ON public.clipcards;
CREATE POLICY "Coaches can update their clipcards" ON public.clipcards
FOR UPDATE USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can delete their clipcards" ON public.clipcards;
CREATE POLICY "Coaches can delete their clipcards" ON public.clipcards
FOR DELETE USING (auth.uid() = coach_id);

-- Clients can view their own clipcards
DROP POLICY IF EXISTS "Clients can view their own clipcards" ON public.clipcards;
CREATE POLICY "Clients can view their own clipcards" ON public.clipcards
FOR SELECT USING (auth.uid() = client_id);

-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to create a new clipcard
DROP FUNCTION IF EXISTS create_clipcard(UUID, UUID, UUID);
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
    WHERE id = p_clipcard_type_id AND coach_id = p_coach_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ClipCard type not found or not accessible';
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

-- Function to extend clipcard validity
DROP FUNCTION IF EXISTS extend_clipcard_validity(UUID, UUID, INTEGER);
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
    SET end_date = end_date + INTERVAL '1 day' * p_extension_days,
        updated_at = NOW()
    WHERE id = p_clipcard_id AND coach_id = p_coach_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ClipCard not found or not accessible';
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Function to use a clipcard session
DROP FUNCTION IF EXISTS use_clipcard_session(UUID, UUID);
CREATE OR REPLACE FUNCTION use_clipcard_session(
    p_clipcard_id UUID,
    p_client_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clipcard RECORD;
BEGIN
    -- Get clipcard details
    SELECT * INTO v_clipcard
    FROM clipcards
    WHERE id = p_clipcard_id AND client_id = p_client_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ClipCard not found or not accessible';
    END IF;
    
    -- Check if clipcard is expired
    IF v_clipcard.end_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'ClipCard has expired';
    END IF;
    
    -- Check if sessions are available
    IF v_clipcard.sessions_remaining <= 0 THEN
        RAISE EXCEPTION 'No sessions remaining on this ClipCard';
    END IF;
    
    -- Use a session
    UPDATE clipcards
    SET sessions_used = sessions_used + 1,
        updated_at = NOW()
    WHERE id = p_clipcard_id;
    
    RETURN TRUE;
END;
$$;

-- 4. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clipcard_types_coach_id ON public.clipcard_types(coach_id);
CREATE INDEX IF NOT EXISTS idx_clipcard_types_active ON public.clipcard_types(is_active);
CREATE INDEX IF NOT EXISTS idx_clipcards_coach_id ON public.clipcards(coach_id);
CREATE INDEX IF NOT EXISTS idx_clipcards_client_id ON public.clipcards(client_id);
CREATE INDEX IF NOT EXISTS idx_clipcards_type_id ON public.clipcards(clipcard_type_id);
CREATE INDEX IF NOT EXISTS idx_clipcards_active ON public.clipcards(is_active);
CREATE INDEX IF NOT EXISTS idx_clipcards_end_date ON public.clipcards(end_date);

-- 5. TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clipcard_types_updated_at BEFORE UPDATE ON public.clipcard_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clipcards_updated_at BEFORE UPDATE ON public.clipcards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
