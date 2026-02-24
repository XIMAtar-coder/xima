/**
 * Hook to check if the current business has premium features enabled.
 * Now backed by real business_entitlements table (Enterprise Contract Mode).
 */

import { useBusinessEntitlements, type FeatureFlag } from '@/hooks/useBusinessEntitlements';

interface BusinessPremiumState {
  isPremium: boolean;
  loading: boolean;
  features: {
    eligibilityGate: boolean;
    decisionPack: boolean;
    consistencyGuard: boolean;
    advancedSignals: boolean;
  };
}

export const useBusinessPremium = (): BusinessPremiumState => {
  const { hasFeature, isGrowthOrAbove, loading } = useBusinessEntitlements();

  return {
    isPremium: isGrowthOrAbove,
    loading,
    features: {
      eligibilityGate: hasFeature('eligibility_gate'),
      decisionPack: hasFeature('decision_pack'),
      consistencyGuard: hasFeature('consistency_guard'),
      advancedSignals: hasFeature('advanced_signals'),
    },
  };
};

/**
 * Utility to check if a specific premium feature is available
 */
export const usePremiumFeature = (feature: keyof BusinessPremiumState['features']): boolean => {
  const { features } = useBusinessPremium();
  return features[feature];
};
