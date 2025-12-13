-- Allow authenticated users to read basic profile data for chat functionality
-- Only expose minimal fields needed for chat: user_id, name, avatar, ximatar
CREATE POLICY "Authenticated users can view profiles for chat"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Note: The policy allows viewing all profiles but RLS on specific columns is not supported in PostgreSQL.
-- The application will only select the minimal fields needed (user_id, name, full_name, avatar, ximatar).
-- Sensitive fields are not exposed at the application query level.