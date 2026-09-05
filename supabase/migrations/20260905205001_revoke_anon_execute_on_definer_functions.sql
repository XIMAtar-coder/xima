-- 23 SECURITY DEFINER functions were executable by the anon role. Tested: the
-- admin_get_* ones refuse anon internally ("Unauthorized"/"forbidden"), so
-- nothing leaked — but a single missing internal check in any future function
-- would have been a public endpoint. None of these has a legitimate anonymous
-- caller. Grants now match who actually calls them.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any(array[
      'admin_get_ai_budget_overview','admin_get_ai_by_function','admin_get_ai_by_model',
      'admin_get_ai_cache_stats','admin_get_ai_costs_summary','admin_get_ai_daily_trend',
      'admin_get_ai_quality_kpis','admin_get_ai_recent_errors','admin_get_business_funnel',
      'admin_get_candidate_analytics','admin_get_candidate_funnel','admin_get_costs_summary',
      'admin_get_feed_overview','admin_get_interactions','admin_get_metrics_catalog',
      'admin_get_metrics_trend','admin_get_overview','admin_get_quality_indicators',
      'admin_get_xima_evolution','admin_list_costs','assign_subscriber_no',
      'compute_ai_cost_usd','get_submission_percentile'])
  loop
    execute format('revoke execute on function %s from anon, public', r.sig);
  end loop;
end $$;
