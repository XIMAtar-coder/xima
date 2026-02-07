import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeOverlayProps {
  open: boolean;
  onStart: () => void;
  onSkip: () => void;
}

export const WelcomeOverlay = ({ open, onStart, onSkip }: WelcomeOverlayProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onSkip(); }}>
      <DialogContent className="max-w-md text-center p-8 rounded-3xl border-primary/20 bg-gradient-to-b from-primary/5 to-background">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-primary/10 animate-onboarding-fade-in">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-3 animate-onboarding-fade-in" style={{ animationDelay: '100ms' }}>
          {t('onboarding.welcome_title', 'Welcome to your XIMA journey')}
        </h2>

        <p className="text-muted-foreground mb-8 animate-onboarding-fade-in" style={{ animationDelay: '200ms' }}>
          {t('onboarding.welcome_copy', 'This is your personal growth space. Let\'s explore how it works.')}
        </p>

        <div className="flex flex-col gap-3 animate-onboarding-fade-in" style={{ animationDelay: '300ms' }}>
          <Button onClick={onStart} size="lg" className="gap-2">
            {t('onboarding.start', 'Start')}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button onClick={onSkip} variant="ghost" size="sm" className="text-muted-foreground">
            {t('onboarding.skip', 'Skip')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
