-- Migrate professionals data to mentors table and add availability slots for all mentors

-- First, migrate Pietro Cozzi from professionals to mentors
INSERT INTO mentors (
  id,
  name,
  title,
  bio,
  profile_image_url,
  specialties,
  xima_pillars,
  is_active,
  user_id,
  experience_years,
  rating,
  total_sessions
)
SELECT 
  id,
  full_name,
  title,
  COALESCE(locale_bio->>'en', locale_bio->>'it', ''),
  avatar_path,
  COALESCE(specialties, ARRAY[]::text[]),
  COALESCE(xima_pillars, ARRAY[]::text[]),
  true,
  user_id,
  10,
  4.8,
  50
FROM professionals
WHERE full_name = 'Pietro Cozzi'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  bio = EXCLUDED.bio,
  profile_image_url = EXCLUDED.profile_image_url,
  specialties = EXCLUDED.specialties,
  xima_pillars = EXCLUDED.xima_pillars,
  updated_at = now();

-- Migrate Daniel Cracau from professionals to mentors
INSERT INTO mentors (
  id,
  name,
  title,
  bio,
  profile_image_url,
  specialties,
  xima_pillars,
  is_active,
  user_id,
  experience_years,
  rating,
  total_sessions
)
SELECT 
  id,
  full_name,
  title,
  COALESCE(locale_bio->>'en', locale_bio->>'it', ''),
  avatar_path,
  COALESCE(specialties, ARRAY[]::text[]),
  COALESCE(xima_pillars, ARRAY[]::text[]),
  true,
  user_id,
  15,
  4.9,
  120
FROM professionals
WHERE full_name = 'Daniel Cracau'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  bio = EXCLUDED.bio,
  profile_image_url = EXCLUDED.profile_image_url,
  specialties = EXCLUDED.specialties,
  xima_pillars = EXCLUDED.xima_pillars,
  updated_at = now();

-- Update Roberta Fazzeri to ensure all fields are populated
UPDATE mentors
SET 
  bio = 'Senior HR specialist with 12+ years of experience in talent development and career coaching. Passionate about helping professionals discover their unique strengths.',
  specialties = ARRAY['Talent Development', 'Career Coaching', 'HR Strategy'],
  xima_pillars = ARRAY['communication', 'knowledge', 'creativity'],
  experience_years = 12,
  rating = 4.7,
  total_sessions = 80
WHERE name = 'Roberta Fazzeri';

-- Add availability slots for Pietro Cozzi (next 14 weekdays, 09:00-17:00)
DO $$
DECLARE
  pietro_id UUID;
  current_date DATE := CURRENT_DATE + INTERVAL '1 day';
  slot_date DATE;
  slot_hour INT;
  day_counter INT := 0;
BEGIN
  SELECT id INTO pietro_id FROM mentors WHERE name = 'Pietro Cozzi' LIMIT 1;
  
  IF pietro_id IS NOT NULL THEN
    -- Generate slots for next 14 weekdays
    WHILE day_counter < 14 LOOP
      slot_date := current_date + (day_counter || ' days')::INTERVAL;
      
      -- Only weekdays (1=Monday, 5=Friday)
      IF EXTRACT(DOW FROM slot_date) BETWEEN 1 AND 5 THEN
        -- Add slots from 09:00 to 17:00 (every 15 minutes)
        FOR slot_hour IN 9..16 LOOP
          -- Four 15-minute slots per hour
          FOR minute_offset IN 0..3 LOOP
            INSERT INTO mentor_availability_slots (mentor_id, start_time, end_time, is_booked)
            VALUES (
              pietro_id,
              slot_date + (slot_hour || ' hours')::INTERVAL + (minute_offset * 15 || ' minutes')::INTERVAL,
              slot_date + (slot_hour || ' hours')::INTERVAL + ((minute_offset * 15 + 15) || ' minutes')::INTERVAL,
              false
            )
            ON CONFLICT DO NOTHING;
          END LOOP;
        END LOOP;
      END IF;
      
      day_counter := day_counter + 1;
    END LOOP;
  END IF;
END $$;

-- Add availability slots for Daniel Cracau (next 14 weekdays, 10:00-18:00)
DO $$
DECLARE
  daniel_id UUID;
  current_date DATE := CURRENT_DATE + INTERVAL '1 day';
  slot_date DATE;
  slot_hour INT;
  day_counter INT := 0;
BEGIN
  SELECT id INTO daniel_id FROM mentors WHERE name = 'Daniel Cracau' LIMIT 1;
  
  IF daniel_id IS NOT NULL THEN
    -- Generate slots for next 14 weekdays
    WHILE day_counter < 14 LOOP
      slot_date := current_date + (day_counter || ' days')::INTERVAL;
      
      -- Only weekdays (1=Monday, 5=Friday)
      IF EXTRACT(DOW FROM slot_date) BETWEEN 1 AND 5 THEN
        -- Add slots from 10:00 to 18:00 (every 15 minutes)
        FOR slot_hour IN 10..17 LOOP
          -- Four 15-minute slots per hour
          FOR minute_offset IN 0..3 LOOP
            INSERT INTO mentor_availability_slots (mentor_id, start_time, end_time, is_booked)
            VALUES (
              daniel_id,
              slot_date + (slot_hour || ' hours')::INTERVAL + (minute_offset * 15 || ' minutes')::INTERVAL,
              slot_date + (slot_hour || ' hours')::INTERVAL + ((minute_offset * 15 + 15) || ' minutes')::INTERVAL,
              false
            )
            ON CONFLICT DO NOTHING;
          END LOOP;
        END LOOP;
      END IF;
      
      day_counter := day_counter + 1;
    END LOOP;
  END IF;
END $$;