-- Update Parrot XIMAtar in ximatars table
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'drive', 80,
    'comp_power', 50,
    'communication', 95,
    'creativity', 80,
    'knowledge', 60
  ),
  image_url = '/ximatars/parrot.png',
  updated_at = now()
WHERE label = 'parrot';

-- Update English translation for Parrot
INSERT INTO public.ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'en'::lang_code,
  'The Charismatic Communicator',
  'Storytelling, Motivation, Verbal Agility, Social Intelligence',
  'May prioritize expression over deep analysis, Can be overly talkative',
  'Sales, Marketing, Public Speaking, Community Management, Brand Ambassador, Content Creator',
  'Parrots bring energy and color to every conversation. They excel at spreading ideas with passion and connecting people through words. Natural storytellers who thrive in social environments.'
FROM public.ximatars
WHERE label = 'parrot'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;

-- Update Italian translation for Parrot
INSERT INTO public.ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'it'::lang_code,
  'Il Comunicatore Carismatico',
  'Narrazione, Motivazione, Agilità Verbale, Intelligenza Sociale',
  'Può privilegiare l''espressione rispetto all''analisi profonda, Può essere eccessivamente loquace',
  'Vendite, Marketing, Public Speaking, Community Management, Brand Ambassador, Content Creator',
  'I Pappagalli portano energia e colore in ogni conversazione. Eccellono nel diffondere idee con passione e nel connettere le persone attraverso le parole. Narratori naturali che prosperano in ambienti sociali.'
FROM public.ximatars
WHERE label = 'parrot'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;