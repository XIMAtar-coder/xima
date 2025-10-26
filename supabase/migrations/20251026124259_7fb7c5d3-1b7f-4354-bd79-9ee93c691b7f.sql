-- Update Fox, Owl, and Dolphin XIMAtars with new images and vectors based on score ranges

-- Update Fox
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'comp_power', 80,
    'communication', 90,
    'knowledge', 70,
    'creativity', 95,
    'drive', 70
  ),
  image_url = 'public/ximatars/fox.png',
  updated_at = now()
WHERE label = 'fox';

-- Update Owl
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'comp_power', 95,
    'communication', 50,
    'knowledge', 95,
    'creativity', 60,
    'drive', 60
  ),
  image_url = 'public/ximatars/owl.png',
  updated_at = now()
WHERE label = 'owl';

-- Update Dolphin
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'comp_power', 60,
    'communication', 90,
    'knowledge', 60,
    'creativity', 80,
    'drive', 70
  ),
  image_url = 'public/ximatars/dolphin.png',
  updated_at = now()
WHERE label = 'dolphin';

-- Update English translations for these three
UPDATE public.ximatar_translations
SET 
  title = 'The Fox',
  core_traits = 'Clever – Agile – Persuasive',
  behavior = 'The Fox thrives in ambiguity. Quick-witted and perceptive, they are master problem-solvers who know how to navigate complexity. Their social intelligence and charm make them effective influencers and creative thinkers.',
  weaknesses = 'May over-rationalize or manipulate, struggles with routine',
  ideal_roles = 'Adaptability, Persuasion, Creative Problem-Solving'
WHERE ximatar_id = (SELECT id FROM public.ximatars WHERE label = 'fox') AND lang = 'en';

UPDATE public.ximatar_translations
SET 
  title = 'The Owl',
  core_traits = 'Wise – Analytical – Reflective',
  behavior = 'The Owl is a seeker of truth. Quietly powerful, they excel at making sense of complexity and using logic to guide decisions. They are knowledge-driven, often turning data into insight and insight into foresight.',
  weaknesses = 'May overthink or struggle with execution speed',
  ideal_roles = 'Analysis, Insight, Focus'
WHERE ximatar_id = (SELECT id FROM public.ximatars WHERE label = 'owl') AND lang = 'en';

UPDATE public.ximatar_translations
SET 
  title = 'The Dolphin',
  core_traits = 'Empathetic – Joyful – Cooperative',
  behavior = 'The Dolphin radiates positivity. Socially attuned and emotionally intelligent, they thrive in collaborative settings and spread harmony. They''re the ultimate team players with a natural touch for relationships.',
  weaknesses = 'May avoid confrontation, needs external motivation',
  ideal_roles = 'Empathy, Collaboration, Emotional Insight'
WHERE ximatar_id = (SELECT id FROM public.ximatars WHERE label = 'dolphin') AND lang = 'en';