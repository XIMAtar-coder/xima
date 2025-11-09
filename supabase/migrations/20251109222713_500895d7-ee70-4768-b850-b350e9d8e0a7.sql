-- Create user_job_links table for tracking job interactions
CREATE TABLE IF NOT EXISTS public.user_job_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('saved', 'applied', 'viewed')),
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id, status)
);

-- Enable RLS
ALTER TABLE public.user_job_links ENABLE ROW LEVEL SECURITY;

-- Users can manage their own job links
CREATE POLICY "Users can manage their own job links"
ON public.user_job_links
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_job_links_user_id ON public.user_job_links(user_id);
CREATE INDEX idx_user_job_links_status ON public.user_job_links(status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_job_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_job_links_updated_at
BEFORE UPDATE ON public.user_job_links
FOR EACH ROW
EXECUTE FUNCTION public.update_user_job_links_updated_at();