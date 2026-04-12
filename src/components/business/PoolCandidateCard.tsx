import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Send, Bookmark, TrendingUp, Zap, MapPin, Clock } from 'lucide-react';
import { XIMATAR_PROFILES } from '@/lib/ximatarTaxonomy';

const PILLAR_LABELS: Record<string, string> = {
  drive: 'Drive',
  comp_power: 'Comp.',
  communication: 'Comm.',
  creativity: 'Creat.',
  knowledge: 'Know.',
};

interface PoolCandidate {
  id: string;
  is_synthetic?: boolean;
  ximatar_archetype: string;
  ximatar_level: number;
  pillar_scores: Record<string, number>;
  work_preference: string | null;
  availability: string;
  engagement_level: string;
  trajectory_trend: string | null;
  profile_completed: boolean;
}

interface PoolCandidateCardProps {
  candidate: PoolCandidate;
  onInvite: (candidate: PoolCandidate) => void;
  onSave: (candidate: PoolCandidate) => void;
}

export const PoolCandidateCard: React.FC<PoolCandidateCardProps> = ({ candidate, onInvite, onSave }) => {
  const { t } = useTranslation();
  const profile = XIMATAR_PROFILES[candidate.ximatar_archetype];

  const resolvePillar = (key: string) => {
    const scores = candidate.pillar_scores || {};
    if (key === 'comp_power') return scores.comp_power || scores.computational_power || 0;
    return scores[key] || 0;
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow relative ${candidate.is_synthetic ? 'border-dashed border-2 border-border opacity-80' : ''}`}>
      {candidate.is_synthetic && (
        <div className="absolute top-2 right-2 z-10">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950 dark:text-amber-100 font-medium">
            Demo
          </span>
        </div>
      )}
      <CardContent className="p-5 space-y-4">
        {/* Header: archetype identity with real image */}
        <div className="flex items-center gap-3">
          <img
            src={`/ximatars/${candidate.ximatar_archetype}.png`}
            alt={profile?.name || candidate.ximatar_archetype}
            className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {profile?.name || candidate.ximatar_archetype}
            </p>
            <p className="text-xs text-muted-foreground">
              {profile?.title || ''} · L{candidate.ximatar_level}
            </p>
          </div>
        </div>

        {/* Pillar mini-bars */}
        <div className="space-y-1.5">
          {Object.entries(PILLAR_LABELS).map(([key, label]) => {
            const score = resolvePillar(key);
            return (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className="w-12 text-muted-foreground">{label}</span>
                <Progress value={score} className="h-1.5 flex-1" />
                <span className="w-6 text-right text-muted-foreground">{score}</span>
              </div>
            );
          })}
        </div>

        {/* Signal badges */}
        <div className="flex flex-wrap gap-1.5">
          {candidate.engagement_level !== 'low' && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Zap className="h-3 w-3" />
              {candidate.engagement_level === 'highly_active'
                ? t('candidate_pool.highly_active', 'Molto attivo')
                : t('candidate_pool.active', 'Attivo')}
            </Badge>
          )}
          {candidate.work_preference && (
            <Badge variant="outline" className="text-xs gap-1">
              <MapPin className="h-3 w-3" />
              {candidate.work_preference}
            </Badge>
          )}
          {candidate.availability !== 'unknown' && (
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="h-3 w-3" />
              {candidate.availability === 'immediately'
                ? t('candidate_pool.available_now', 'Disponibile ora')
                : candidate.availability === '1_month'
                ? t('candidate_pool.within_month', 'Entro 1 mese')
                : t('candidate_pool.within_3months', 'Entro 3 mesi')}
            </Badge>
          )}
          {candidate.trajectory_trend && (
            <Badge variant="secondary" className="text-xs gap-1">
              <TrendingUp className="h-3 w-3" />
              {candidate.trajectory_trend === 'growing_fast'
                ? t('candidate_pool.growing_fast', 'Crescita rapida')
                : t('candidate_pool.growing', 'In crescita')}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 text-xs" onClick={() => onInvite(candidate)}>
            <Send className="h-3 w-3 mr-1" />
            {t('candidate_pool.invite', 'Invita')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onSave(candidate)}>
            <Bookmark className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
