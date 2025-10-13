-- Add columns one by one
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='professionals' AND column_name='full_name') THEN
    ALTER TABLE public.professionals ADD COLUMN full_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='professionals' AND column_name='avatar_path') THEN
    ALTER TABLE public.professionals ADD COLUMN avatar_path text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='professionals' AND column_name='linkedin_url') THEN
    ALTER TABLE public.professionals ADD COLUMN linkedin_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='professionals' AND column_name='locale_bio') THEN
    ALTER TABLE public.professionals ADD COLUMN locale_bio jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='professionals' AND column_name='expertise_tags') THEN
    ALTER TABLE public.professionals ADD COLUMN expertise_tags text[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='professionals' AND column_name='compatibility_score') THEN
    ALTER TABLE public.professionals ADD COLUMN compatibility_score int DEFAULT 90;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='professionals' AND column_name='field_keys') THEN
    ALTER TABLE public.professionals ADD COLUMN field_keys text[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='professionals' AND column_name='updated_at') THEN
    ALTER TABLE public.professionals ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Make user_id nullable
ALTER TABLE public.professionals ALTER COLUMN user_id DROP NOT NULL;

-- Insert professionals
INSERT INTO public.professionals (
  full_name, title, linkedin_url, avatar_path, locale_bio, 
  expertise_tags, compatibility_score, field_keys, specialties
) VALUES
(
  'Pietro Cozzi',
  'Product & Growth Leader',
  'https://www.linkedin.com/in/pietro-cozzi/',
  'avatars/pietro-cozzi.jpg',
  '{"it": "Leader di prodotto e crescita, focus su GTM e metriche", "en": "Product & growth leader focused on GTM and metrics", "es": "Líder de producto y crecimiento, enfoque en GTM y métricas"}'::jsonb,
  ARRAY['Leadership', 'GTM', 'Growth'],
  95,
  ARRAY['business_leadership', 'arts_creative'],
  ARRAY['Leadership', 'GTM']
),
(
  'Daniel Cracau',
  'Technology & Strategy',
  'https://www.linkedin.com/in/daniel-cracau/',
  'avatars/daniel-cracau.jpg',
  '{"it": "Tecnologia e strategia, trasformazione digitale", "en": "Technology and strategy, digital transformation", "es": "Tecnología y estrategia, transformación digital"}'::jsonb,
  ARRAY['Technology', 'Strategy'],
  91,
  ARRAY['science_tech', 'business_leadership'],
  ARRAY['Technology', 'Strategy']
),
(
  'Roberta Fazzeri',
  'People & Culture Advisor',
  'https://www.linkedin.com/in/roberta-fazzeri/',
  'avatars/roberta-fazzeri.jpg',
  '{"it": "Consulente HR, cultura e sviluppo organizzativo", "en": "HR advisor for culture and org development", "es": "Asesora de RRHH, cultura y desarrollo"}'::jsonb,
  ARRAY['HR', 'Culture', 'Coaching'],
  93,
  ARRAY['service_ops', 'arts_creative'],
  ARRAY['HR', 'Culture']
);