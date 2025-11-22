-- Insert sample mentors into the mentors table
INSERT INTO mentors (name, title, bio, profile_image_url, specialties, xima_pillars, is_active, experience_years, hourly_rate)
VALUES 
  (
    'Dr. Maria Rossi',
    'Senior Career Coach & Leadership Expert',
    'Specializing in tech career development and leadership coaching. Over 15 years of experience helping professionals reach their full potential.',
    '/avatars/roberta-fazzeri.jpg',
    ARRAY['Career Development', 'Leadership', 'Technical Skills', 'Communication'],
    ARRAY['communication', 'drive', 'knowledge'],
    true,
    15,
    150
  ),
  (
    'Daniel Rodriguez',
    'Data Science & Analytics Mentor',
    'Expert in data science, machine learning, and analytical thinking. Passionate about helping others master computational skills.',
    '/avatars/daniel-cracau.jpg',
    ARRAY['Data Science', 'Machine Learning', 'Problem Solving', 'Analytics'],
    ARRAY['computational_power', 'knowledge', 'creativity'],
    true,
    12,
    175
  ),
  (
    'Pietro Martinelli',
    'Innovation & Creativity Coach',
    'Helping professionals unlock their creative potential and drive innovation in their careers. Specializes in design thinking and strategic innovation.',
    '/avatars/pietro-cozzi.jpg',
    ARRAY['Innovation', 'Design Thinking', 'Creativity', 'Strategic Planning'],
    ARRAY['creativity', 'communication', 'drive'],
    true,
    10,
    140
  )
ON CONFLICT (id) DO NOTHING;

-- Get the mentor IDs we just created (or existing ones)
WITH mentor_data AS (
  SELECT id, name FROM mentors WHERE name IN ('Dr. Maria Rossi', 'Daniel Rodriguez', 'Pietro Martinelli')
)
-- Create availability slots for each mentor for the next 2 weeks
INSERT INTO mentor_availability_slots (mentor_id, start_time, end_time, is_booked)
SELECT 
  m.id as mentor_id,
  slot_time as start_time,
  slot_time + interval '15 minutes' as end_time,
  false as is_booked
FROM mentor_data m
CROSS JOIN LATERAL (
  SELECT generate_series(
    date_trunc('day', now() + interval '1 day') + time '09:00',
    date_trunc('day', now() + interval '14 days') + time '17:00',
    interval '1 hour'
  ) as slot_time
  UNION ALL
  SELECT generate_series(
    date_trunc('day', now() + interval '1 day') + time '09:30',
    date_trunc('day', now() + interval '14 days') + time '17:00',
    interval '1 hour'
  ) as slot_time
  UNION ALL
  SELECT generate_series(
    date_trunc('day', now() + interval '1 day') + time '14:00',
    date_trunc('day', now() + interval '14 days') + time '17:00',
    interval '1 hour'
  ) as slot_time
  UNION ALL
  SELECT generate_series(
    date_trunc('day', now() + interval '1 day') + time '14:30',
    date_trunc('day', now() + interval '14 days') + time '17:00',
    interval '1 hour'
  ) as slot_time
) slots
ON CONFLICT DO NOTHING;