-- The Growth Hub asked the model to write titles, authors and URLs itself.
-- On 28/09/2026 a "Politecnico di Milano" course opened Rick Astley, an edX
-- course was a 404, three Spotify podcasts did not exist and some books had
-- authors nobody could find. From now on resources come from this catalogue:
-- the model may only choose among rows here, never write a link.
--
-- A row enters as 'pending'. It becomes 'active' (visible, choosable) only
-- after a person approved it and the link answered. A link that stops
-- answering goes to 'broken'; a resource we no longer want goes to 'retired'.
CREATE TABLE public.growth_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL CHECK (resource_type IN ('course', 'book', 'podcast')),
  title text NOT NULL,
  author_or_host text,
  platform text NOT NULL,
  url text NOT NULL UNIQUE CHECK (url ~ '^https://'),
  language text NOT NULL CHECK (language IN ('it', 'en', 'es')),
  primary_pillar text NOT NULL
    CHECK (primary_pillar IN ('drive', 'computational_power', 'communication', 'creativity', 'knowledge')),
  secondary_pillar text
    CHECK (secondary_pillar IN ('drive', 'computational_power', 'communication', 'creativity', 'knowledge')),
  difficulty text NOT NULL DEFAULT 'base' CHECK (difficulty IN ('base', 'intermedio', 'avanzato')),
  -- Only what the source itself states; never an estimate.
  duration_hours numeric(5,1) CHECK (duration_hours IS NULL OR duration_hours > 0),
  is_free boolean NOT NULL,
  summary_it text NOT NULL,
  summary_en text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'broken', 'retired')),
  evidence_url text,
  approved_by text,
  approved_at timestamptz,
  last_checked_at timestamptz,
  last_check_status integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (secondary_pillar IS NULL OR secondary_pillar <> primary_pillar),
  CHECK (status <> 'active' OR approved_at IS NOT NULL)
);

CREATE INDEX growth_resources_pick_idx
  ON public.growth_resources (primary_pillar, language, resource_type)
  WHERE status = 'active';

CREATE TRIGGER growth_resources_updated_at
  BEFORE UPDATE ON public.growth_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Signed-in users read the active catalogue; nobody writes it from the app
-- (the service role bypasses RLS for the generator and the link checker).
ALTER TABLE public.growth_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users read active growth resources"
  ON public.growth_resources FOR SELECT
  TO authenticated
  USING (status = 'active');

REVOKE ALL ON public.growth_resources FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.growth_resources FROM authenticated;

-- Progress rows remember which catalogue entry they came from, so a link
-- that breaks later can be traced to every path that uses it.
ALTER TABLE public.growth_hub_progress
  ADD COLUMN catalog_resource_id uuid REFERENCES public.growth_resources (id) ON DELETE SET NULL;

CREATE INDEX growth_hub_progress_catalog_resource_idx
  ON public.growth_hub_progress (catalog_resource_id)
  WHERE catalog_resource_id IS NOT NULL;
