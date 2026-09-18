import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { EvidenceReflectionCard } from '@/components/signals/EvidenceReflectionCard';
import { useSubmissionReflection } from '@/hooks/useSubmissionReflection';
import { useSubmissionPercentile } from '@/hooks/useSubmissionPercentile';

type Props = {
  /** Used to read back the verified evidence for this submission. */
  invitationId?: string;
  guideName: string;
  litFacets: string[];
  resolveLine?: string;
  /** Qualitative-only cue from the scorer. We render a friendly string; never numbers. */
  growthCue?: 'xima_strengthened' | null;
  onBack: () => void;
  /** Re-request scoring; shown when polling gave up without evidence. */
  onRetry?: () => Promise<void> | void;
};

export function ResolveScreen({ invitationId, guideName, litFacets, resolveLine, growthCue, onBack, onRetry }: Props) {
  const { t } = useTranslation();
  const { evidence, isPending, exhausted, restart } = useSubmissionReflection(invitationId);
  const [retrying, setRetrying] = useState(false);
  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    try { await onRetry(); } finally { setRetrying(false); }
    restart();
  };
  const { percentile } = useSubmissionPercentile(invitationId);
  const line =
    resolveLine ||
    t(
      'mindset.resolve.default_line',
      'Ho visto come reagisci. Ora il tuo XIMAtar sta prendendo forma — ogni sfaccettatura accesa è un pezzo di te.'
    );

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="py-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{guideName}</p>
            <h2 className="text-xl font-semibold text-foreground">{t('mindset.resolve.title', 'Resoconto')}</h2>
          </div>
        </div>

        <p className="text-foreground leading-relaxed">{line}</p>

        {growthCue === 'xima_strengthened' && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 flex items-center gap-2 text-sm text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>{t('mindset.resolve.enriched', 'Il tuo XIMAtar si è arricchito.')}</span>
          </div>
        )}

        {litFacets.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('mindset.resolve.facets', 'Sfaccettature accese')}</p>
            <div className="flex flex-wrap gap-2">
              {litFacets.map((f) => (
                <Badge key={f} className="bg-primary/15 text-primary border-primary/30">
                  ✨ {f}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border/60 bg-card/60 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>{t('mindset.resolve.refining', 'XIMAtar in fase di affinamento')}</span>
          </div>
          <Progress value={33} className="h-2" />
          <p className="text-xs text-muted-foreground">{t('mindset.resolve.next_levels', "L1 ✓ — i prossimi livelli si sbloccheranno quando l'azienda riguarderà il tuo profilo.")}</p>
        </div>

        {/* What the candidate gets back: their own words, quoted. */}
        {evidence && evidence.length > 0 && (
          <EvidenceReflectionCard evidence={evidence} percentile={percentile} className="border-border/60" />
        )}
        {!evidence && isPending && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('reflection.preparing', 'Preparing what your answers show…')}
          </p>
        )}
        {!evidence && exhausted && (
          <div className="space-y-2" role="status">
            <p className="text-sm text-muted-foreground">
              {t('reflection.later', 'Your reflection will appear here once your answers have been reviewed — nothing is lost, you can close this page.')}
            </p>
            {onRetry && (
              <Button size="sm" variant="secondary" onClick={handleRetry} disabled={retrying}>
                {retrying ? t('reflection.retrying', 'Asking again…') : t('reflection.retry', 'Try again')}
              </Button>
            )}
          </div>
        )}

        <div className="pt-2">
          <Button onClick={onBack} variant="outline">{t('common.back_to_profile', 'Torna al profilo')}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
