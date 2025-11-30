-- Now assign Pietro Cozzi as mentor to the current user
DO $$
DECLARE
  v_profile_id uuid;
  v_pietro_id uuid;
BEGIN
  -- Get current user's profile ID
  SELECT id INTO v_profile_id 
  FROM profiles 
  WHERE user_id = '116436f8-378b-43fc-a7ae-a59c99fc19d9';
  
  -- Get Pietro Cozzi's professional ID
  SELECT id INTO v_pietro_id 
  FROM professionals 
  WHERE full_name = 'Pietro Cozzi';
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;
  
  IF v_pietro_id IS NULL THEN
    RAISE EXCEPTION 'Pietro Cozzi not found in professionals';
  END IF;
  
  -- Delete any existing mentor match
  DELETE FROM mentor_matches WHERE mentee_user_id = v_profile_id;
  
  -- Create new mentor match
  INSERT INTO mentor_matches (mentee_user_id, mentor_user_id, assigned_by, reason)
  VALUES (
    v_profile_id,
    v_pietro_id,
    'system_test',
    jsonb_build_object(
      'professional_name', 'Pietro Cozzi',
      'specialties', ARRAY['Leadership', 'GTM'],
      'xima_pillars', ARRAY['drive', 'communication', 'knowledge'],
      'assigned_at', now()
    )
  );
  
  -- Update profile's mentor field with Pietro's data
  UPDATE profiles 
  SET mentor = jsonb_build_object(
    'name', 'Pietro Cozzi',
    'title', 'Product & Growth Leader',
    'avatar_url', 'avatars/pietro-cozzi.jpg',
    'calendar_url', NULL,
    'bio', 'Leader di prodotto e crescita, focus su GTM e metriche',
    'specialties', ARRAY['Leadership', 'GTM'],
    'xima_pillars', ARRAY['drive', 'communication', 'knowledge']
  )
  WHERE id = v_profile_id;
  
  RAISE NOTICE 'Successfully assigned Pietro Cozzi (%) as mentor to profile %', v_pietro_id, v_profile_id;
END $$;