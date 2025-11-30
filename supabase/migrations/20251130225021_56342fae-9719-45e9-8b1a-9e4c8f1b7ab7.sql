-- First, insert Roberta Fazzeri into the mentors table
INSERT INTO mentors (
  id,
  name,
  title,
  bio,
  profile_image_url,
  specialties,
  xima_pillars,
  is_active,
  experience_years,
  rating
) VALUES (
  '928dbd7d-1d4f-4abd-b069-d6bb18fd725e',
  'Roberta Fazzeri',
  'People & Culture Advisor',
  'HR advisor for culture and org development',
  'avatars/roberta-fazzeri.jpg',
  ARRAY['HR', 'Culture'],
  ARRAY['communication', 'drive', 'knowledge'],
  true,
  10,
  4.8
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  bio = EXCLUDED.bio,
  profile_image_url = EXCLUDED.profile_image_url,
  is_active = EXCLUDED.is_active;

-- Now add availability slots for the next 14 days
DO $$
DECLARE
  mentor_id_var UUID := '928dbd7d-1d4f-4abd-b069-d6bb18fd725e';
  current_date DATE := CURRENT_DATE;
  slot_date DATE;
  slot_hour INT;
BEGIN
  -- Loop through next 14 days
  FOR day_offset IN 1..14 LOOP
    slot_date := current_date + day_offset;
    
    -- Skip weekends (0 = Sunday, 6 = Saturday)
    IF EXTRACT(DOW FROM slot_date) NOT IN (0, 6) THEN
      -- Add morning slots (9:00, 10:00)
      FOR slot_hour IN 9..10 LOOP
        INSERT INTO mentor_availability_slots (
          mentor_id,
          start_time,
          end_time,
          is_booked
        ) VALUES (
          mentor_id_var,
          slot_date + (slot_hour || ' hours')::interval,
          slot_date + ((slot_hour || ' hours')::interval + '15 minutes'::interval),
          false
        );
      END LOOP;
      
      -- Add afternoon slots (14:00, 15:00, 16:00)
      FOR slot_hour IN 14..16 LOOP
        INSERT INTO mentor_availability_slots (
          mentor_id,
          start_time,
          end_time,
          is_booked
        ) VALUES (
          mentor_id_var,
          slot_date + (slot_hour || ' hours')::interval,
          slot_date + ((slot_hour || ' hours')::interval + '15 minutes'::interval),
          false
        );
      END LOOP;
    END IF;
  END LOOP;
END $$;