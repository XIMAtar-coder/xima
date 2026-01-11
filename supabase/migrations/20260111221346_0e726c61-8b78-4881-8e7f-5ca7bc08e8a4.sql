-- Create storage bucket for job post PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('job_posts_pdfs', 'job_posts_pdfs', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the storage bucket
CREATE POLICY "Business users can upload job post PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'job_posts_pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Business users can view their job post PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'job_posts_pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Business users can delete their job post PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'job_posts_pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create table for tracking PDF imports
CREATE TABLE public.business_job_post_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  pdf_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ready', 'error')),
  error_message TEXT,
  job_post_id UUID REFERENCES public.opportunities(id),
  extracted_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_business_job_post_imports_business_id ON public.business_job_post_imports(business_id);
CREATE INDEX idx_business_job_post_imports_status ON public.business_job_post_imports(status);
CREATE INDEX idx_business_job_post_imports_created_at ON public.business_job_post_imports(created_at DESC);

-- Enable RLS
ALTER TABLE public.business_job_post_imports ENABLE ROW LEVEL SECURITY;

-- RLS policies: business users can only access their own imports
CREATE POLICY "Business users can view their own imports"
ON public.business_job_post_imports FOR SELECT
USING (auth.uid() = business_id);

CREATE POLICY "Business users can create their own imports"
ON public.business_job_post_imports FOR INSERT
WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Business users can update their own imports"
ON public.business_job_post_imports FOR UPDATE
USING (auth.uid() = business_id);

CREATE POLICY "Business users can delete their own imports"
ON public.business_job_post_imports FOR DELETE
USING (auth.uid() = business_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_business_job_post_imports_updated_at
BEFORE UPDATE ON public.business_job_post_imports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();