-- Update Horse XIMAtar with user-specified profile
UPDATE public.ximatars
SET vector = jsonb_build_object(
  'drive', 88,
  'comp_power', 60,
  'communication', 60,
  'creativity', 40,
  'knowledge', 70
)
WHERE label = 'horse';

-- Update Horse translations
INSERT INTO public.ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'en',
  'The Reliable Driver',
  'Reliability, Endurance, Loyalty',
  'Risk aversion, Low flexibility',
  'Project Manager, Operations Lead, Logistics Coordinator, Quality Assurance',
  'Thrives on persistence and duty. Always moving forward, driven by goals and strong work ethic. Others rely on them to carry the team across the finish line.'
FROM public.ximatars
WHERE label = 'horse'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;

INSERT INTO public.ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'it',
  'Il Conduttore Affidabile',
  'Affidabilità, Resistenza, Lealtà',
  'Avversione al rischio, Bassa flessibilità',
  'Project Manager, Responsabile Operazioni, Coordinatore Logistico, Controllo Qualità',
  'Prospera sulla persistenza e il dovere. Sempre in movimento, guidato da obiettivi e forte etica del lavoro. Gli altri fanno affidamento su di lui per portare il team al traguardo.'
FROM public.ximatars
WHERE label = 'horse'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;