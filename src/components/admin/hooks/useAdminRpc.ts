import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type OverviewPayload = {
  candidates_total: number;
  candidates_active: number;
  candidates_pending: number;
  signups_7d: number;
  signups_30d: number;
  businesses_total: number;
  businesses_with_plan: number;
  businesses_without_plan: number;
  plans_by_tier: Record<string, number>;
  candidate_membership_by_tier: Record<string, number>;
  assessments_completed: number;
  avg_score: number;
  challenges_active: number;
  challenges_total: number;
  invitations_total: number;
  submissions_total: number;
  ai_invocations_total: number;
  ai_invocations_7d: number;
  ai_by_model: Record<string, number>;
  ai_by_status: Record<string, number>;
  ai_avg_latency_ms: number;
};

export type InteractionsPayload = {
  window_days: number;
  total_events: number;
  by_actor: Record<string, number>;
  by_action: Array<{ action: string; actor_type: string; n: number }>;
  by_day: Array<{ day: string; n: number }>;
};

export type CandidateAnalyticsPayload = {
  ximatar_distribution: Record<string, number>;
  pillar_averages: {
    drive: number;
    computational_power: number;
    communication: number;
    creativity: number;
    knowledge: number;
  };
  ximatar_level_distribution: Record<string, number>;
  profiling_opt_out: number;
  assessments_completed: number;
  pipeline_invitations_by_level: Record<string, number>;
  pipeline_submissions_by_level: Record<string, number>;
};

export type EvolutionEvent = {
  candidate_ref: string;
  source_type: string;
  source_function: string | null;
  deltas: {
    drive: number;
    computational_power: number;
    communication: number;
    creativity: number;
    knowledge: number;
  };
  reasoning: string | null;
  created_at: string;
};

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_overview');
      if (error) throw error;
      return data as unknown as OverviewPayload;
    },
    refetchInterval: 60_000,
  });
}

export function useAdminInteractions(days: number) {
  return useQuery({
    queryKey: ['admin', 'interactions', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_interactions', { p_days: days });
      if (error) throw error;
      return data as unknown as InteractionsPayload;
    },
  });
}

export function useAdminCandidateAnalytics() {
  return useQuery({
    queryKey: ['admin', 'candidate-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_candidate_analytics');
      if (error) throw error;
      return data as unknown as CandidateAnalyticsPayload;
    },
  });
}

export function useAdminEvolution(limit = 50, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'evolution', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_xima_evolution', { p_limit: limit });
      if (error) throw error;
      return (data as unknown as EvolutionEvent[]) ?? [];
    },
    refetchInterval: enabled ? 10_000 : false,
  });
}
