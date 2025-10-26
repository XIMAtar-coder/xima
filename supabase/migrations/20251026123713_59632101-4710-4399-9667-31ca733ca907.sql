-- Update Lion, Horse, and Chameleon XIMatars with new images and vectors based on score ranges

-- Update Lion
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'comp_power', 70,
    'communication', 80,
    'knowledge', 70,
    'creativity', 50,
    'drive', 95
  ),
  image_url = 'public/ximatars/lion.png',
  updated_at = now()
WHERE label = 'lion';

-- Update Horse
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'comp_power', 60,
    'communication', 60,
    'knowledge', 70,
    'creativity', 40,
    'drive', 88
  ),
  image_url = 'public/ximatars/horse.png',
  updated_at = now()
WHERE label = 'horse';

-- Update Chameleon
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'comp_power', 90,
    'communication', 50,
    'knowledge', 80,
    'creativity', 70,
    'drive', 60
  ),
  image_url = 'public/ximatars/chameleon.png',
  updated_at = now()
WHERE label = 'chameleon';

-- Update English translations for these three
UPDATE public.ximatar_translations
SET 
  title = 'The Lion',
  core_traits = 'Bold – Purposeful – Commanding',
  behavior = 'The Lion is a natural leader. They take initiative, push through adversity, and aren''t afraid to stand in front when a challenge arises. Their confidence inspires those around them, and they act with a deep sense of purpose.',
  weaknesses = 'May dominate conversations, struggles with patience',
  ideal_roles = 'Leadership, Initiative, Determination'
WHERE ximatar_id = (SELECT id FROM public.ximatars WHERE label = 'lion') AND lang = 'en';

UPDATE public.ximatar_translations
SET 
  title = 'The Horse',
  core_traits = 'Reliable – Driven – Hardworking',
  behavior = 'The Horse thrives on persistence and duty. Always moving forward, they are driven by goals and a strong work ethic. Others rely on them to carry the team across the finish line, no matter how hard the path.',
  weaknesses = 'Risk aversion, low flexibility',
  ideal_roles = 'Reliability, Endurance, Loyalty'
WHERE ximatar_id = (SELECT id FROM public.ximatars WHERE label = 'horse') AND lang = 'en';

UPDATE public.ximatar_translations
SET 
  title = 'The Chameleon',
  core_traits = 'Adaptive – Observant – Versatile',
  behavior = 'The Chameleon blends seamlessly into any context. Curious and analytical, they learn fast and adapt even faster. Their strength lies in spotting patterns others miss and navigating change with ease.',
  weaknesses = 'May over-adapt or lack assertiveness',
  ideal_roles = 'Flexibility, Learning Speed, Perception'
WHERE ximatar_id = (SELECT id FROM public.ximatars WHERE label = 'chameleon') AND lang = 'en';