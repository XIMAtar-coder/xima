import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Sparkles, Share2 } from 'lucide-react';

type Props = {
  counterpartName: string;
  onBack: () => void;
};

export function L2ResolveScreen({ counterpartName, onBack }: Props) {
  const { t } = useTranslation();
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="py-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {t('candidate.l2_conversation.resolve_kicker', 'Conversazione conclusa')}
            </p>
            <h2 className="text-xl font-semibold text-foreground">
              {t('candidate.l2_conversation.resolve_title', 'Il tuo XIMAtar si è arricchito')}
            </h2>
          </div>
        </div>

        <p className="text-foreground leading-relaxed">
          {t(
            'candidate.l2_conversation.resolve_body',
            'Hai affrontato un confronto reale con {{name}}. Ogni risposta ha affinato sfaccettature del tuo XIMAtar.',
            { name: counterpartName }
          )}
        </p>

        <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 flex items-center gap-2 text-sm text-foreground">
          <Share2 className="h-4 w-4 text-primary" />
          <span>{t('candidate.l2_conversation.shared_with_company', 'Condiviso con l\'azienda.')}</span>
        </div>

        <div className="rounded-lg border border-border/60 bg-card/60 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>{t('candidate.l2_conversation.progress_label', 'XIMAtar in fase di affinamento')}</span>
          </div>
          <Progress value={66} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {t(
              'candidate.l2_conversation.progress_hint',
              'L2 ✓ — il prossimo livello si sblocca quando l\'azienda riguarderà il tuo profilo.'
            )}
          </p>
        </div>

        <div className="pt-2">
          <Button onClick={onBack} variant="outline">
            {t('candidate.l2_conversation.back_to_profile', 'Torna al profilo')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
