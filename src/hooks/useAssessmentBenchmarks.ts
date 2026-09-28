import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type BenchmarkPillar = 'computational_power' | 'communication' | 'knowledge' | 'creativity' | 'drive';

export interface AssessmentBenchmarks {
  /** Completed tests counted (same version, same field when a field is given). */
  count: number;
  /** Below this the averages stay null. */
  minCount: number;
  averages: Record<BenchmarkPillar, number> | null;
  /** Median duration of the test, once enough timed runs exist. */
  medianMinutes: number | null;
}

/**
 * Averages of the questionnaire, from the anonymous completion rows
 * (assessment_benchmarks). All fields together unless a field is given:
 * per-field numbers need many more tests before they mean anything.
 */
export const useAssessmentBenchmarks = (field?: string | null) =>
  useQuery({
    queryKey: ['assessment-benchmarks', field ?? 'all'],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<AssessmentBenchmarks> => {
      const { data, error } = await supabase.rpc('assessment_benchmarks' as never, (field ? { p_field: field } : {}) as never);
      const raw = (data ?? {}) as { count?: number; min_count?: number; averages?: Record<BenchmarkPillar, number> | null; median_minutes?: number | null };
      if (error) return { count: 0, minCount: 30, averages: null, medianMinutes: null };
      return {
        count: raw.count ?? 0,
        minCount: raw.min_count ?? 30,
        averages: raw.averages ?? null,
        medianMinutes: raw.median_minutes ?? null,
      };
    },
  });
