/**
 * useBusinessEntitlements — fetch business entitlements via react-query
 * data layer. Gates features by plan tier and per-feature flags.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useSupabaseQuery } from '@/lib/data/useSupabaseQuery';

export type PlanTier = 'starter' | 'growth' | 'enterprise';

export type FeatureFlag =
  | 'mentor_portal'
  | 'level3_challenges'
  | 'data_export'
  | 'premium_signals'
  | 'eligibility_gate'
  | 'decision_pack'
  | 'consistency_guard'
  | 'advanced_signals';

export interface BusinessEntitlements {
  id: string;
  businessId: string;
  planTier: PlanTier;
  maxSeats: number;
  seatsUsed: number;
  contractStart: string | null;
  contractEnd: string | null;
  renewalDate: string | null;
  features: Record<FeatureFlag, boolean>;
  notes: string | null;
}

const DEFAULT_FEATURES: Record<FeatureFlag, boolean> = {
  mentor_portal: false,
  level3_challenges: false,
  data_export: false,
  premium_signals: false,
  eligibility_gate: false,
  decision_pack: false,
  consistency_guard: false,
  advanced_signals: false,
};

export const useBusinessEntitlements = () => {
  const { user } = useUser();

  const { data: entitlements, isLoading: loading } = useSupabaseQuery<BusinessEntitlements>(
    ['business_entitlements', user?.id],
    async () => {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (!biz) return { data: null, error: null };

      const { data, error } = await supabase
        .from('business_entitlements')
        .select('*')
        .eq('business_id', biz.id)
        .maybeSingle();
      if (error) return { data: null, error };
      if (!data) return { data: null, error: null };

      const mapped: BusinessEntitlements = {
        id: data.id,
        businessId: data.business_id,
        planTier: data.plan_tier as PlanTier,
        maxSeats: data.max_seats,
        seatsUsed: data.seats_used,
        contractStart: data.contract_start,
        contractEnd: data.contract_end,
        renewalDate: data.renewal_date,
        features: { ...DEFAULT_FEATURES, ...(data.features as Record<string, boolean>) },
        notes: data.notes,
      };
      return { data: mapped, error: null };
    },
    { enabled: !!user?.id, staleTime: 60_000 }
  );

  const hasFeature = useCallback(
    (feature: FeatureFlag): boolean => !!entitlements?.features[feature],
    [entitlements]
  );

  const isEnterprise = entitlements?.planTier === 'enterprise';
  const isGrowthOrAbove = entitlements?.planTier === 'growth' || isEnterprise;
  const isContractActive = entitlements?.contractEnd
    ? new Date(entitlements.contractEnd) >= new Date()
    : true;

  return {
    entitlements: entitlements ?? null,
    loading,
    hasFeature,
    isEnterprise,
    isGrowthOrAbove,
    isContractActive,
    planTier: entitlements?.planTier ?? 'starter',
  };
};
