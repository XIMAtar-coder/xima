
-- pgvector should already be enabled (used elsewhere). Safe guard:
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- =========================================================
-- poc_candidate_embeddings
-- =========================================================
CREATE TABLE IF NOT EXISTS public.poc_candidate_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_user_id uuid NOT NULL UNIQUE,
  source_text text NOT NULL,
  source_hash text NOT NULL,
  embedding extensions.vector(1536) NOT NULL,
  model text NOT NULL,
  dimensions int NOT NULL DEFAULT 1536,
  token_count int,
  task_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.poc_candidate_embeddings TO authenticated;
GRANT ALL ON public.poc_candidate_embeddings TO service_role;
ALTER TABLE public.poc_candidate_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poc_candidate_embeddings admin read"
  ON public.poc_candidate_embeddings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS poc_candidate_embeddings_hnsw
  ON public.poc_candidate_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops);

CREATE INDEX IF NOT EXISTS poc_candidate_embeddings_hash_idx
  ON public.poc_candidate_embeddings (source_hash);

-- =========================================================
-- poc_goal_embeddings
-- =========================================================
CREATE TABLE IF NOT EXISTS public.poc_goal_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_goal_id uuid NOT NULL UNIQUE,
  source_text text NOT NULL,
  source_hash text NOT NULL,
  embedding extensions.vector(1536) NOT NULL,
  model text NOT NULL,
  dimensions int NOT NULL DEFAULT 1536,
  token_count int,
  task_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.poc_goal_embeddings TO authenticated;
GRANT ALL ON public.poc_goal_embeddings TO service_role;
ALTER TABLE public.poc_goal_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poc_goal_embeddings admin read"
  ON public.poc_goal_embeddings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS poc_goal_embeddings_hnsw
  ON public.poc_goal_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops);

-- =========================================================
-- poc_match_runs (audit)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.poc_match_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_goal_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode IN ('rerank','discovery')),
  k int NOT NULL,
  candidate_ids_count int,
  top_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  baseline_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  overlap_count int,
  novelty_count int,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.poc_match_runs TO authenticated;
GRANT ALL ON public.poc_match_runs TO service_role;
ALTER TABLE public.poc_match_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poc_match_runs admin read"
  ON public.poc_match_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS poc_match_runs_goal_idx
  ON public.poc_match_runs (hiring_goal_id, created_at DESC);

-- =========================================================
-- updated_at triggers
-- =========================================================
CREATE OR REPLACE FUNCTION public.poc_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_poc_candidate_embeddings_updated_at ON public.poc_candidate_embeddings;
CREATE TRIGGER trg_poc_candidate_embeddings_updated_at
  BEFORE UPDATE ON public.poc_candidate_embeddings
  FOR EACH ROW EXECUTE FUNCTION public.poc_set_updated_at();

DROP TRIGGER IF EXISTS trg_poc_goal_embeddings_updated_at ON public.poc_goal_embeddings;
CREATE TRIGGER trg_poc_goal_embeddings_updated_at
  BEFORE UPDATE ON public.poc_goal_embeddings
  FOR EACH ROW EXECUTE FUNCTION public.poc_set_updated_at();

-- =========================================================
-- RPC poc_search_candidates — service_role only
-- =========================================================
CREATE OR REPLACE FUNCTION public.poc_search_candidates(
  p_goal_id uuid,
  p_k int DEFAULT 10,
  p_candidate_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (candidate_user_id uuid, similarity double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT ce.candidate_user_id,
         (1 - (ce.embedding <=> ge.embedding))::double precision AS similarity
  FROM public.poc_candidate_embeddings ce
  CROSS JOIN public.poc_goal_embeddings ge
  WHERE ge.hiring_goal_id = p_goal_id
    AND (p_candidate_ids IS NULL OR ce.candidate_user_id = ANY(p_candidate_ids))
  ORDER BY ce.embedding <=> ge.embedding
  LIMIT LEAST(GREATEST(p_k, 1), 200);
$$;

REVOKE EXECUTE ON FUNCTION public.poc_search_candidates(uuid, int, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.poc_search_candidates(uuid, int, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.poc_search_candidates(uuid, int, uuid[]) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.poc_search_candidates(uuid, int, uuid[]) TO service_role;
