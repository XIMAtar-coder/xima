import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sparkles, ArrowRight, ArrowLeft, X,
  BarChart3, GraduationCap, Calendar,
  MessageCircle, Gift, Settings
} from 'lucide-react';

interface XimaJourneyGuideModalProps {
  open: boolean;
  onClose: (dontShowAgain: boolean) => void;
  /** If true, show the "Don't show again" checkbox (first-time auto-open) */
  isAutoOpen?: boolean;
}

const STEPS = [
  { key: 'welcome', icon: Sparkles, route: undefined },
  { key: 'ximatar', icon: BarChart3, route: '/ximatar-journey' },
  { key: 'mentor', icon: GraduationCap, route: '/profile' },
  { key: 'session', icon: Calendar, route: '/profile' },
  { key: 'feed', icon: MessageCircle, route: '/chat' },
  { key: 'credits', icon: Gift, route: '/profile' },
  { key: 'settings', icon: Settings, route: '/settings' },
] as const;

export const XimaJourneyGuideModal = ({ open, onClose, isAutoOpen = false }: XimaJourneyGuideModalProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const step = STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;
  const Icon = step.icon;

  const handleNext = () => {
    if (isLast) {
      onClose(true);
      // Navigate to dashboard on finish
      if (window.location.pathname !== '/profile' && window.location.pathname !== '/dashboard') {
        navigate('/profile', { replace: true });
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) setCurrentStep(prev => prev - 1);
  };

  const handleClose = () => {
    onClose(dontShowAgain);
    // Ensure user lands on dashboard after dismissing the guide
    if (window.location.pathname !== '/profile' && window.location.pathname !== '/dashboard') {
      navigate('/profile', { replace: true });
    }
  };

  const handleCtaNavigate = () => {
    if (step.route) {
      onClose(dontShowAgain);
      navigate(step.route);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg p-0 rounded-2xl border-primary/20 bg-gradient-to-b from-primary/5 to-background overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t('guide.buttons.close', 'Close')}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-6 pb-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                i === currentStep
                  ? 'w-6 bg-primary'
                  : i < currentStep
                    ? 'w-1.5 bg-primary/50'
                    : 'w-1.5 bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>

        {/* Step counter */}
        <p className="text-xs text-muted-foreground text-center">
          {currentStep + 1} / {STEPS.length}
        </p>

        {/* Content */}
        <div className="px-8 pb-2 pt-2 text-center animate-onboarding-fade-in motion-reduce:animate-none" key={currentStep}>
          <div className="flex justify-center mb-5">
            <div className="p-3.5 rounded-full bg-primary/10">
              <Icon className="h-8 w-8 text-primary" />
            </div>
          </div>

          <h2 className="text-xl font-bold mb-2">
            {t(`guide.steps.${step.key}.title`, step.key)}
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed mb-1">
            {t(`guide.steps.${step.key}.body`, '')}
          </p>

          {step.route && (
            <Button
              variant="link"
              size="sm"
              className="text-xs text-primary font-medium px-0 h-auto"
              onClick={handleCtaNavigate}
            >
              {t(`guide.steps.${step.key}.cta`, 'Go there →')}
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 pt-2 space-y-4">
          {/* Don't show again */}
          {isAutoOpen && (
            <label className="flex items-center gap-2 justify-center cursor-pointer">
              <Checkbox
                checked={dontShowAgain}
                onCheckedChange={(v) => setDontShowAgain(!!v)}
                className="h-3.5 w-3.5"
              />
              <span className="text-xs text-muted-foreground">
                {t('guide.buttons.dont_show_again', "Don't show again")}
              </span>
            </label>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={isFirst}
              className="gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('guide.buttons.back', 'Back')}
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
              className="gap-1.5"
            >
              {isLast ? t('guide.buttons.finish', 'Finish') : t('guide.buttons.next', 'Next')}
              {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
