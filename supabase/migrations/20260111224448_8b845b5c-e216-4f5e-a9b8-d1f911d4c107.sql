-- Add ideal_ximatar_profile_ids and ideal_ximatar_profile_reasoning to company_profiles
ALTER TABLE public.company_profiles 
ADD COLUMN IF NOT EXISTS ideal_ximatar_profile_ids text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ideal_ximatar_profile_reasoning text;