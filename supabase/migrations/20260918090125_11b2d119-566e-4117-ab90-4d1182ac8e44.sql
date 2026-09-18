
CREATE TABLE IF NOT EXISTS public.mentor_session_private_notes (
  session_id uuid PRIMARY KEY REFERENCES public.mentor_sessions(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_session_private_notes TO authenticated;
GRANT ALL ON public.mentor_session_private_notes TO service_role;

ALTER TABLE public.mentor_session_private_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentor can manage own private notes"
ON public.mentor_session_private_notes
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.mentor_sessions s
  JOIN public.mentors m ON m.id = s.mentor_id
  WHERE s.id = mentor_session_private_notes.session_id
    AND m.user_id = (SELECT auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.mentor_sessions s
  JOIN public.mentors m ON m.id = s.mentor_id
  WHERE s.id = mentor_session_private_notes.session_id
    AND m.user_id = (SELECT auth.uid())
));

CREATE TRIGGER update_mentor_session_private_notes_updated_at
BEFORE UPDATE ON public.mentor_session_private_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.mentor_session_private_notes (session_id, notes)
SELECT id, notes_private FROM public.mentor_sessions
WHERE notes_private IS NOT NULL AND notes_private <> ''
ON CONFLICT (session_id) DO NOTHING;

ALTER TABLE public.mentor_sessions DROP COLUMN notes_private;

DROP POLICY IF EXISTS "Users can only read their own reactions" ON public.feed_reactions;

CREATE POLICY "Users can only read their own reactions"
ON public.feed_reactions
FOR SELECT
TO authenticated
USING (
  reactor_hash = encode(
    sha256((((SELECT auth.uid())::text || feed_item_id::text) || 'xima_salt')::bytea),
    'hex'
  )
);
