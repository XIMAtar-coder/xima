import { useTranslation } from 'react-i18next';
import { X, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboardingState, OnboardingHint } from '@/hooks/useOnboardingState';

interface OnboardingHintBannerProps {
  hintKey: OnboardingHint;
}

const HINT_I18N: Record<OnboardingHint, { titleKey: string; titleFallback: string; bodyKey: string; bodyFallback: string }> = {
  dashboard: {
    titleKey: 'onboarding.hint.dashboard_title',
    titleFallback: 'Your growth hub',
    bodyKey: 'onboarding.hint.dashboard_body',
    bodyFallback: 'Track your progress, credits, and next steps from here.',
  },
  feed: {
    titleKey: 'onboarding.hint.feed_title',
    titleFallback: 'Your Feed',
    bodyKey: 'onboarding.hint.feed_body',
    bodyFallback: 'Receive messages, mentor updates, and important activity here.',
  },
  mentor: {
    titleKey: 'onboarding.hint.mentor_title',
    titleFallback: 'Your Mentor',
    bodyKey: 'onboarding.hint.mentor_body',
    bodyFallback: 'Your mentor supports you with targeted sessions based on your profile.',
  },
  challenges: {
    titleKey: 'onboarding.hint.challenges_title',
    titleFallback: 'Challenges',
    bodyKey: 'onboarding.hint.challenges_body',
    bodyFallback: 'Companies invite you here to real challenges and opportunities.',
  },
  settings: {
    titleKey: 'onboarding.hint.settings_title',
    titleFallback: 'Settings',
    bodyKey: 'onboarding.hint.settings_body',
    bodyFallback: 'Manage your plan, credits, referrals, and account preferences.',
  },
};

export const OnboardingHintBanner = ({ hintKey }: OnboardingHintBannerProps) => {
  const { t } = useTranslation();
  const { hasDismissedHint, dismissHint, loading } = useOnboardingState();

  if (loading || hasDismissedHint(hintKey)) return null;

  const hint = HINT_I18N[hintKey];

  return (
    <div className="relative rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 mb-6 animate-onboarding-fade-in motion-reduce:animate-none">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {t(hint.titleKey, hint.titleFallback)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(hint.bodyKey, hint.bodyFallback)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={() => dismissHint(hintKey)}
          aria-label={t('common.dismiss', 'Dismiss')}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
