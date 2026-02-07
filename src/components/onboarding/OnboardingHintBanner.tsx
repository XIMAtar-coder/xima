import { useTranslation } from 'react-i18next';
import { X, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboardingState, OnboardingStep } from '@/hooks/useOnboardingState';

interface OnboardingHintBannerProps {
  hintKey: OnboardingStep;
  /** Optional CTA label override (translation key) */
  ctaKey?: string;
  ctaFallback?: string;
  /** Called when the CTA is clicked. If not provided, CTA just dismisses. */
  onCtaClick?: () => void;
}

const HINT_I18N: Record<string, { titleKey: string; titleFallback: string; bodyKey: string; bodyFallback: string; ctaKey: string; ctaFallback: string }> = {
  dashboard: {
    titleKey: 'onboarding.hint.dashboard_title',
    titleFallback: 'This is your growth hub',
    bodyKey: 'onboarding.hint.dashboard_body',
    bodyFallback: 'Here you track your XIMAtar, mentor progress, credits, and next steps.',
    ctaKey: 'onboarding.cta.got_it',
    ctaFallback: 'Got it',
  },
  assessment: {
    titleKey: 'onboarding.hint.assessment_title',
    titleFallback: 'Build your XIMAtar',
    bodyKey: 'onboarding.hint.assessment_body',
    bodyFallback: 'This is how your XIMAtar is built. Your answers shape mentors and challenges.',
    ctaKey: 'onboarding.cta.continue_test',
    ctaFallback: 'Continue test',
  },
  mentor: {
    titleKey: 'onboarding.hint.mentor_title',
    titleFallback: 'Your Mentor',
    bodyKey: 'onboarding.hint.mentor_body',
    bodyFallback: 'Your mentor guides your growth. Choosing one unlocks sessions and feedback.',
    ctaKey: 'onboarding.cta.choose_mentor',
    ctaFallback: 'Choose mentor',
  },
  feed: {
    titleKey: 'onboarding.hint.feed_title',
    titleFallback: 'Your Feed',
    bodyKey: 'onboarding.hint.feed_body',
    bodyFallback: 'This is where meaningful conversations happen with mentors and companies.',
    ctaKey: 'onboarding.cta.understood',
    ctaFallback: 'Understood',
  },
  challenges: {
    titleKey: 'onboarding.hint.challenges_title',
    titleFallback: 'Challenges',
    bodyKey: 'onboarding.hint.challenges_body',
    bodyFallback: 'Companies invite you here to real challenges and opportunities.',
    ctaKey: 'onboarding.cta.explore_challenges',
    ctaFallback: 'Explore challenges',
  },
  settings: {
    titleKey: 'onboarding.hint.settings_title',
    titleFallback: 'Settings',
    bodyKey: 'onboarding.hint.settings_body',
    bodyFallback: 'Manage your plan, credits, referrals, and account preferences here.',
    ctaKey: 'onboarding.cta.open_settings',
    ctaFallback: 'Open settings',
  },
};

export const OnboardingHintBanner = ({ hintKey, ctaKey, ctaFallback, onCtaClick }: OnboardingHintBannerProps) => {
  const { t } = useTranslation();
  const { hasCompletedStep, dismissHint, loading } = useOnboardingState();

  if (loading || hasCompletedStep(hintKey)) return null;

  const hint = HINT_I18N[hintKey];
  if (!hint) return null;

  const handleCta = () => {
    if (onCtaClick) {
      onCtaClick();
    }
    dismissHint(hintKey);
  };

  const resolvedCtaKey = ctaKey || hint.ctaKey;
  const resolvedCtaFallback = ctaFallback || hint.ctaFallback;

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
          <Button
            variant="link"
            size="sm"
            className="px-0 h-auto mt-1.5 text-xs font-semibold text-primary"
            onClick={handleCta}
          >
            {t(resolvedCtaKey, resolvedCtaFallback)}
          </Button>
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
