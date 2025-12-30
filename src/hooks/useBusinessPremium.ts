/**
 * Hook to check if the current business has premium features enabled.
 * For MVP: uses a mock feature flag. Can later be tied to business_profiles.is_premium or subscription.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

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

// MVP Feature flag - set to true to enable premium for all businesses during development
const MOCK_PREMIUM_ENABLED = false;

export const useBusinessPremium = (): BusinessPremiumState => {
  const { user } = useUser();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPremium = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // MVP: Check mock flag first
        if (MOCK_PREMIUM_ENABLED) {
          setIsPremium(true);
          setLoading(false);
          return;
        }

        // Future: Check business_profiles for is_premium flag or subscription status
        // For now, we check if a field exists (placeholder for future implementation)
        const { data: profile } = await supabase
          .from('business_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        // MVP: All businesses are non-premium by default
        // This can be changed to check profile.is_premium when the field is added
        setIsPremium(false);
      } catch (error) {
        console.error('Error checking premium status:', error);
        setIsPremium(false);
      } finally {
        setLoading(false);
      }
    };

    checkPremium();
  }, [user?.id]);

  return {
    isPremium,
    loading,
    features: {
      eligibilityGate: isPremium,
      decisionPack: isPremium,
      consistencyGuard: isPremium,
      advancedSignals: isPremium,
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
