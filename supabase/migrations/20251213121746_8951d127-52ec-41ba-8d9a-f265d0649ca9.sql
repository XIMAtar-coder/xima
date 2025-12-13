-- Step 1: Create security definer function to check thread participation
CREATE OR REPLACE FUNCTION public.is_thread_participant(p_thread_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE thread_id = p_thread_id
      AND user_id = p_user_id
  )
$$;

-- Step 2: Drop existing problematic policies on chat_participants
DROP POLICY IF EXISTS "Users can view participants in their threads" ON public.chat_participants;
DROP POLICY IF EXISTS "Thread creator can add participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Participants can view thread participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Thread creators can add participants" ON public.chat_participants;

-- Step 3: Drop existing problematic policies on chat_messages
DROP POLICY IF EXISTS "Participants can read messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Recipients can update message read status" ON public.chat_messages;

-- Step 4: Drop existing problematic policies on chat_threads
DROP POLICY IF EXISTS "Participants can view their threads" ON public.chat_threads;
DROP POLICY IF EXISTS "Authenticated users can create chat threads" ON public.chat_threads;

-- Step 5: Recreate chat_threads policies (no recursion)
CREATE POLICY "Users can create threads"
ON public.chat_threads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view threads they created or participate in"
ON public.chat_threads
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() 
  OR public.is_thread_participant(id, auth.uid())
);

-- Step 6: Recreate chat_participants policies using helper function
CREATE POLICY "Thread creator can add both participants"
ON public.chat_participants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_threads
    WHERE id = thread_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can view participants in threads they belong to"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.chat_threads
    WHERE id = thread_id AND created_by = auth.uid()
  )
);

-- Step 7: Recreate chat_messages policies using helper function
CREATE POLICY "Participants can read thread messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (public.is_thread_participant(thread_id, auth.uid()));

CREATE POLICY "Participants can send thread messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_thread_participant(thread_id, auth.uid())
);

CREATE POLICY "Recipients can mark messages as read"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  public.is_thread_participant(thread_id, auth.uid())
  AND sender_id <> auth.uid()
);