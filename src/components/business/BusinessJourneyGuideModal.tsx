import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Building2, ArrowRight, ArrowLeft, X,
  Target, Users, MessageCircle, BarChart3,
  Settings, Briefcase
} from 'lucide-react';

interface BusinessJourneyGuideModalProps {
  open: boolean;
  onClose: (dontShowAgain: boolean) => void;
  isAutoOpen?: boolean;
}

const STEPS = [
  { key: 'biz_welcome', icon: Building2, route: undefined },
  { key: 'biz_company_profile', icon: Briefcase, route: '/business/settings' },
  { key: 'biz_publish_challenge', icon: Target, route: '/business/challenges' },
  { key: 'biz_review_candidates', icon: Users, route: '/business/candidates' },
  { key: 'biz_chat_and_sessions', icon: MessageCircle, route: '/business/evaluations' },
  { key: 'biz_feedback_and_outcomes', icon: BarChart3, route: '/business/reports' },
  { key: 'biz_settings_and_compliance', icon: Settings, route: '/business/settings' },
] as const;

export const BusinessJourneyGuideModal = ({ open, onClose, isAutoOpen = false }: BusinessJourneyGuideModalProps) => {
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
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) setCurrentStep(prev => prev - 1);
  };

  const handleClose = () => {
    onClose(dontShowAgain);
  };

  const handleCtaNavigate = () => {
    if (step.route) {
      onClose(dontShowAgain);
      navigate(step.route);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg p-0 rounded-2xl border-border bg-background shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 hover:bg-secondary transition-colors"
          aria-label={t('common.close', 'Close')}
        >
          <X className="h-5 w-5 text-muted-foreground" />
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
            <div className="p-3.5 rounded-full bg-primary/10 border border-primary/20">
              <Icon className="h-8 w-8 text-primary" />
            </div>
          </div>

          <h2 className="text-xl font-bold mb-2 text-foreground">
            {t(`business_guide.steps.${step.key}.title`, step.key)}
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed mb-1">
            {t(`business_guide.steps.${step.key}.body`, '')}
          </p>

          {step.route && (
            <Button
              variant="link"
              size="sm"
              className="text-xs text-primary font-medium px-0 h-auto"
              onClick={handleCtaNavigate}
            >
              {t(`business_guide.steps.${step.key}.cta`, 'Go there →')}
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 pt-2 space-y-4">
          {isAutoOpen && (
            <label className="flex items-center gap-2 justify-center cursor-pointer">
              <Checkbox
                checked={dontShowAgain}
                onCheckedChange={(v) => setDontShowAgain(!!v)}
                className="border-2"
              />
              <span className="text-sm font-medium text-foreground">
                {t('tutorial.dont_show_again', "Non mostrare più")}
              </span>
            </label>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={isFirst}
              className="gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('common.back', 'Indietro')}
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
              className="gap-1.5"
            >
              {isLast ? t('common.finish', 'Fine') : t('common.next', 'Avanti')}
              {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
