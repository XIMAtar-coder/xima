import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, MapPin, Clock, Activity, Zap, Send, User } from 'lucide-react';

interface ShortlistCandidate {
  id?: string;
  candidate_user_id: string;
  anonymous_label?: string | null;
  total_score: number;
  identity_score: number;
  trajectory_score: number;
  engagement_score: number;
  location_score: number;
  credential_score: number;
  ximatar_archetype: string;
  ximatar_level: number;
  pillar_scores: Record<string, number>;
  trajectory_summary: string;
  engagement_level: string;
  location_match: string;
  availability: string;
  status: string;
  identity_revealed?: boolean;
  pipeline_stage?: string;
}

interface ShortlistCardProps {
  candidate: ShortlistCandidate;
  rank: number;
  onInviteToChallenge: (candidateUserId: string) => void;
  onViewProfile: (candidateUserId: string) => void;
}

const ARCHETYPE_EMOJI: Record<string, string> = {
  lion: '🦁', owl: '🦉', dolphin: '🐬', fox: '🦊', bear: '🐻', bee: '🐝',
  wolf: '🐺', cat: '🐱', parrot: '🦜', elephant: '🐘', horse: '🐴', chameleon: '🦎',
};

const ScoreBar: React.FC<{ label: string; value: number; max: number }> = ({ label, value, max }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="w-20 text-muted-foreground truncate">{label}</span>
    <Progress value={(value / max) * 100} className="h-1.5 flex-1" />
    <span className="w-8 text-right font-mono text-muted-foreground">{value}</span>
  </div>
);

export const ShortlistCard: React.FC<ShortlistCardProps> = ({ candidate, rank, onInviteToChallenge, onViewProfile }) => {
  const { t } = useTranslation();
  const emoji = ARCHETYPE_EMOJI[candidate.ximatar_archetype] || '🔮';
  const archetypeName = candidate.ximatar_archetype.charAt(0).toUpperCase() + candidate.ximatar_archetype.slice(1);

  const engagementLabel = {
    highly_active: t('shortlist.engagement.highly_active', 'Highly active'),
    active: t('shortlist.engagement.active', 'Active'),
    moderate: t('shortlist.engagement.moderate', 'Moderate'),
    low: t('shortlist.engagement.new', 'New'),
  }[candidate.engagement_level] || candidate.engagement_level;

  const locationLabel = {
    exact: t('shortlist.location.exact', 'Location match'),
    remote: t('shortlist.location.remote', 'Remote OK'),
    region: t('shortlist.location.region', 'Region match'),
    willing_to_relocate: t('shortlist.location.relocate', 'Open to relocate'),
    any: t('shortlist.location.any', 'Any location'),
  }[candidate.location_match];

  const availabilityLabel = {
    immediately: t('shortlist.availability.immediately', 'Available now'),
    '2_weeks': t('shortlist.availability.2_weeks', 'In 2 weeks'),
    '1_month': t('shortlist.availability.1_month', 'In 1 month'),
    '3_months': t('shortlist.availability.3_months', 'In 3 months'),
  }[candidate.availability];

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardContent className="p-5 space-y-4">
        {/* Header: rank + archetype + score */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              #{rank}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{emoji}</span>
              <div>
                <p className="font-semibold text-sm text-foreground">{archetypeName}</p>
                <p className="text-xs text-muted-foreground">L{candidate.ximatar_level}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{candidate.total_score}</p>
            <p className="text-xs text-muted-foreground">/100</p>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="space-y-1.5">
          <ScoreBar label={t('shortlist.score.identity', 'Identity')} value={candidate.identity_score} max={40} />
          <ScoreBar label={t('shortlist.score.trajectory', 'Trajectory')} value={candidate.trajectory_score} max={20} />
          <ScoreBar label={t('shortlist.score.engagement', 'Engagement')} value={candidate.engagement_score} max={15} />
          <ScoreBar label={t('shortlist.score.location', 'Location')} value={candidate.location_score} max={15} />
          <ScoreBar label={t('shortlist.score.credentials', 'Credentials')} value={candidate.credential_score} max={10} />
        </div>

        {/* Signal badges */}
        <div className="flex flex-wrap gap-1.5">
          {candidate.trajectory_summary && candidate.trajectory_summary !== "No recent growth" && candidate.trajectory_summary !== "New to platform" && (
            <Badge variant="secondary" className="text-xs gap-1">
              <TrendingUp className="w-3 h-3" />
              {candidate.trajectory_summary}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs gap-1">
            <Activity className="w-3 h-3" />
            {engagementLabel}
          </Badge>
          {locationLabel && candidate.location_match !== "no_match" && (
            <Badge variant="outline" className="text-xs gap-1">
              <MapPin className="w-3 h-3" />
              {locationLabel}
            </Badge>
          )}
          {availabilityLabel && (
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="w-3 h-3" />
              {availabilityLabel}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 gap-1" onClick={() => onInviteToChallenge(candidate.candidate_user_id)}>
            <Send className="w-3.5 h-3.5" />
            {t('shortlist.invite_to_challenge', 'Invite to Challenge')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onViewProfile(candidate.candidate_user_id)}>
            <User className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
