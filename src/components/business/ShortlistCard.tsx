import React from 'react';
import { useTranslation } from 'react-i18next';
import { Panel, Eyebrow } from '@/components/layout/PageHeader';
import { Chip, PillarBars } from '@/components/business/XsBits';
import { PillarScoreBar, formatRoundedScore } from './PillarScoreBar';
import { MemberCodeBadge } from './MemberCodeBadge';
import { parseReasons, reasonGlyph, reasonText, getArchetypeImageUrl, archetypeDisplayName, type ShortlistCandidate } from './shortlistHelpers';

interface ShortlistCardProps {
  candidate: ShortlistCandidate;
  rank: number;
  invited?: boolean;
  /** The company's five-pillar profile, drawn as tick marks on the candidate's bars. */
  companyPillars?: Record<string, unknown> | null;
  onViewProfile: (candidateUserId: string) => void;
}

const glyphClass = { up: 'text-emerald-700 dark:text-emerald-400', warn: 'text-amber-700 dark:text-amber-400', none: 'text-muted-foreground' } as const;
const glyphChar = { up: '↗', warn: '!', none: '—' } as const;

/**
 * The selected candidate's card in the shortlist context column: identity,
 * compatibility score, the reasons, the five pillars against the company
 * profile, and the evidence available.
 */
export const ShortlistCard: React.FC<ShortlistCardProps> = ({ candidate, rank, invited = false, companyPillars, onViewProfile }) => {
  const { t } = useTranslation();
  const reasons = parseReasons(candidate.match_narrative);
  const unavailable = t('shortlist.not_available', 'Not available');
  const archetypeName = archetypeDisplayName(t, candidate.ximatar_archetype);
  const recommended = reasons.some((r) => r.k === 'archetype_recommended');
  const challengesDone = reasons.find((r) => r.k === 'challenges_done');
  const challengesCount = challengesDone ? Number(challengesDone.v) : reasons.some((r) => r.k === 'no_challenges') ? 0 : null;

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

  const chips = [
    candidate.trajectory_summary && candidate.trajectory_summary !== 'No recent growth' && candidate.trajectory_summary !== 'New to platform' ? candidate.trajectory_summary : null,
    engagementLabel,
    locationLabel && candidate.location_match !== 'no_match' ? locationLabel : null,
    availabilityLabel,
  ].filter(Boolean) as string[];

  return (
    <Panel aria-label={t('shortlist.detail_aria', 'Selected candidate')} className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <img
          src={getArchetypeImageUrl(candidate.ximatar_archetype)}
          alt={`XIMAtar ${archetypeName}`}
          className="h-[58px] w-[58px] shrink-0 object-contain"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
        />
        <div className="min-w-0">
          <Eyebrow>
            {candidate.anonymous_label
              ? t('shortlist.candidate_label', { label: candidate.anonymous_label, defaultValue: 'Candidate #{{label}}' })
              : t('shortlist.rank_label', { rank, defaultValue: 'Candidate {{rank}}' })}
          </Eyebrow>
          <h2 className="mt-0.5 text-[22px] font-semibold leading-tight tracking-[-0.5px] text-foreground">{archetypeName}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {recommended && <Chip tone="blue">{t('shortlist.recommended_archetype', 'Recommended archetype')}</Chip>}
            {invited && <Chip tone="status">{t('shortlist.invited', 'Invited')}</Chip>}
            <MemberCodeBadge code={candidate.subscriber_code} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <b className="font-mono text-[54px] font-normal leading-[1.1] tracking-[-3px] text-foreground tabular-nums">{formatRoundedScore(candidate.total_score)}</b>
        <span className="text-sm text-muted-foreground">/100</span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{t('shortlist.score_caption', 'Compatibility with the goal')}</p>

      {reasons.length > 0 && (
        <ul className="grid gap-2.5 text-xs text-muted-foreground" aria-label={t('shortlist.reasons_label', 'Why this candidate')}>
          {reasons.map((r, i) => {
            const text = reasonText(t, r);
            if (!text) return null;
            const glyph = reasonGlyph(r);
            return (
              <li key={`${r.k}-${i}`} className="grid grid-cols-[15px_1fr] gap-2">
                <span className={`font-semibold ${glyphClass[glyph]}`} aria-hidden="true">{glyphChar[glyph]}</span>
                <span>{text}</span>
              </li>
            );
          })}
        </ul>
      )}

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {chips.map((c) => <Chip key={c}>{c}</Chip>)}
        </div>
      )}

      <div className="mt-5 border-t border-[hsl(var(--xs-line))] pt-4">
        <h3 className="mb-3 text-[15px] font-semibold text-foreground">{t('businessPortal.overview_five_pillars', 'The five pillars')}</h3>
        <PillarBars scores={candidate.pillar_scores} reference={companyPillars ?? undefined} />
        <div className="mt-4 flex flex-wrap items-center gap-3.5 text-[10px] text-muted-foreground">
          <span><i className="mr-1 inline-block h-[3px] w-3.5 bg-primary align-middle" aria-hidden="true" />{t('shortlist.legend_candidate', 'Candidate')}</span>
          {companyPillars && <span><i className="mr-1 inline-block h-[9px] w-[2px] bg-foreground align-middle" aria-hidden="true" />{t('shortlist.legend_company', 'Company profile')}</span>}
          <span>{t('businessPortal.scale_0_100', 'Scale 0–100')}</span>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3.5 border-t border-[hsl(var(--xs-line))] pt-4 text-xs">
        <div>
          <dt className="text-muted-foreground">{t('shortlist.facts_challenges_done', 'Challenges completed')}</dt>
          <dd className="mt-0.5 font-mono font-medium text-foreground" title={challengesCount == null ? unavailable : undefined}>{challengesCount ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('shortlist.facts_credentials', 'Credentials (out of 10)')}</dt>
          <dd className="mt-0.5 font-mono font-medium text-foreground" title={candidate.credential_score == null ? unavailable : undefined}>
            {candidate.credential_score == null ? '—' : formatRoundedScore(candidate.credential_score)}
          </dd>
        </div>
      </dl>

      <details className="mt-4 border-t border-[hsl(var(--xs-line))] pt-3 text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{t('shortlist.score_breakdown', 'How the score is composed')}</summary>
        <div className="mt-3 space-y-1.5">
          <PillarScoreBar label={t('shortlist.score.identity', 'Identity')} value={candidate.identity_score} max={40} />
          <PillarScoreBar label={t('shortlist.score.performance', 'Challenges')} value={candidate.performance_score ?? null} max={20} unavailableLabel={unavailable} />
          <PillarScoreBar label={t('shortlist.score.location', 'Location')} value={candidate.location_score} max={15} />
          <PillarScoreBar label={t('shortlist.score.credentials', 'Credentials')} value={candidate.credential_score} max={10} unavailableLabel={unavailable} />
          <PillarScoreBar label={t('shortlist.score.trajectory', 'Trajectory')} value={candidate.trajectory_score} max={10} />
          <PillarScoreBar label={t('shortlist.score.engagement', 'Engagement')} value={candidate.engagement_score} max={5} />
        </div>
      </details>

      <button
        type="button"
        onClick={() => onViewProfile(candidate.candidate_user_id)}
        className="mt-5 text-xs font-medium text-primary underline underline-offset-[3px] hover:text-primary/80"
      >
        {t('shortlist.open_anonymous_profile', 'Open anonymous profile')} <span aria-hidden="true">↗</span>
      </button>
    </Panel>
  );
};
