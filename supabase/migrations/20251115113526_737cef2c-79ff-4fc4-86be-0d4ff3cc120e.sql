-- Fix all XIMAtar image URLs to remove "public/" prefix
UPDATE public.ximatars
SET image_url = '/' || REPLACE(image_url, 'public/', '')
WHERE image_url LIKE 'public/%';

-- Update Lion XIMAtar with user-specified ranges and vector
-- Vector represents the "ideal" or "center" of the pillar ranges
UPDATE public.ximatars
SET vector = jsonb_build_object(
  'drive', 95,
  'comp_power', 70,
  'communication', 80,
  'creativity', 50,
  'knowledge', 70
)
WHERE label = 'lion';

-- Add translations for Lion if missing
INSERT INTO public.ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles)
SELECT 
  id,
  'en',
  'The Executive Leader',
  'Leadership, Initiative, Determination',
  'May dominate conversations, Struggles with patience',
  'CEO, Project Lead, Executive, Team Leader'
FROM public.ximatars
WHERE label = 'lion'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles;

INSERT INTO public.ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles)
SELECT 
  id,
  'it',
  'Il Leader Esecutivo',
  'Leadership, Iniziativa, Determinazione',
  'Può dominare le conversazioni, Fatica ad avere pazienza',
  'CEO, Capo Progetto, Dirigente, Team Leader'
FROM public.ximatars
WHERE label = 'lion'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles;