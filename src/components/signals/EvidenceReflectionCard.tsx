/**
 * EvidenceReflectionCard — what the candidate gets back, immediately.
 *
 * The product asks for 25–35 minutes of structured reasoning and, until now,
 * returned silence. This closes that loop: every claim shown here is anchored to
 * a verbatim quote of the candidate's own words, verified server-side to appear
 * in what they actually wrote (see analyze-open-answer). No quote, no claim.
 *
 * The same verified evidence is what the employer sees in the review drawer —
 * one artifact, two lenses.
 */
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, Compass } from 'lucide-react';

export interface ReflectionEvidence {
  dimension: string;
  quote: string;
  is_strength: boolean;
}

interface EvidenceReflectionCardProps {
  evidence: ReflectionEvidence[];
  className?: string;
}

/** Dimension → i18n key. Kept explicit so an unknown dimension degrades quietly. */
const DIMENSION_LABEL_KEYS: Record<string, string> = {
  framing: 'reflection.dimension.framing',
  execution_bias: 'reflection.dimension.execution_bias',
  impact_thinking: 'reflection.dimension.impact_thinking',
  decision_quality: 'reflection.dimension.decision_quality',
};

const DIMENSION_FALLBACKS: Record<string, string> = {
  framing: 'How you frame a problem',
  execution_bias: 'How you move to action',
  impact_thinking: 'How you weigh consequences',
  decision_quality: 'How consistent your choices are',
};

export function EvidenceReflectionCard({ evidence, className = '' }: EvidenceReflectionCardProps) {
  const { t } = useTranslation();

  // Nothing verified means nothing honest to say. Render nothing rather than
  // padding the screen with generic praise.
  if (!Array.isArray(evidence) || evidence.length === 0) return null;

  const strengths = evidence.filter((e) => e.is_strength);
  const edges = evidence.filter((e) => !e.is_strength);

  const renderItem = (item: ReflectionEvidence, idx: number, strength: boolean) => {
    const label = t(
      DIMENSION_LABEL_KEYS[item.dimension] ?? '',
      DIMENSION_FALLBACKS[item.dimension] ?? item.dimension
    );
    return (
      <div key={`${item.dimension}-${idx}`} className="space-y-1.5">
        <div className="flex items-center gap-2">
          {strength ? (
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
          ) : (
            <Compass className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
          )}
          <span className="text-sm font-medium">{label}</span>
        </div>
        {/* The candidate's own words, verbatim. */}
        <blockquote className="border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground break-words">
          “{item.quote}”
        </blockquote>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
          {t('reflection.title', 'What your answers show')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t(
            'reflection.subtitle',
            'Taken from what you actually wrote — not a score, and not shared as a verdict.'
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {strengths.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t('reflection.strengths', 'Where you came through')}
            </p>
            {strengths.map((item, i) => renderItem(item, i, true))}
          </div>
        )}

        {edges.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('reflection.growth', 'Where there is room to grow')}
            </p>
            {edges.map((item, i) => renderItem(item, i, false))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EvidenceReflectionCard;
