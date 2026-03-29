import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

export interface BusinessProfile {
  id: string;
  user_id: string;
  company_name: string;
  website: string | null;
  company_logo: string | null;
  hr_contact_email: string | null;
  default_challenge_duration: number | null;
  default_challenge_difficulty: number | null;
  // Snapshot fields
  snapshot_hq_city: string | null;
  snapshot_hq_country: string | null;
  snapshot_industry: string | null;
  snapshot_employees_count: number | null;
  snapshot_revenue_range: string | null;
  snapshot_founded_year: number | null;
  snapshot_last_enriched_at: string | null;
  snapshot_manual_override: boolean | null;
  // Manual override fields
  manual_hq_city: string | null;
  manual_hq_country: string | null;
  manual_industry: string | null;
  manual_employees_count: number | null;
  manual_revenue_range: string | null;
  manual_founded_year: number | null;
  manual_website: string | null;
  // Registration fields
  company_size: string | null;
  hiring_approach: string | null;
  team_culture: string | null;
  growth_stage: string | null;
  metadata: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
}

export const BUSINESS_PROFILE_KEY = 'businessProfile';

export function useBusinessProfile() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [BUSINESS_PROFILE_KEY, user?.id],
    queryFn: async (): Promise<BusinessProfile | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[useBusinessProfile] Error:', error);
        throw error;
      }

      return data as BusinessProfile | null;
    },
    enabled: !!user?.id,
    staleTime: 30_000, // 30 seconds
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [BUSINESS_PROFILE_KEY, user?.id] });
  };

  const updateOptimistically = (updates: Partial<BusinessProfile>) => {
    queryClient.setQueryData<BusinessProfile | null>(
      [BUSINESS_PROFILE_KEY, user?.id],
      (old) => (old ? { ...old, ...updates } : null)
    );
  };

  return {
    businessProfile: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate,
    updateOptimistically,
  };
}
