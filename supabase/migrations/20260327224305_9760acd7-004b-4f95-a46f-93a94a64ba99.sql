-- Performance indexes for common query patterns across edge functions
CREATE INDEX IF NOT EXISTS idx_cv_identity_user ON cv_identity_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_cv_credentials_user ON cv_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_trajectory_user_date ON pillar_trajectory_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_progress_user_status ON growth_hub_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_candidate ON challenge_submissions(candidate_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup ON ai_result_cache(user_id, function_name);
CREATE INDEX IF NOT EXISTS idx_ai_budget_lookup ON ai_usage_budget(user_id, month_key);
CREATE INDEX IF NOT EXISTS idx_ai_context_user ON user_ai_context(user_id);