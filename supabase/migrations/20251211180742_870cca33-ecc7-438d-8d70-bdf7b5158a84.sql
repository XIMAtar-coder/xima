-- Add google_calendar_id to the first mentor (Daniel Rodriguez) for testing
-- This assumes you have a Google Calendar ID to use - replace with actual calendar ID
UPDATE mentors 
SET availability = jsonb_build_object(
  'google_calendar_id', 'primary',
  'timezone', 'Europe/Rome'
)
WHERE id = 'c66de3f0-98bd-4f31-b1eb-89b9edcdb2fa';