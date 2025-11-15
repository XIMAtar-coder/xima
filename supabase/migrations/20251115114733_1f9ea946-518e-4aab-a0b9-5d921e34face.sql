-- Update Wolf XIMAtar vector and image
UPDATE ximatars 
SET 
  vector = jsonb_build_object(
    'drive', 70,
    'comp_power', 80,
    'communication', 80,
    'creativity', 50,
    'knowledge', 80
  ),
  image_url = '/ximatars/wolf.png'
WHERE label = 'wolf';

-- Upsert English translation for Wolf
INSERT INTO ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'en',
  'The Tactical Team Player',
  'The Wolf thrives in packs. They are strategic thinkers who value trust, loyalty, and well-defined roles. Wolves are natural team players, often emerging as respected coordinators or quiet leaders within a group.',
  'Rigidity in hierarchy, difficulty when isolated, can be overly dependent on group dynamics',
  'Scrum Master, Agile Coach, Team Coordinator, Project Manager, Squad Leader',
  'Collaborative, strategic, loyal to team, excels in coordinated efforts, strong tactical planning'
FROM ximatars WHERE label = 'wolf'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;

-- Upsert Italian translation for Wolf
INSERT INTO ximatar_translations (ximatar_id, lang, title, core_traits, weaknesses, ideal_roles, behavior)
SELECT 
  id,
  'it',
  'Il Giocatore di Squadra Tattico',
  'Il Lupo prospera nel branco. Sono pensatori strategici che valorizzano fiducia, lealtà e ruoli ben definiti. I Lupi sono giocatori di squadra naturali, spesso emergono come coordinatori rispettati o leader silenziosi all''interno del gruppo.',
  'Rigidità nella gerarchia, difficoltà quando isolati, possono essere eccessivamente dipendenti dalle dinamiche di gruppo',
  'Scrum Master, Agile Coach, Coordinatore Team, Project Manager, Squad Leader',
  'Collaborativo, strategico, leale al team, eccelle negli sforzi coordinati, forte pianificazione tattica'
FROM ximatars WHERE label = 'wolf'
ON CONFLICT (ximatar_id, lang) 
DO UPDATE SET
  title = EXCLUDED.title,
  core_traits = EXCLUDED.core_traits,
  weaknesses = EXCLUDED.weaknesses,
  ideal_roles = EXCLUDED.ideal_roles,
  behavior = EXCLUDED.behavior;