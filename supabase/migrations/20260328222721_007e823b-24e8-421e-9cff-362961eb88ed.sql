
-- Add free session tracking columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS free_mentor_session_used BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mentor_messages_sent INTEGER DEFAULT 0;

-- Create trigger: auto-create chat thread when mentor is matched
CREATE OR REPLACE FUNCTION create_mentor_chat_thread()
RETURNS trigger AS $$
DECLARE
  mentor_profile_id UUID;
  mentor_name TEXT;
  candidate_name TEXT;
  new_thread_id UUID;
  existing_thread UUID;
BEGIN
  -- Get mentor's profile.id and name via mentors table
  SELECT p.id, COALESCE(m.name, p.full_name, p.name) 
  INTO mentor_profile_id, mentor_name
  FROM mentors m
  LEFT JOIN profiles p ON p.user_id = m.user_id
  WHERE m.user_id = NEW.mentor_user_id;

  IF mentor_profile_id IS NULL THEN
    RAISE WARNING 'create_mentor_chat_thread: no profile for mentor_user_id %', NEW.mentor_user_id;
    RETURN NEW;
  END IF;

  -- Get candidate name (mentee_user_id references profiles.id)
  SELECT COALESCE(p.full_name, p.name) INTO candidate_name
  FROM profiles p WHERE p.id = NEW.mentee_user_id;

  -- Check if thread already exists
  SELECT t.id INTO existing_thread
  FROM chat_threads t
  JOIN chat_participants cp1 ON cp1.thread_id = t.id AND cp1.user_id = NEW.mentee_user_id
  JOIN chat_participants cp2 ON cp2.thread_id = t.id AND cp2.user_id = mentor_profile_id
  WHERE t.thread_type = 'mentor_candidate'::thread_type_enum
  LIMIT 1;

  IF existing_thread IS NOT NULL THEN RETURN NEW; END IF;

  -- Get candidate's auth user_id for created_by
  DECLARE candidate_auth_id UUID;
  BEGIN
    SELECT p.user_id INTO candidate_auth_id FROM profiles p WHERE p.id = NEW.mentee_user_id;
  END;

  -- Create thread
  INSERT INTO chat_threads (thread_type, topic, created_by, metadata)
  VALUES (
    'mentor_candidate'::thread_type_enum,
    COALESCE(mentor_name, 'Your Mentor') || ' & ' || COALESCE(candidate_name, 'Candidate'),
    candidate_auth_id,
    jsonb_build_object('mentor_user_id', NEW.mentor_user_id, 'mentee_profile_id', NEW.mentee_user_id, 'mentor_profile_id', mentor_profile_id)
  )
  RETURNING id INTO new_thread_id;

  -- Add participants (using profiles.id)
  INSERT INTO chat_participants (thread_id, user_id, role) VALUES
    (new_thread_id, NEW.mentee_user_id, 'candidate'),
    (new_thread_id, mentor_profile_id, 'mentor');

  -- Send welcome system message
  INSERT INTO chat_messages (thread_id, sender_id, body, lang) VALUES
    (new_thread_id, mentor_profile_id,
     'Welcome! I''m your XIMA mentor. I can see your XIMAtar profile and growth areas. Feel free to ask me anything about your professional development — your first conversation is free.',
     'en');

  -- Create feed item
  BEGIN
    INSERT INTO feed_items (user_id, feed_type, title, body, icon, action_url, action_label, actor_type, actor_name, priority)
    SELECT
      p.user_id,
      'actor_interaction',
      COALESCE(mentor_name, 'Your mentor') || ' is ready to chat',
      'Your mentor has been assigned and a conversation is waiting for you. Your first session is free — ask about your growth path, CV tension, or career direction.',
      'message-circle',
      '/messages',
      'Open Chat',
      'mentor',
      mentor_name,
      3
    FROM profiles p WHERE p.id = NEW.mentee_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'feed_items insert in create_mentor_chat_thread failed: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_mentor_chat_thread failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_mentor_chat ON mentor_matches;
CREATE TRIGGER trg_mentor_chat
  AFTER INSERT ON mentor_matches
  FOR EACH ROW
  EXECUTE FUNCTION create_mentor_chat_thread();

-- Feed trigger for new messages
CREATE OR REPLACE FUNCTION feed_on_new_message()
RETURNS trigger AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Get sender name
  SELECT COALESCE(p.full_name, p.name, 'Someone') INTO sender_name
  FROM profiles p WHERE p.id = NEW.sender_id;

  -- Notify other participants
  INSERT INTO feed_items (user_id, feed_type, title, body, icon, action_url, action_label, actor_type, actor_name, priority)
  SELECT
    p.user_id,
    'actor_interaction',
    sender_name || ' sent you a message',
    substring(NEW.body from 1 for 100) || CASE WHEN length(NEW.body) > 100 THEN '...' ELSE '' END,
    'message-circle',
    '/messages',
    'Open Chat',
    COALESCE(cp.role, 'candidate'),
    sender_name,
    2
  FROM chat_participants cp
  JOIN profiles p ON p.id = cp.user_id
  WHERE cp.thread_id = NEW.thread_id AND cp.user_id != NEW.sender_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'feed_on_new_message failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_feed_new_message ON chat_messages;
CREATE TRIGGER trg_feed_new_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION feed_on_new_message();
