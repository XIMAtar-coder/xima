-- Update Bear XIMAtar in ximatars table
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'drive', 80,
    'comp_power', 60,
    'communication', 60,
    'creativity', 40,
    'knowledge', 80
  ),
  image_url = '/ximatars/bear.png',
  updated_at = now()
WHERE label = 'bear';

-- Insert if not exists
INSERT INTO public.ximatars (label, image_url, vector)
VALUES (
  'bear',
  '/ximatars/bear.png',
  jsonb_build_object(
    'drive', 80,
    'comp_power', 60,
    'communication', 60,
    'creativity', 40,
    'knowledge', 80
  )
)
ON CONFLICT (label) DO NOTHING;

-- Add English translation for Bear
INSERT INTO public.ximatar_translations
(ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT id, 'en',
'The Grounded Protector',
'Grounded, Strong, Protective',
'Slower to adapt, Prefers routine',
'Operations Lead, Team Anchor, People Manager, Governance, Compliance',
'Moves slowly but decisively. Provides stability under pressure. Reliable and protective.'
FROM ximatars WHERE label='bear'
ON CONFLICT (ximatar_id, lang) DO UPDATE
SET title = EXCLUDED.title,
    core_traits = EXCLUDED.core_traits,
    weaknesses = EXCLUDED.weaknesses,
    ideal_roles = EXCLUDED.ideal_roles,
    behavior = EXCLUDED.behavior;

-- Add Italian translation for Bear
INSERT INTO public.ximatar_translations
(ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT id, 'it',
'Il Protettore Affidabile',
'Solido, Forte, Protettivo',
'Lento ad adattarsi, Preferisce la routine',
'Responsabile Operativo, Team Anchor, Manager, Governance, Compliance',
'Si muove lentamente ma con decisione. Porta stabilità sotto pressione. Affidabile e protettivo.'
FROM ximatars WHERE label='bear'
ON CONFLICT (ximatar_id, lang) DO UPDATE
SET title = EXCLUDED.title,
    core_traits = EXCLUDED.core_traits,
    weaknesses = EXCLUDED.weaknesses,
    ideal_roles = EXCLUDED.ideal_roles,
    behavior = EXCLUDED.behavior;