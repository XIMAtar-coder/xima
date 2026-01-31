-- Step 5: Add video room columns to mentor_sessions

-- Add video room columns for session room functionality
ALTER TABLE public.mentor_sessions 
ADD COLUMN IF NOT EXISTS video_provider text,
ADD COLUMN IF NOT EXISTS video_room_name text,
ADD COLUMN IF NOT EXISTS video_room_url text,
ADD COLUMN IF NOT EXISTS video_room_created_at timestamptz;

-- Add a comment for documentation
COMMENT ON COLUMN public.mentor_sessions.video_provider IS 'Video provider (jitsi, daily, etc.)';
COMMENT ON COLUMN public.mentor_sessions.video_room_name IS 'Unique room name for the video session';
COMMENT ON COLUMN public.mentor_sessions.video_room_url IS 'Full URL to the video room';
COMMENT ON COLUMN public.mentor_sessions.video_room_created_at IS 'Timestamp when the video room was created';

-- RLS policies for video room access are already covered by existing mentor_sessions policies
-- Both mentor and candidate can read their own sessions which includes video_room_url