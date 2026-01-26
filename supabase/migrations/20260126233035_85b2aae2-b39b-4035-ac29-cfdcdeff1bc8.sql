-- ========================================
-- B1: Right to Deletion Support (GDPR Art. 17)
-- B2: Profiling Opt-Out Support (GDPR Art. 21/22)
-- B4: Harden profiles RLS (Drop permissive SELECT policy)
-- ========================================

-- ===== B2: Add profiling_opt_out column to profiles =====
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profiling_opt_out boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.profiling_opt_out IS 'GDPR Art. 21/22 - User has objected to automated profiling/AI analysis';

-- ===== B4: Drop the overly permissive profiles SELECT policy =====
DROP POLICY IF EXISTS "Authenticated users can view profiles for chat" ON public.profiles;

-- Ensure only own-profile access for regular users (the other policies remain: own profile + admin)
-- The existing "Users can view their own profile" policy (qual: auth.uid() = user_id) is correct
-- The existing "Admins can view all profiles" policy is also correct

-- ===== B1: Create secure RPC for account deletion =====
-- This function will be called from an edge function that handles the full deletion cascade

CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_id uuid;
  v_deleted_tables text[] := ARRAY[]::text[];
  v_anonymized_tables text[] := ARRAY[]::text[];
BEGIN
  -- Verify caller is the user themselves (auth.uid() must match p_user_id)
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only delete your own account';
  END IF;

  -- Get profile ID
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = p_user_id;
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;

  -- ===== MUST DELETE (personal data) =====
  
  -- 1. Delete user_consents (legal consent records)
  DELETE FROM user_consents WHERE user_id = p_user_id;
  v_deleted_tables := array_append(v_deleted_tables, 'user_consents');
  
  -- 2. Delete feed_consumption (feed tracking)
  DELETE FROM feed_consumption WHERE profile_id = v_profile_id;
  v_deleted_tables := array_append(v_deleted_tables, 'feed_consumption');
  
  -- 3. Delete feed_seen_items
  DELETE FROM feed_seen_items WHERE profile_id = v_profile_id;
  v_deleted_tables := array_append(v_deleted_tables, 'feed_seen_items');
  
  -- 4. Delete chat_participants (user's rows)
  DELETE FROM chat_participants WHERE user_id = v_profile_id;
  v_deleted_tables := array_append(v_deleted_tables, 'chat_participants');
  
  -- 5. Delete AI conversations
  DELETE FROM ai_messages WHERE conversation_id IN (
    SELECT id FROM ai_conversations WHERE user_id = p_user_id
  );
  DELETE FROM ai_conversations WHERE user_id = p_user_id;
  v_deleted_tables := array_append(v_deleted_tables, 'ai_conversations');
  
  -- 6. Delete CV uploads (storage path should be cleaned separately)
  DELETE FROM cv_uploads WHERE user_id = p_user_id;
  v_deleted_tables := array_append(v_deleted_tables, 'cv_uploads');
  
  -- 7. Delete assessment_cv_analysis
  DELETE FROM assessment_cv_analysis WHERE user_id = p_user_id;
  v_deleted_tables := array_append(v_deleted_tables, 'assessment_cv_analysis');
  
  -- 8. Delete assessment_open_responses
  DELETE FROM assessment_open_responses WHERE user_id = p_user_id;
  v_deleted_tables := array_append(v_deleted_tables, 'assessment_open_responses');
  
  -- 9. Delete pillar_scores (via assessment_results)
  DELETE FROM pillar_scores WHERE assessment_result_id IN (
    SELECT id FROM assessment_results WHERE user_id = p_user_id
  );
  v_deleted_tables := array_append(v_deleted_tables, 'pillar_scores');
  
  -- 10. Delete assessment_results
  DELETE FROM assessment_results WHERE user_id = p_user_id;
  v_deleted_tables := array_append(v_deleted_tables, 'assessment_results');
  
  -- 11. Delete assessment_answers
  DELETE FROM assessment_answers WHERE result_id IN (
    SELECT id FROM assessment_results WHERE user_id = p_user_id
  );
  v_deleted_tables := array_append(v_deleted_tables, 'assessment_answers');
  
  -- 12. Delete user_scores
  DELETE FROM user_scores WHERE user_id = p_user_id;
  v_deleted_tables := array_append(v_deleted_tables, 'user_scores');
  
  -- 13. Delete notifications
  DELETE FROM notifications WHERE recipient_id = p_user_id OR sender_id = p_user_id;
  v_deleted_tables := array_append(v_deleted_tables, 'notifications');

  -- 14. Delete user_roles
  DELETE FROM user_roles WHERE user_id = p_user_id;
  v_deleted_tables := array_append(v_deleted_tables, 'user_roles');

  -- ===== MAY ANONYMIZE (for audit/business purposes) =====
  
  -- Anonymize chat_messages (keep for thread integrity, remove identity)
  UPDATE chat_messages 
  SET sender_id = '00000000-0000-0000-0000-000000000000',
      body = '[Message from deleted user]'
  WHERE sender_id = v_profile_id;
  v_anonymized_tables := array_append(v_anonymized_tables, 'chat_messages');
  
  -- Anonymize activity_logs (keep for audit, remove identity)
  UPDATE activity_logs
  SET user_id = NULL,
      context = jsonb_set(COALESCE(context, '{}'::jsonb), '{anonymized}', 'true')
  WHERE user_id = p_user_id;
  v_anonymized_tables := array_append(v_anonymized_tables, 'activity_logs');
  
  -- Anonymize challenge_submissions (keep for business analytics)
  UPDATE challenge_submissions
  SET candidate_profile_id = '00000000-0000-0000-0000-000000000000'
  WHERE candidate_profile_id = v_profile_id;
  v_anonymized_tables := array_append(v_anonymized_tables, 'challenge_submissions');
  
  -- ===== DELETE PROFILE (final step before auth.users) =====
  DELETE FROM profiles WHERE user_id = p_user_id;
  v_deleted_tables := array_append(v_deleted_tables, 'profiles');

  -- Return summary (auth.users deletion must happen via admin API separately)
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'profile_id', v_profile_id,
    'deleted_tables', v_deleted_tables,
    'anonymized_tables', v_anonymized_tables,
    'note', 'auth.users record must be deleted via admin API'
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;