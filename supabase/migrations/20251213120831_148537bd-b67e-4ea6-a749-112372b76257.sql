-- Fix RLS policies for chat functionality

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "threads: creator insert" ON public.chat_threads;
DROP POLICY IF EXISTS "threads: participant read" ON public.chat_threads;
DROP POLICY IF EXISTS "participants: in-thread" ON public.chat_participants;
DROP POLICY IF EXISTS "messages: participant" ON public.chat_messages;

-- Chat Threads: Allow authenticated users to create threads
CREATE POLICY "Authenticated users can create chat threads"
ON public.chat_threads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Chat Threads: Allow participants to view threads they're in
CREATE POLICY "Participants can view their threads"
ON public.chat_threads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.thread_id = chat_threads.id
    AND cp.user_id = auth.uid()
  )
  OR created_by = auth.uid()
);

-- Chat Participants: Allow thread creator to add participants
CREATE POLICY "Thread creator can add participants"
ON public.chat_participants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_threads ct
    WHERE ct.id = thread_id
    AND ct.created_by = auth.uid()
  )
);

-- Chat Participants: Allow users to view participants in threads they belong to
CREATE POLICY "Users can view participants in their threads"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp2
    WHERE cp2.thread_id = chat_participants.thread_id
    AND cp2.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Chat Messages: Allow participants to insert messages in their threads
CREATE POLICY "Participants can send messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.thread_id = chat_messages.thread_id
    AND cp.user_id = auth.uid()
  )
);

-- Chat Messages: Allow participants to read messages in their threads
CREATE POLICY "Participants can read messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.thread_id = chat_messages.thread_id
    AND cp.user_id = auth.uid()
  )
);

-- Chat Messages: Allow recipients to update read status
CREATE POLICY "Recipients can update message read status"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.thread_id = chat_messages.thread_id
    AND cp.user_id = auth.uid()
  )
  AND sender_id != auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.thread_id = chat_messages.thread_id
    AND cp.user_id = auth.uid()
  )
);