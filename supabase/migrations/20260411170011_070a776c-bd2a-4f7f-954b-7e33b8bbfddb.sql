-- Add logo columns to business_profiles
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS logo_uploaded_at TIMESTAMPTZ;

-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('business-logos', 'business-logos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public read business logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-logos');

-- Authenticated users can upload their own logo
CREATE POLICY "Business users upload own logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own logo
CREATE POLICY "Business users update own logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own logo
CREATE POLICY "Business users delete own logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);