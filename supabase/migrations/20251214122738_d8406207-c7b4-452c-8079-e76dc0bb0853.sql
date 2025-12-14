-- Create hiring_goal_drafts table for storing hiring goals
CREATE TABLE public.hiring_goal_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_description TEXT,
  role_title TEXT,
  experience_level TEXT CHECK (experience_level IN ('first_time', 'independent', 'led_others')),
  work_model TEXT CHECK (work_model IN ('remote', 'hybrid', 'onsite')),
  country TEXT,
  city_region TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'EUR',
  salary_period TEXT DEFAULT 'yearly' CHECK (salary_period IN ('yearly', 'monthly')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hiring_goal_drafts ENABLE ROW LEVEL SECURITY;

-- Business users can manage their own hiring goals
CREATE POLICY "Business users can manage their own hiring goals"
ON public.hiring_goal_drafts
FOR ALL
USING (auth.uid() = business_id)
WITH CHECK (auth.uid() = business_id);

-- Create trigger for updated_at
CREATE TRIGGER update_hiring_goal_drafts_updated_at
BEFORE UPDATE ON public.hiring_goal_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();