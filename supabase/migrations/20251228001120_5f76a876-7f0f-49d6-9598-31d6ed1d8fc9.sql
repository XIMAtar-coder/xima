-- Create hiring_goal_requirements table
CREATE TABLE public.hiring_goal_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  hiring_goal_id UUID NOT NULL UNIQUE REFERENCES public.hiring_goal_drafts(id) ON DELETE CASCADE,
  education_required BOOLEAN DEFAULT false,
  min_education_level TEXT CHECK (min_education_level IN ('none', 'bachelor', 'master', 'phd')),
  education_field TEXT,
  certificates_required BOOLEAN DEFAULT false,
  required_certificates TEXT[],
  language_required BOOLEAN DEFAULT false,
  language TEXT,
  language_level TEXT CHECK (language_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  allow_override BOOLEAN DEFAULT false,
  override_reason_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create candidate_eligibility table
CREATE TABLE public.candidate_eligibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  hiring_goal_id UUID NOT NULL REFERENCES public.hiring_goal_drafts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'pending_review', 'eligible', 'rejected')),
  education_level TEXT,
  education_field TEXT,
  certificates_list TEXT[],
  language_level TEXT,
  language_notes TEXT,
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(candidate_profile_id, hiring_goal_id)
);

-- Create eligibility_documents table
CREATE TABLE public.eligibility_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eligibility_id UUID NOT NULL REFERENCES public.candidate_eligibility(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('education', 'certificate', 'cv')),
  label TEXT,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.hiring_goal_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eligibility_documents ENABLE ROW LEVEL SECURITY;

-- hiring_goal_requirements RLS policies (business can CRUD their own)
CREATE POLICY "Business users can view their own requirements"
ON public.hiring_goal_requirements FOR SELECT
USING (auth.uid() = business_id);

CREATE POLICY "Business users can create their own requirements"
ON public.hiring_goal_requirements FOR INSERT
WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Business users can update their own requirements"
ON public.hiring_goal_requirements FOR UPDATE
USING (auth.uid() = business_id);

CREATE POLICY "Business users can delete their own requirements"
ON public.hiring_goal_requirements FOR DELETE
USING (auth.uid() = business_id);

-- candidate_eligibility RLS policies
CREATE POLICY "Candidates can view their own eligibility"
ON public.candidate_eligibility FOR SELECT
USING (candidate_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Candidates can create their own eligibility"
ON public.candidate_eligibility FOR INSERT
WITH CHECK (candidate_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Candidates can update their own eligibility"
ON public.candidate_eligibility FOR UPDATE
USING (candidate_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Business users can view eligibility for their goals"
ON public.candidate_eligibility FOR SELECT
USING (auth.uid() = business_id);

CREATE POLICY "Operators can view all pending eligibility"
ON public.candidate_eligibility FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Operators can update eligibility status"
ON public.candidate_eligibility FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

-- eligibility_documents RLS policies
CREATE POLICY "Candidates can view their own documents"
ON public.eligibility_documents FOR SELECT
USING (eligibility_id IN (
  SELECT id FROM candidate_eligibility 
  WHERE candidate_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
));

CREATE POLICY "Candidates can upload their own documents"
ON public.eligibility_documents FOR INSERT
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Business users can view documents for their goals"
ON public.eligibility_documents FOR SELECT
USING (eligibility_id IN (
  SELECT id FROM candidate_eligibility WHERE business_id = auth.uid()
));

CREATE POLICY "Operators can view all documents"
ON public.eligibility_documents FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

-- Create storage bucket for eligibility documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('eligibility_docs', 'eligibility_docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for eligibility_docs bucket
CREATE POLICY "Candidates can upload eligibility docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'eligibility_docs' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Candidates can view their own eligibility docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'eligibility_docs'
  AND EXISTS (
    SELECT 1 FROM candidate_eligibility ce
    JOIN profiles p ON p.id = ce.candidate_profile_id
    WHERE ce.id::text = (storage.foldername(name))[1]
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Operators can view all eligibility docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'eligibility_docs'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role))
);

CREATE POLICY "Business can view eligibility docs for their goals"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'eligibility_docs'
  AND EXISTS (
    SELECT 1 FROM candidate_eligibility ce
    WHERE ce.id::text = (storage.foldername(name))[1]
    AND ce.business_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_hiring_goal_requirements_updated_at
BEFORE UPDATE ON public.hiring_goal_requirements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidate_eligibility_updated_at
BEFORE UPDATE ON public.candidate_eligibility
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();