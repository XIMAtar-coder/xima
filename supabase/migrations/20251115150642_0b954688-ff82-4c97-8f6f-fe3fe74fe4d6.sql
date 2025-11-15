-- Update all XIMAtar vectors with strongly differentiated values
-- Scale: 0-100 for all pillars

UPDATE public.ximatars
SET vector = '{"drive": 95, "comp_power": 70, "communication": 85, "creativity": 60, "knowledge": 65}'::jsonb
WHERE label = 'lion';

UPDATE public.ximatars
SET vector = '{"creativity": 95, "communication": 88, "drive": 70, "comp_power": 60, "knowledge": 55}'::jsonb
WHERE label = 'fox';

UPDATE public.ximatars
SET vector = '{"communication": 95, "creativity": 80, "drive": 60, "comp_power": 50, "knowledge": 50}'::jsonb
WHERE label = 'dolphin';

UPDATE public.ximatars
SET vector = '{"comp_power": 90, "creativity": 85, "communication": 55, "drive": 65, "knowledge": 75}'::jsonb
WHERE label = 'cat';

UPDATE public.ximatars
SET vector = '{"knowledge": 90, "drive": 85, "communication": 55, "comp_power": 60, "creativity": 40}'::jsonb
WHERE label = 'bear';

UPDATE public.ximatars
SET vector = '{"drive": 92, "communication": 70, "comp_power": 55, "creativity": 35, "knowledge": 65}'::jsonb
WHERE label = 'bee';

UPDATE public.ximatars
SET vector = '{"comp_power": 75, "drive": 88, "knowledge": 70, "communication": 60, "creativity": 45}'::jsonb
WHERE label = 'wolf';

UPDATE public.ximatars
SET vector = '{"knowledge": 98, "comp_power": 90, "communication": 55, "creativity": 60, "drive": 50}'::jsonb
WHERE label = 'owl';

UPDATE public.ximatars
SET vector = '{"communication": 98, "creativity": 75, "drive": 55, "comp_power": 50, "knowledge": 45}'::jsonb
WHERE label = 'parrot';

UPDATE public.ximatars
SET vector = '{"knowledge": 95, "communication": 65, "drive": 60, "comp_power": 55, "creativity": 45}'::jsonb
WHERE label = 'elephant';

UPDATE public.ximatars
SET vector = '{"drive": 90, "knowledge": 60, "communication": 70, "comp_power": 55, "creativity": 40}'::jsonb
WHERE label = 'horse';

UPDATE public.ximatars
SET vector = '{"creativity": 88, "communication": 82, "knowledge": 70, "comp_power": 65, "drive": 50}'::jsonb
WHERE label = 'chameleon';