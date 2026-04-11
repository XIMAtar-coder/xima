ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS desired_roles JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS transportation_options JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_commute_minutes INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS content_language TEXT DEFAULT 'en';