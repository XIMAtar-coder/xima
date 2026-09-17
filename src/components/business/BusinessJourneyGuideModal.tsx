import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ArrowLeft, Target, Puzzle, Send } from 'lucide-react';

interface BusinessJourneyGuideModalProps {
  open: boolean;
  onClose: (dontShowAgain: boolean) => void;
  isAutoOpen?: boolean;
}

// The three things a new company has to do, in order. Everything else
// (profile, reports, settings) is discoverable from the sidebar.
const STEPS = [
  { key: 'goal', icon: Target, route: '/business/hiring-goals/new' },
  { key: 'challenge', icon: Puzzle, route: '/business/hiring-goals' },
  { key: 'invite', icon: Send, route: '/business/hiring-goals' },
] as const;

export const BusinessJourneyGuideModal = ({ open, onClose, isAutoOpen = false }: BusinessJourneyGuideModalProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (open) setCurrentStep(0);
  }, [open]);

  const step = STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;
  const Icon = step.icon;

  const handleNext = () => {
    if (isLast) {
      // Finishing the tour counts as seen.
      onClose(true);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleCtaNavigate = () => {
    onClose(dontShowAgain);
    navigate(step.route);
  };

  return (
    // DialogContent already renders the single close button (top right);
    // the modal used to add a second one on top of it.
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(dontShowAgain); }}>
      <DialogContent className="max-w-lg p-0 rounded-2xl border-border bg-background shadow-2xl overflow-hidden">
        <div className="flex items-center justify-center gap-1.5 pt-6 pb-2" aria-hidden="true">
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

        <p className="text-xs text-muted-foreground text-center">
          {t('business_guide.step_counter', { current: currentStep + 1, total: STEPS.length })}
        </p>

        <div className="px-8 pb-2 pt-2 text-center animate-onboarding-fade-in motion-reduce:animate-none" key={currentStep}>
          <div className="flex justify-center mb-5">
            <div className="p-3.5 rounded-full bg-primary/10 border border-primary/20">
              <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
          </div>

          <DialogTitle className="text-xl font-bold mb-2 text-foreground">
            {t(`business_guide.tour.${step.key}.title`)}
          </DialogTitle>

          <DialogDescription className="text-sm text-muted-foreground leading-relaxed mb-1">
            {t(`business_guide.tour.${step.key}.body`)}
          </DialogDescription>

          <Button
            variant="link"
            size="sm"
            className="text-xs text-primary font-medium px-0 h-auto"
            onClick={handleCtaNavigate}
          >
            {t(`business_guide.tour.${step.key}.cta`)}
          </Button>
        </div>

        <div className="px-8 pb-6 pt-2 space-y-4">
          {isAutoOpen && (
            <label className="flex items-center gap-2 justify-center cursor-pointer">
              <Checkbox
                checked={dontShowAgain}
                onCheckedChange={(v) => setDontShowAgain(!!v)}
                className="border-2"
              />
              <span className="text-sm font-medium text-foreground">
                {t('tutorial.dont_show_again', 'Non mostrare più')}
              </span>
            </label>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(prev => Math.max(prev - 1, 0))}
              disabled={isFirst}
              className="gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {t('common.back', 'Indietro')}
            </Button>

            <Button size="sm" onClick={handleNext} className="gap-1.5">
              {isLast ? t('common.finish', 'Fine') : t('common.next', 'Avanti')}
              {!isLast && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
