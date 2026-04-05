import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Send, Bookmark, TrendingUp, Zap, MapPin, Clock } from 'lucide-react';
import { XIMATAR_PROFILES } from '@/lib/ximatarTaxonomy';

const ARCHETYPE_EMOJI: Record<string, string> = {
  lion: '🦁', owl: '🦉', dolphin: '🐬', fox: '🦊', bear: '🐻', bee: '🐝',
  wolf: '🐺', cat: '🐱', parrot: '🦜', elephant: '🐘', horse: '🐴', chameleon: '🦎',
};

const PILLAR_LABELS: Record<string, string> = {
  drive: 'Drive',
  comp_power: 'Comp.',
  communication: 'Comm.',
  creativity: 'Creat.',
  knowledge: 'Know.',
};

interface PoolCandidate {
  id: string;
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
  const emoji = ARCHETYPE_EMOJI[candidate.ximatar_archetype] || '🔮';

  const resolvePillar = (key: string) => {
    const scores = candidate.pillar_scores || {};
    if (key === 'comp_power') return scores.comp_power || scores.computational_power || 0;
    return scores[key] || 0;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-5 space-y-4">
        {/* Header: archetype identity */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
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
                ? t('candidate_pool.highly_active', 'Highly active')
                : t('candidate_pool.active', 'Active')}
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
                ? t('candidate_pool.available_now', 'Available now')
                : candidate.availability === '1_month'
                ? t('candidate_pool.within_month', 'Within 1 month')
                : t('candidate_pool.within_3months', 'Within 3 months')}
            </Badge>
          )}
          {candidate.trajectory_trend && (
            <Badge variant="secondary" className="text-xs gap-1">
              <TrendingUp className="h-3 w-3" />
              {candidate.trajectory_trend === 'growing_fast' ? 'Growing fast' : 'Growing'}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 text-xs" onClick={() => onInvite(candidate)}>
            <Send className="h-3 w-3 mr-1" />
            {t('candidate_pool.invite', 'Invite')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onSave(candidate)}>
            <Bookmark className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
