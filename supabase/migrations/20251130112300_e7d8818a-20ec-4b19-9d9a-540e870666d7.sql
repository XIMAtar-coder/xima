-- Add xima_pillars column to professionals table
ALTER TABLE professionals 
ADD COLUMN IF NOT EXISTS xima_pillars text[] DEFAULT '{}';

-- Update existing professionals with appropriate XIMA pillars based on their specialties
UPDATE professionals 
SET xima_pillars = ARRAY['drive', 'communication', 'knowledge']
WHERE full_name = 'Pietro Cozzi';

UPDATE professionals 
SET xima_pillars = ARRAY['computational_power', 'knowledge', 'creativity']
WHERE full_name = 'Daniel Cracau';

UPDATE professionals 
SET xima_pillars = ARRAY['communication', 'drive', 'knowledge']
WHERE full_name = 'Roberta Fazzeri';

COMMENT ON COLUMN professionals.xima_pillars IS 'XIMA pillars this mentor specializes in (computational_power, communication, knowledge, creativity, drive)';