-- Update Elephant XIMAtar vector and image
UPDATE ximatars 
SET 
  vector = jsonb_build_object(
    'drive', 60,
    'comp_power', 70,
    'communication', 70,
    'creativity', 50,
    'knowledge', 90
  ),
  image_url = '/ximatars/elephant.png'
WHERE label = 'elephant';

-- Upsert English translation for Elephant
INSERT INTO ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'en',
  'The Wise Strategist',
  'The Elephant carries the weight of experience with grace. Slow to speak but deeply reflective, they remember what matters and act with foresight. Others turn to them for stability and perspective.',
  'Resistance to rapid change, cautious approach, can be slow to act on urgent matters',
  'Chief Strategy Officer, Board Member, Senior Advisor, Executive Coach, Governance Director',
  'Reflective, patient, excellent memory, strong emotional intelligence, long-term visionary thinking'
FROM ximatars WHERE label = 'elephant'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;

-- Upsert Italian translation for Elephant
INSERT INTO ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'it',
  'Lo Stratega Saggio',
  'L''Elefante porta il peso dell''esperienza con grazia. Lento nel parlare ma profondamente riflessivo, ricorda ciò che conta e agisce con lungimiranza. Altri si rivolgono a loro per stabilità e prospettiva.',
  'Resistenza al cambiamento rapido, approccio cauto, può essere lento ad agire su questioni urgenti',
  'Chief Strategy Officer, Membro del Consiglio, Senior Advisor, Executive Coach, Direttore Governance',
  'Riflessivo, paziente, eccellente memoria, forte intelligenza emotiva, pensiero visionario a lungo termine'
FROM ximatars WHERE label = 'elephant'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;