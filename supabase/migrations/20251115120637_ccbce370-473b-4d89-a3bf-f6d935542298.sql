-- Update Owl XIMAtar vector and image
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'drive', 60,
    'comp_power', 95,
    'communication', 50,
    'creativity', 60,
    'knowledge', 95
  ),
  image_url = '/ximatars/owl.png',
  updated_at = now()
WHERE label = 'owl';

-- Insert/Update English translations for Owl
INSERT INTO public.ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'en'::lang_code,
  'The Analytical Thinker',
  'Wise, Analytical, Reflective, Detail-Oriented, Strategic',
  'May overthink decisions, Can struggle with execution speed, Sometimes too cautious',
  'Research Analyst, Data Scientist, Strategic Planner, Knowledge Manager, Risk Analyst, Compliance Officer',
  'The Owl transforms complexity into clarity through deep analysis and logical reasoning. They excel at identifying patterns and making data-driven decisions with precision and foresight.'
FROM public.ximatars
WHERE label = 'owl'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;

-- Insert/Update Italian translations for Owl
INSERT INTO public.ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'it'::lang_code,
  'Il Pensatore Analitico',
  'Saggio, Analitico, Riflessivo, Attento ai Dettagli, Strategico',
  'Può riflettere troppo sulle decisioni, Può avere difficoltà con la velocità di esecuzione, A volte troppo cauto',
  'Analista di Ricerca, Data Scientist, Pianificatore Strategico, Knowledge Manager, Analista del Rischio, Responsabile Conformità',
  'Il Gufo trasforma la complessità in chiarezza attraverso analisi profonde e ragionamento logico. Eccelle nell''identificare pattern e prendere decisioni basate sui dati con precisione e lungimiranza.'
FROM public.ximatars
WHERE label = 'owl'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;