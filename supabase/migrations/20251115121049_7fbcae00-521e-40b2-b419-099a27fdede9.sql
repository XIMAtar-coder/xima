-- Update Dolphin XIMAtar vector and image
UPDATE public.ximatars
SET 
  vector = jsonb_build_object(
    'drive', 70,
    'comp_power', 60,
    'communication', 90,
    'creativity', 80,
    'knowledge', 60
  ),
  image_url = '/ximatars/dolphin.png',
  updated_at = now()
WHERE label = 'dolphin';

-- Insert/Update English translations for Dolphin
INSERT INTO public.ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'en'::lang_code,
  'The Team Facilitator',
  'Empathetic, Collaborative, Emotionally Intelligent, Harmonious, Social',
  'May avoid confrontation, Needs external motivation, Can be overly accommodating',
  'HR Manager, Team Facilitator, Customer Support, Community Manager, Wellness Coach, Mediator',
  'The Dolphin radiates positivity. Socially attuned and emotionally intelligent, they thrive in collaborative settings and spread harmony. They are the ultimate team players with a natural touch for relationships.'
FROM public.ximatars
WHERE label = 'dolphin'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;

-- Insert/Update Italian translations for Dolphin
INSERT INTO public.ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'it'::lang_code,
  'Il Facilitatore di Team',
  'Empatico, Collaborativo, Emotivamente Intelligente, Armonioso, Sociale',
  'Può evitare il confronto, Ha bisogno di motivazione esterna, Può essere eccessivamente accomodante',
  'HR Manager, Facilitatore di Team, Supporto Clienti, Community Manager, Coach del Benessere, Mediatore',
  'Il Delfino irradia positività. Socialmente sintonizzato ed emotivamente intelligente, prospera in contesti collaborativi e diffonde armonia. È il compagno di squadra definitivo con un tocco naturale per le relazioni.'
FROM public.ximatars
WHERE label = 'dolphin'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;