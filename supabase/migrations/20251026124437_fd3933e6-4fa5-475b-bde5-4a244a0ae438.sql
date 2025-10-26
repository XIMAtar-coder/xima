-- Update Bear, Cat, and Bee XIMAtars with new images and vectors based on score ranges

-- Update Bear
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'comp_power', 60,
    'communication', 60,
    'knowledge', 80,
    'creativity', 40,
    'drive', 80
  ),
  image_url = 'public/ximatars/bear.png',
  updated_at = now()
WHERE label = 'bear';

-- Update Cat
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'comp_power', 80,
    'communication', 60,
    'knowledge', 70,
    'creativity', 80,
    'drive', 70
  ),
  image_url = 'public/ximatars/cat.png',
  updated_at = now()
WHERE label = 'cat';

-- Update Bee
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'comp_power', 60,
    'communication', 70,
    'knowledge', 70,
    'creativity', 40,
    'drive', 90
  ),
  image_url = 'public/ximatars/bee.png',
  updated_at = now()
WHERE label = 'bee';

-- Update English translations for these three
UPDATE public.ximatar_translations
SET 
  title = 'The Bear',
  core_traits = 'Grounded – Strong – Protective',
  behavior = 'The Bear is steady, reliable, and always ready to take on responsibility. They bring stability to a team and can handle pressure with patience and strength. They act slowly but decisively, often becoming pillars of trust.',
  weaknesses = 'Slower to adapt, prefers routine',
  ideal_roles = 'Resilience, Responsibility, Calm Under Pressure'
WHERE ximatar_id = (SELECT id FROM public.ximatars WHERE label = 'bear') AND lang = 'en';

UPDATE public.ximatar_translations
SET 
  title = 'The Cat',
  core_traits = 'Independent – Observant – Strategic',
  behavior = 'The Cat values freedom and discretion. They are curious and highly selective about where they invest their energy. They do their best work when trusted to follow their instincts and operate independently.',
  weaknesses = 'May resist collaboration or emotional openness',
  ideal_roles = 'Focus, Strategic Thinking, Autonomy'
WHERE ximatar_id = (SELECT id FROM public.ximatars WHERE label = 'cat') AND lang = 'en';

UPDATE public.ximatar_translations
SET 
  title = 'The Bee',
  core_traits = 'Diligent – Community-Driven – Purposeful',
  behavior = 'The Bee works with intention and commitment to the greater good. They thrive in structured environments and contribute tirelessly to team efforts. They are purpose-driven, finding satisfaction in shared outcomes.',
  weaknesses = 'May resist improvisation, needs a clear mission',
  ideal_roles = 'Discipline, Structure, Team Contribution'
WHERE ximatar_id = (SELECT id FROM public.ximatars WHERE label = 'bee') AND lang = 'en';