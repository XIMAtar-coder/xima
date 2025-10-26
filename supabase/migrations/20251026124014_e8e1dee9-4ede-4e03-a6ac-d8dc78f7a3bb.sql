-- Update Wolf, Elephant, and Parrot XIMAtars with new images and vectors based on score ranges

-- Update Wolf
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'comp_power', 80,
    'communication', 80,
    'knowledge', 80,
    'creativity', 50,
    'drive', 70
  ),
  image_url = 'public/ximatars/wolf.png',
  updated_at = now()
WHERE label = 'wolf';

-- Update Elephant
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'comp_power', 70,
    'communication', 70,
    'knowledge', 90,
    'creativity', 50,
    'drive', 60
  ),
  image_url = 'public/ximatars/elephant.png',
  updated_at = now()
WHERE label = 'elephant';

-- Update Parrot
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'comp_power', 50,
    'communication', 95,
    'knowledge', 60,
    'creativity', 80,
    'drive', 80
  ),
  image_url = 'public/ximatars/parrot.png',
  updated_at = now()
WHERE label = 'parrot';

-- Update English translations for these three
UPDATE public.ximatar_translations
SET 
  title = 'The Wolf',
  core_traits = 'Strategic – Loyal – Collaborative',
  behavior = 'The Wolf thrives in packs. They are strategic thinkers who value trust, loyalty, and well-defined roles. Wolves are natural team players, often emerging as respected coordinators or quiet leaders within a group.',
  weaknesses = 'Can be rigid in hierarchy, may struggle when isolated',
  ideal_roles = 'Teamwork, Strategy, Integrity'
WHERE ximatar_id = (SELECT id FROM public.ximatars WHERE label = 'wolf') AND lang = 'en';

UPDATE public.ximatar_translations
SET 
  title = 'The Elephant',
  core_traits = 'Wise – Thoughtful – Resilient',
  behavior = 'The Elephant carries the weight of experience with grace. Slow to speak but deeply reflective, they remember what matters and act with foresight. Others turn to them for stability and perspective.',
  weaknesses = 'Resistant to rapid change, cautious',
  ideal_roles = 'Memory, Emotional Intelligence, Long-Term Thinking'
WHERE ximatar_id = (SELECT id FROM public.ximatars WHERE label = 'elephant') AND lang = 'en';

UPDATE public.ximatar_translations
SET 
  title = 'The Parrot',
  core_traits = 'Expressive – Energetic – Inspiring',
  behavior = 'The Parrot brings color and charisma to every interaction. Gifted in communication, they spread ideas with passion and ease. They thrive in social contexts, often becoming the bridge between people and ideas.',
  weaknesses = 'May prioritize expression over analysis',
  ideal_roles = 'Storytelling, Motivation, Verbal Agility'
WHERE ximatar_id = (SELECT id FROM public.ximatars WHERE label = 'parrot') AND lang = 'en';