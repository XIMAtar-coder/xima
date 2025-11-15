-- Update Bee XIMAtar in ximatars table
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'drive', 90,
    'comp_power', 60,
    'communication', 70,
    'creativity', 40,
    'knowledge', 70
  ),
  image_url = '/ximatars/bee.png',
  updated_at = now()
WHERE label = 'bee';

-- Insert if not exists
INSERT INTO public.ximatars (label, image_url, vector)
VALUES (
  'bee',
  '/ximatars/bee.png',
  jsonb_build_object(
    'drive', 90,
    'comp_power', 60,
    'communication', 70,
    'creativity', 40,
    'knowledge', 70
  )
)
ON CONFLICT (label) DO NOTHING;

-- Add English translation for Bee
INSERT INTO public.ximatar_translations
(ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT id, 'en',
'The Purposeful Contributor',
'Diligent, Community-Driven, Purposeful',
'May resist improvisation, Needs a clear mission',
'Operations Coordinator, Team Support Specialist, Process Manager, Customer Success, Administrative Roles',
'The Bee works with intention and commitment to the greater good. Thrives in structured environments and contributes tirelessly to shared outcomes.'
FROM ximatars WHERE label='bee'
ON CONFLICT (ximatar_id, lang) DO UPDATE
SET title = EXCLUDED.title,
    core_traits = EXCLUDED.core_traits,
    weaknesses = EXCLUDED.weaknesses,
    ideal_roles = EXCLUDED.ideal_roles,
    behavior = EXCLUDED.behavior;

-- Add Italian translation for Bee
INSERT INTO public.ximatar_translations
(ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT id, 'it',
'Il Contributore Premuroso',
'Diligente, Orientato alla Comunità, Guidato dallo Scopo',
'Può resistere all''improvvisazione, Ha bisogno di una missione chiara',
'Coordinatore Operativo, Supporto Team, Manager dei Processi, Customer Success, Ruoli Amministrativi',
'L''Ape lavora con intenzione e impegno verso il bene comune. Prospera in ambienti strutturati e contribuisce instancabilmente ai risultati del team.'
FROM ximatars WHERE label='bee'
ON CONFLICT (ximatar_id, lang) DO UPDATE
SET title = EXCLUDED.title,
    core_traits = EXCLUDED.core_traits,
    weaknesses = EXCLUDED.weaknesses,
    ideal_roles = EXCLUDED.ideal_roles,
    behavior = EXCLUDED.behavior;