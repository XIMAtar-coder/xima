
ALTER TABLE public.hiring_goal_drafts
  ADD COLUMN IF NOT EXISTS ral_min integer,
  ADD COLUMN IF NOT EXISTS ral_max integer,
  ADD COLUMN IF NOT EXISTS ccnl text;

ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS ral_min integer,
  ADD COLUMN IF NOT EXISTS ral_max integer,
  ADD COLUMN IF NOT EXISTS ccnl text;

CREATE OR REPLACE FUNCTION public.validate_ral_range()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ral_min IS NOT NULL AND NEW.ral_min < 0 THEN
    RAISE EXCEPTION 'ral_min must be >= 0';
  END IF;
  IF NEW.ral_max IS NOT NULL AND NEW.ral_max < 0 THEN
    RAISE EXCEPTION 'ral_max must be >= 0';
  END IF;
  IF NEW.ral_min IS NOT NULL AND NEW.ral_max IS NOT NULL AND NEW.ral_min > NEW.ral_max THEN
    RAISE EXCEPTION 'ral_min (%) must be <= ral_max (%)', NEW.ral_min, NEW.ral_max;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hgd_validate_ral ON public.hiring_goal_drafts;
CREATE TRIGGER trg_hgd_validate_ral
  BEFORE INSERT OR UPDATE OF ral_min, ral_max ON public.hiring_goal_drafts
  FOR EACH ROW EXECUTE FUNCTION public.validate_ral_range();

DROP TRIGGER IF EXISTS trg_jp_validate_ral ON public.job_posts;
CREATE TRIGGER trg_jp_validate_ral
  BEFORE INSERT OR UPDATE OF ral_min, ral_max ON public.job_posts
  FOR EACH ROW EXECUTE FUNCTION public.validate_ral_range();
