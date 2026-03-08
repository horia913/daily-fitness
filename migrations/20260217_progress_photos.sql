-- ============================================================================
-- Progress Photos Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_date date NOT NULL DEFAULT CURRENT_DATE,
  photo_type text NOT NULL CHECK (photo_type IN ('front', 'side', 'back', 'other')),
  photo_url text NOT NULL,
  photo_path text NOT NULL,
  weight_kg numeric,
  body_fat_percentage numeric,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for client date queries
CREATE INDEX IF NOT EXISTS idx_progress_photos_client_date ON public.progress_photos(client_id, photo_date);

-- Unique constraint: one photo per type per date per client
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_photos_unique_client_date_type 
  ON public.progress_photos(client_id, photo_date, photo_type);

-- Enable RLS
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Clients manage own photos" ON public.progress_photos
  FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "Coaches view client photos" ON public.progress_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE clients.coach_id = auth.uid() AND clients.client_id = progress_photos.client_id
    )
  );
