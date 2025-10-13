-- Check and verify the professionals table structure, then update
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'professionals'
ORDER BY ordinal_position;