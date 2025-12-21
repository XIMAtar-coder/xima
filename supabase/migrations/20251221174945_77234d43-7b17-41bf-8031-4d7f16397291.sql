-- Create a trigger function to insert notification when a challenge invitation is created
CREATE OR REPLACE FUNCTION public.notify_challenge_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_auth_uid UUID;
  company_name_val TEXT;
  role_title_val TEXT;
  challenge_title_val TEXT;
BEGIN
  -- Get the auth user_id from profiles table using candidate_profile_id
  SELECT user_id INTO recipient_auth_uid
  FROM profiles
  WHERE id = NEW.candidate_profile_id;

  -- Get company name from business_profiles
  SELECT company_name INTO company_name_val
  FROM business_profiles
  WHERE user_id = NEW.business_id;

  -- Get role title from hiring_goal_drafts
  SELECT role_title INTO role_title_val
  FROM hiring_goal_drafts
  WHERE id = NEW.hiring_goal_id;

  -- Get challenge title if challenge_id exists
  IF NEW.challenge_id IS NOT NULL THEN
    SELECT title INTO challenge_title_val
    FROM business_challenges
    WHERE id = NEW.challenge_id;
  END IF;

  -- Only create notification if we found the recipient
  IF recipient_auth_uid IS NOT NULL THEN
    INSERT INTO notifications (
      recipient_id,
      sender_id,
      type,
      related_id,
      title,
      message
    ) VALUES (
      recipient_auth_uid,
      NEW.business_id,
      'challenge_invitation',
      NEW.id,  -- invitation_id, NOT challenge_id
      COALESCE('Challenge Invitation from ' || company_name_val, 'New Challenge Invitation'),
      COALESCE(
        'You have been invited to complete a challenge for the ' || role_title_val || ' role.',
        'You have been invited to complete a challenge.'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on challenge_invitations table
DROP TRIGGER IF EXISTS on_challenge_invitation_created ON challenge_invitations;
CREATE TRIGGER on_challenge_invitation_created
  AFTER INSERT ON challenge_invitations
  FOR EACH ROW
  EXECUTE FUNCTION notify_challenge_invitation();