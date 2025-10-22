-- =====================================================
-- DailyFitness Core Database Setup
-- =====================================================
-- This file contains the essential database structure for DailyFitness
-- Run this first to set up the basic tables and authentication

-- 1. PROFILES TABLE
-- =====================================================
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('coach', 'client')),
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. INVITE CODES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invite_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    coach_id UUID NOT NULL,
    client_email VARCHAR(255),
    client_name VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT false,
    used_by UUID,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Enable RLS on invite_codes
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invite_codes
DROP POLICY IF EXISTS "Coaches can manage their invite codes" ON public.invite_codes;
CREATE POLICY "Coaches can manage their invite codes" ON public.invite_codes
    FOR ALL USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can validate invite codes" ON public.invite_codes;
CREATE POLICY "Anyone can validate invite codes" ON public.invite_codes
    FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- 3. CLIENT-COACH RELATIONSHIPS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID NOT NULL,
    client_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coach_id, client_id)
);

-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients
DROP POLICY IF EXISTS "Coaches can view their clients" ON public.clients;
CREATE POLICY "Coaches can view their clients" ON public.clients
    FOR SELECT USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Clients can view their coach relationship" ON public.clients;
CREATE POLICY "Clients can view their coach relationship" ON public.clients
    FOR SELECT USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can manage their client relationships" ON public.clients;
CREATE POLICY "Coaches can manage their client relationships" ON public.clients
    FOR ALL USING (coach_id = auth.uid());

-- 4. AUTH TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_coach_id ON public.invite_codes(coach_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_is_used ON public.invite_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_clients_coach_id ON public.clients(coach_id);
CREATE INDEX IF NOT EXISTS idx_clients_client_id ON public.clients(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);

-- 6. GRANT PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.invite_codes TO anon, authenticated;
GRANT ALL ON public.clients TO authenticated;

-- Success message
SELECT 'Core database setup completed successfully! 🎉' as message;
