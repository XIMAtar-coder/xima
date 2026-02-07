import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboardingState, OnboardingStep } from '@/hooks/useOnboardingState';

interface OnboardingHintBannerProps {
  hintKey: OnboardingStep;
  /** Called when the CTA is clicked. If not provided, CTA navigates or dismisses. */
  onCtaClick?: () => void;
}

interface StepConfig {
  titleKey: string;
  titleFallback: string;
  bodyKey: string;
  bodyFallback: string;
  ctaKey: string;
  ctaFallback: string;
  /** Route to navigate to when CTA is clicked (optional) */
  route?: string;
}

const STEP_CONFIG: Record<string, StepConfig> = {
  dashboard_intro: {
    titleKey: 'onboarding.dashboard_intro.title',
    titleFallback: 'This is your growth hub',
    bodyKey: 'onboarding.dashboard_intro.body',
    bodyFallback: 'Here you track your XIMAtar, mentor progress, credits, and next steps.',
    ctaKey: 'onboarding.common.got_it',
    ctaFallback: 'Got it',
  },
  create_ximatar: {
    titleKey: 'onboarding.create_ximatar.title',
    titleFallback: 'Build your XIMAtar',
    bodyKey: 'onboarding.create_ximatar.body',
    bodyFallback: 'This is how your XIMAtar is built. Your answers shape mentors and challenges.',
    ctaKey: 'onboarding.create_ximatar.cta',
    ctaFallback: 'Continue test',
  },
  choose_mentor: {
    titleKey: 'onboarding.choose_mentor.title',
    titleFallback: 'Choose your mentor',
    bodyKey: 'onboarding.choose_mentor.body',
    bodyFallback: 'Your mentor guides your growth. Choosing one unlocks sessions and feedback.',
    ctaKey: 'onboarding.choose_mentor.cta',
    ctaFallback: 'Choose mentor',
  },
  book_free_intro: {
    titleKey: 'onboarding.book_free_intro.title',
    titleFallback: 'Book your free intro session',
    bodyKey: 'onboarding.book_free_intro.body',
    bodyFallback: 'You have a free intro session available! Book a slot with your mentor to get started.',
    ctaKey: 'onboarding.book_free_intro.cta',
    ctaFallback: 'Book session',
  },
  feed_and_chat: {
    titleKey: 'onboarding.feed_and_chat.title',
    titleFallback: 'Your Feed & conversations',
    bodyKey: 'onboarding.feed_and_chat.body',
    bodyFallback: 'This is where meaningful conversations happen with mentors and companies.',
    ctaKey: 'onboarding.common.got_it',
    ctaFallback: 'Got it',
  },
  credits_and_referrals: {
    titleKey: 'onboarding.credits_and_referrals.title',
    titleFallback: 'Credits & referrals',
    bodyKey: 'onboarding.credits_and_referrals.body',
    bodyFallback: 'Earn credits by inviting friends and use them for mentoring sessions.',
    ctaKey: 'onboarding.common.got_it',
    ctaFallback: 'Got it',
  },
  settings_manage_plan: {
    titleKey: 'onboarding.settings_manage_plan.title',
    titleFallback: 'Your settings',
    bodyKey: 'onboarding.settings_manage_plan.body',
    bodyFallback: 'Manage your plan, credits, referrals, and account preferences here.',
    ctaKey: 'onboarding.common.got_it',
    ctaFallback: 'Got it',
  },
  // Legacy keys (backward compat)
  dashboard: {
    titleKey: 'onboarding.dashboard_intro.title',
    titleFallback: 'This is your growth hub',
    bodyKey: 'onboarding.dashboard_intro.body',
    bodyFallback: 'Here you track your XIMAtar, mentor progress, credits, and next steps.',
    ctaKey: 'onboarding.common.got_it',
    ctaFallback: 'Got it',
  },
  assessment: {
    titleKey: 'onboarding.create_ximatar.title',
    titleFallback: 'Build your XIMAtar',
    bodyKey: 'onboarding.create_ximatar.body',
    bodyFallback: 'This is how your XIMAtar is built. Your answers shape mentors and challenges.',
    ctaKey: 'onboarding.create_ximatar.cta',
    ctaFallback: 'Continue test',
  },
  mentor: {
    titleKey: 'onboarding.choose_mentor.title',
    titleFallback: 'Choose your mentor',
    bodyKey: 'onboarding.choose_mentor.body',
    bodyFallback: 'Your mentor guides your growth. Choosing one unlocks sessions and feedback.',
    ctaKey: 'onboarding.choose_mentor.cta',
    ctaFallback: 'Choose mentor',
  },
  feed: {
    titleKey: 'onboarding.feed_and_chat.title',
    titleFallback: 'Your Feed & conversations',
    bodyKey: 'onboarding.feed_and_chat.body',
    bodyFallback: 'This is where meaningful conversations happen with mentors and companies.',
    ctaKey: 'onboarding.common.got_it',
    ctaFallback: 'Got it',
  },
  challenges: {
    titleKey: 'onboarding.feed_and_chat.title',
    titleFallback: 'Challenges',
    bodyKey: 'onboarding.feed_and_chat.body',
    bodyFallback: 'Companies invite you here to real challenges and opportunities.',
    ctaKey: 'onboarding.common.got_it',
    ctaFallback: 'Got it',
  },
  settings: {
    titleKey: 'onboarding.settings_manage_plan.title',
    titleFallback: 'Your settings',
    bodyKey: 'onboarding.settings_manage_plan.body',
    bodyFallback: 'Manage your plan, credits, referrals, and account preferences here.',
    ctaKey: 'onboarding.common.got_it',
    ctaFallback: 'Got it',
  },
};

export const OnboardingHintBanner = ({ hintKey, onCtaClick }: OnboardingHintBannerProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasCompletedStep, dismissHint, loading } = useOnboardingState();

  if (loading || hasCompletedStep(hintKey)) return null;

  const config = STEP_CONFIG[hintKey];
  if (!config) return null;

  const handleCta = () => {
    if (onCtaClick) {
      onCtaClick();
    } else if (config.route) {
      navigate(config.route);
    }
    dismissHint(hintKey);
  };

  const handleSkip = () => {
    dismissHint(hintKey);
  };

  return (
    <div className="relative rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 mb-6 animate-onboarding-fade-in motion-reduce:animate-none">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {t(config.titleKey, config.titleFallback)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(config.bodyKey, config.bodyFallback)}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <Button
              variant="link"
              size="sm"
              className="px-0 h-auto text-xs font-semibold text-primary"
              onClick={handleCta}
            >
              {t(config.ctaKey, config.ctaFallback)}
            </Button>
            <Button
              variant="link"
              size="sm"
              className="px-0 h-auto text-xs text-muted-foreground"
              onClick={handleSkip}
            >
              {t('onboarding.common.skip', 'Skip')}
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={handleSkip}
          aria-label={t('common.dismiss', 'Dismiss')}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
