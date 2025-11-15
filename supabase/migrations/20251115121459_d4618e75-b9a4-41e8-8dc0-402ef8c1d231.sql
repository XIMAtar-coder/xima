-- Update Cat XIMAtar vector and image
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'drive', 70,
    'comp_power', 80,
    'communication', 60,
    'creativity', 80,
    'knowledge', 70
  ),
  image_url = '/ximatars/cat.png',
  updated_at = now()
WHERE label = 'cat';

-- Insert/Update English translations for Cat
INSERT INTO public.ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'en'::lang_code,
  'The Independent Specialist',
  'Independent, Observant, Strategic, Selective, Focused',
  'May resist collaboration or emotional openness, Can be aloof, Selective about engagement',
  'Analyst, Solo Specialist, R&D, Technical Strategist, Creative Problem-Solver, Independent Consultant',
  'The Cat values freedom and discretion. Curious and highly selective, they invest their energy only where it matters. They excel when trusted to operate independently and follow their instincts. Silent observer. Precision-first. Works best with space and independence.'
FROM public.ximatars
WHERE label = 'cat'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;

-- Insert/Update Italian translations for Cat
INSERT INTO public.ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'it'::lang_code,
  'Lo Specialista Indipendente',
  'Indipendente, Osservatore, Strategico, Selettivo, Concentrato',
  'Può resistere alla collaborazione o all''apertura emotiva, Può essere distaccato, Selettivo nel coinvolgimento',
  'Analista, Specialista Indipendente, R&D, Stratega Tecnico, Problem-Solver Creativo, Consulente Indipendente',
  'Il Gatto valorizza la libertà e la discrezione. Curioso e selettivo, investe la propria energia solo dove serve davvero. Rende al massimo quando gli viene concessa autonomia e fiducia. Osservatore silenzioso. Precisione prima di tutto. Rende al massimo con spazio e indipendenza.'
FROM public.ximatars
WHERE label = 'cat'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;