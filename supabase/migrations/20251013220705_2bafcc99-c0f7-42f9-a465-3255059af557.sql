-- Add vector column to ximatars table for similarity matching
alter table public.ximatars
  add column if not exists vector jsonb not null default '{}'::jsonb;

-- Seed/update the 12 XIMAtar types with their pillar vectors
-- These vectors represent the archetype center in 5D space (0-100 for each pillar)
insert into public.ximatars (label, image_url, vector) values
('lion', 'public/ximatars/lion.png', '{"comp_power":70,"communication":80,"knowledge":65,"creativity":55,"drive":90}'),
('owl', 'public/ximatars/owl.png', '{"comp_power":85,"communication":60,"knowledge":90,"creativity":45,"drive":60}'),
('dolphin', 'public/ximatars/dolphin.png', '{"comp_power":55,"communication":85,"knowledge":60,"creativity":65,"drive":65}'),
('fox', 'public/ximatars/fox.png', '{"comp_power":60,"communication":85,"knowledge":55,"creativity":75,"drive":70}'),
('bear', 'public/ximatars/bear.png', '{"comp_power":70,"communication":60,"knowledge":70,"creativity":40,"drive":80}'),
('cat', 'public/ximatars/cat.png', '{"comp_power":75,"communication":55,"knowledge":80,"creativity":60,"drive":55}'),
('bee', 'public/ximatars/bee.png', '{"comp_power":65,"communication":60,"knowledge":65,"creativity":40,"drive":75}'),
('parrot', 'public/ximatars/parrot.png', '{"comp_power":50,"communication":90,"knowledge":55,"creativity":70,"drive":60}'),
('elephant', 'public/ximatars/elephant.png', '{"comp_power":70,"communication":70,"knowledge":85,"creativity":45,"drive":65}'),
('wolf', 'public/ximatars/wolf.png', '{"comp_power":70,"communication":75,"knowledge":65,"creativity":55,"drive":80}'),
('chameleon', 'public/ximatars/chameleon.png', '{"comp_power":60,"communication":70,"knowledge":60,"creativity":80,"drive":65}'),
('horse', 'public/ximatars/horse.png', '{"comp_power":60,"communication":60,"knowledge":60,"creativity":45,"drive":90}')
on conflict (label) do update 
  set vector = excluded.vector,
      image_url = excluded.image_url;

-- Add columns to profiles for permanent XIMAtar assignment
alter table public.profiles
  add column if not exists ximatar_assigned_at timestamptz;

-- Update assessment_results to include field_key, language, and top3 matches
alter table public.assessment_results
  add column if not exists field_key text check (field_key in ('science_tech','business_leadership','arts_creative','service_ops')),
  add column if not exists language text not null default 'it',
  add column if not exists pillars jsonb,
  add column if not exists top3 jsonb;