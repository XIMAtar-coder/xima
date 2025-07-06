-- Create storage bucket for CV uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('cv-uploads', 'cv-uploads', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

-- Create storage policies for CV uploads
CREATE POLICY "Users can upload their own CVs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own CVs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own CVs" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own CVs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create CV uploads table
CREATE TABLE public.cv_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_results JSONB,
  virus_scan_status TEXT DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on cv_uploads
ALTER TABLE public.cv_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for cv_uploads
CREATE POLICY "Users can view their own CV uploads" 
ON public.cv_uploads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own CV uploads" 
ON public.cv_uploads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CV uploads" 
ON public.cv_uploads 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create assessments table
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('baseline', 'ximatar', 'follow_up')),
  xima_scores JSONB NOT NULL,
  pillar_scores JSONB,
  overall_score NUMERIC(4,2),
  recommendations JSONB,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on assessments
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Create policies for assessments
CREATE POLICY "Users can view their own assessments" 
ON public.assessments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assessments" 
ON public.assessments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create mentors table
CREATE TABLE public.mentors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  specialties TEXT[] NOT NULL,
  xima_pillars TEXT[] NOT NULL,
  bio TEXT,
  experience_years INTEGER,
  rating NUMERIC(3,2) DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  hourly_rate NUMERIC(10,2),
  availability JSONB,
  profile_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on mentors
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

-- Create policies for mentors
CREATE POLICY "Everyone can view active mentors" 
ON public.mentors 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Mentors can update their own profile" 
ON public.mentors 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  meeting_link TEXT,
  notes JSONB,
  feedback JSONB,
  price NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for appointments
CREATE POLICY "Users can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Mentors can view their appointments" 
ON public.appointments 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM public.mentors WHERE id = appointments.mentor_id));

CREATE POLICY "Users can create appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments" 
ON public.appointments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Mentors can update their appointments" 
ON public.appointments 
FOR UPDATE 
USING (auth.uid() IN (SELECT user_id FROM public.mentors WHERE id = appointments.mentor_id));

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_cv_uploads_updated_at
  BEFORE UPDATE ON public.cv_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentors_updated_at
  BEFORE UPDATE ON public.mentors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time for all tables
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.cv_uploads REPLICA IDENTITY FULL;
ALTER TABLE public.assessments REPLICA IDENTITY FULL;
ALTER TABLE public.mentors REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

-- Add tables to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cv_uploads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;