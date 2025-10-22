-- =====================================================
-- DailyFitness Storage Setup
-- =====================================================
-- This file contains Supabase Storage configuration for file uploads

-- 1. CREATE AVATARS STORAGE BUCKET
-- =====================================================
-- Note: This needs to be run in Supabase Dashboard > Storage
-- The SQL below is for reference - actual bucket creation is done via Dashboard

-- Create avatars bucket (run this in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- 2. STORAGE POLICIES FOR AVATARS
-- =====================================================
-- Note: These policies need to be created in Supabase Dashboard > Storage > Policies
-- The SQL below is for reference

-- Policy: Users can upload their own avatar
-- CREATE POLICY "Users can upload their own avatar" ON storage.objects
-- FOR INSERT WITH CHECK (
--     bucket_id = 'avatars' 
--     AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy: Users can update their own avatar
-- CREATE POLICY "Users can update their own avatar" ON storage.objects
-- FOR UPDATE USING (
--     bucket_id = 'avatars' 
--     AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy: Users can delete their own avatar
-- CREATE POLICY "Users can delete their own avatar" ON storage.objects
-- FOR DELETE USING (
--     bucket_id = 'avatars' 
--     AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy: Anyone can view avatars (public bucket)
-- CREATE POLICY "Anyone can view avatars" ON storage.objects
-- FOR SELECT USING (bucket_id = 'avatars');

-- 3. ALTER PROFILES TABLE TO ADD AVATAR_URL COLUMN
-- =====================================================
-- This adds the avatar_url column to the profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 4. CREATE FUNCTION TO GENERATE UNIQUE FILENAMES
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_unique_filename(
    user_id UUID,
    original_filename TEXT
)
RETURNS TEXT AS $$
DECLARE
    file_extension TEXT;
    timestamp_str TEXT;
    random_str TEXT;
    unique_filename TEXT;
BEGIN
    -- Extract file extension
    file_extension := COALESCE(
        CASE 
            WHEN original_filename ~ '\.[^.]*$' 
            THEN substring(original_filename from '\.([^.]*)$')
            ELSE ''
        END,
        ''
    );
    
    -- Generate timestamp string
    timestamp_str := to_char(NOW(), 'YYYYMMDDHH24MISS');
    
    -- Generate random string
    random_str := substring(md5(random()::text) from 1 for 8);
    
    -- Combine to create unique filename
    unique_filename := user_id::text || '_' || timestamp_str || '_' || random_str;
    
    -- Add extension if it exists
    IF file_extension != '' THEN
        unique_filename := unique_filename || '.' || file_extension;
    END IF;
    
    RETURN unique_filename;
END;
$$ LANGUAGE plpgsql;

-- 5. CREATE FUNCTION TO UPDATE PROFILE AVATAR URL
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_profile_avatar_url(
    user_id UUID,
    avatar_url TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET avatar_url = update_profile_avatar_url.avatar_url,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION public.generate_unique_filename TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_avatar_url TO authenticated;

-- Success message
SELECT 'Storage setup completed successfully! 📁' as message;
