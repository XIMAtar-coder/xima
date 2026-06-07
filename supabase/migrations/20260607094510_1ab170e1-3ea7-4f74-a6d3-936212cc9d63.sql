ALTER TABLE public.pillar_trajectory_log
  ALTER COLUMN drive_delta TYPE numeric(5,2),
  ALTER COLUMN computational_power_delta TYPE numeric(5,2),
  ALTER COLUMN communication_delta TYPE numeric(5,2),
  ALTER COLUMN creativity_delta TYPE numeric(5,2),
  ALTER COLUMN knowledge_delta TYPE numeric(5,2);