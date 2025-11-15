-- Update Chameleon XIMAtar vector and image
UPDATE ximatars 
SET 
  vector = jsonb_build_object(
    'drive', 60,
    'comp_power', 90,
    'communication', 50,
    'creativity', 70,
    'knowledge', 80
  ),
  image_url = '/ximatars/chameleon.png'
WHERE label = 'chameleon';

-- Upsert English translation for Chameleon
INSERT INTO ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'en',
  'The Adaptive Operator',
  'The Chameleon blends seamlessly into any context. Curious and analytical, they learn fast and adapt even faster. Their strength lies in spotting patterns others miss and navigating change with ease.',
  'May over-adapt to surroundings, can lack strong personal identity, struggles with assertiveness in conflict',
  'Analyst, Researcher, Consultant, Problem Solver, Strategic Advisor',
  'Observant and adaptable, learns quickly, excels in dynamic environments, strong pattern recognition'
FROM ximatars WHERE label = 'chameleon'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;

-- Upsert Italian translation for Chameleon
INSERT INTO ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'it',
  'L''Operatore Adattivo',
  'Il Camaleonte si fonde perfettamente in qualsiasi contesto. Curioso e analitico, impara velocemente e si adatta ancora più rapidamente. La sua forza sta nello scoprire schemi che altri non vedono e nel navigare il cambiamento con facilità.',
  'Può adattarsi eccessivamente all''ambiente, può mancare di forte identità personale, fatica con l''assertività nei conflitti',
  'Analista, Ricercatore, Consulente, Problem Solver, Consulente Strategico',
  'Osservatore e adattabile, impara rapidamente, eccelle in ambienti dinamici, forte riconoscimento di pattern'
FROM ximatars WHERE label = 'chameleon'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;