import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

export type OnboardingStep =
  | 'welcome_seen'
  | 'dashboard_intro'
  | 'create_ximatar'
  | 'choose_mentor'
  | 'book_free_intro'
  | 'feed_and_chat'
  | 'credits_and_referrals'
  | 'settings_manage_plan';

// Keep backward compat alias
export type OnboardingHint = OnboardingStep;

interface OnboardingState {
  completed_steps: string[];
  dismissed_hints: string[];
  first_login_at: string | null;
}

export const useOnboardingState = () => {
  const { user, isAuthenticated } = useUser();
  const [state, setState] = useState<OnboardingState>({
    completed_steps: [],
    dismissed_hints: [],
    first_login_at: null,
  });
  const [loading, setLoading] = useState(true);

  // Fetch onboarding state
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const { data, error } = await supabase
        .from('user_onboarding_state')
        .select('completed_steps, dismissed_hints, first_login_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useOnboardingState] fetch error:', error);
      } else if (data) {
        setState({
          completed_steps: (data.completed_steps as string[]) || [],
          dismissed_hints: (data.dismissed_hints as string[]) || [],
          first_login_at: data.first_login_at,
        });
      } else {
        // No row yet — create one
        await supabase
          .from('user_onboarding_state')
          .insert({ user_id: user.id });
      }
      setLoading(false);
    };

    fetch();
  }, [isAuthenticated, user?.id]);

  const completeStep = useCallback(async (step: OnboardingStep) => {
    if (!user?.id) return;
    const updated = [...new Set([...state.completed_steps, step])];
    setState(prev => ({ ...prev, completed_steps: updated }));

    await supabase
      .from('user_onboarding_state')
      .update({ completed_steps: updated as any, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
  }, [user?.id, state.completed_steps]);

  const dismissHint = useCallback(async (hint: OnboardingStep) => {
    // dismissHint also completes the step
    if (!user?.id) return;
    const updatedHints = [...new Set([...state.dismissed_hints, hint])];
    const updatedSteps = [...new Set([...state.completed_steps, hint])];
    setState(prev => ({ ...prev, dismissed_hints: updatedHints, completed_steps: updatedSteps }));

    await supabase
      .from('user_onboarding_state')
      .update({
        dismissed_hints: updatedHints as any,
        completed_steps: updatedSteps as any,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);
  }, [user?.id, state.dismissed_hints, state.completed_steps]);

  const hasCompletedStep = useCallback((step: OnboardingStep) => {
    return state.completed_steps.includes(step);
  }, [state.completed_steps]);

  const hasDismissedHint = useCallback((hint: OnboardingStep) => {
    return state.completed_steps.includes(hint);
  }, [state.completed_steps]);

  /**
   * Returns the first incomplete step from a priority-ordered list.
   */
  const firstPendingStep = useCallback((steps: OnboardingStep[]): OnboardingStep | null => {
    for (const step of steps) {
      if (!state.completed_steps.includes(step)) return step;
    }
    return null;
  }, [state.completed_steps]);

  // Guide-specific: auto-show if guide (welcome_seen) was never completed
  const shouldAutoShowGuide = !loading && isAuthenticated && !state.completed_steps.includes('welcome_seen');

  // Legacy compat
  const showWelcome = shouldAutoShowGuide;

  return {
    loading,
    state,
    showWelcome,
    shouldAutoShowGuide,
    completeStep,
    dismissHint,
    hasCompletedStep,
    hasDismissedHint,
    firstPendingStep,
  };
};
