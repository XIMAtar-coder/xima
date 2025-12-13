-- Drop existing policies on chat_threads that use auth.uid() directly
DROP POLICY IF EXISTS "Users can create threads" ON public.chat_threads;
DROP POLICY IF EXISTS "Users can view threads they created or participate in" ON public.chat_threads;

-- Create helper function to get profile id from auth uid
CREATE OR REPLACE FUNCTION public.get_profile_id_for_auth_user(p_auth_uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = p_auth_uid LIMIT 1
$$;

-- Recreate chat_threads policies using profile.id
CREATE POLICY "Users can create threads"
ON public.chat_threads
FOR INSERT
TO authenticated
WITH CHECK (created_by = public.get_profile_id_for_auth_user(auth.uid()));

CREATE POLICY "Users can view threads they created or participate in"
ON public.chat_threads
FOR SELECT
TO authenticated
USING (
  created_by = public.get_profile_id_for_auth_user(auth.uid()) 
  OR public.is_thread_participant(id, public.get_profile_id_for_auth_user(auth.uid()))
);

-- Update chat_participants policies to use profile.id
DROP POLICY IF EXISTS "Thread creator can add both participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view participants in threads they belong to" ON public.chat_participants;

CREATE POLICY "Thread creator can add both participants"
ON public.chat_participants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_threads
    WHERE chat_threads.id = chat_participants.thread_id
    AND chat_threads.created_by = public.get_profile_id_for_auth_user(auth.uid())
  )
);

CREATE POLICY "Users can view participants in threads they belong to"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (
  user_id = public.get_profile_id_for_auth_user(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.chat_threads
    WHERE chat_threads.id = chat_participants.thread_id
    AND chat_threads.created_by = public.get_profile_id_for_auth_user(auth.uid())
  )
);

-- Update chat_messages policies to use profile.id
DROP POLICY IF EXISTS "Participants can read thread messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can send thread messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.chat_messages;

CREATE POLICY "Participants can read thread messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (public.is_thread_participant(thread_id, public.get_profile_id_for_auth_user(auth.uid())));

CREATE POLICY "Participants can send thread messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = public.get_profile_id_for_auth_user(auth.uid())
  AND public.is_thread_participant(thread_id, public.get_profile_id_for_auth_user(auth.uid()))
);

CREATE POLICY "Recipients can mark messages as read"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  public.is_thread_participant(thread_id, public.get_profile_id_for_auth_user(auth.uid()))
  AND sender_id <> public.get_profile_id_for_auth_user(auth.uid())
);