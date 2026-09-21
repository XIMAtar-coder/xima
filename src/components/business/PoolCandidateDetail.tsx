import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Send, Bookmark, Shield } from 'lucide-react';
import { XIMATAR_PROFILES } from '@/lib/ximatarTaxonomy';
import { PILLAR_KEYS, readPillar } from '@/lib/pillarKeys';
import { MemberCodeBadge } from './MemberCodeBadge';
import { Chip } from './XsBits';
import { archetypeName, archetypeTitle, PoolCandidate, poolSignals } from './poolBits';

/**
 * The person behind the row. The pool table compares many candidates; this
 * panel answers "who is this one" without leaving the page — the one glass
 * surface of the page.
 */
export const PoolCandidateDetail: React.FC<{
  candidate: PoolCandidate;
  onInvite: (c: PoolCandidate) => void;
  onSave: (c: PoolCandidate) => void;
  inviteDisabled?: boolean;
}> = ({ candidate, onInvite, onSave, inviteDisabled }) => {
  const { t } = useTranslation();
  const profile = XIMATAR_PROFILES[candidate.ximatar_archetype];
  const signals = poolSignals(candidate, t);

  return (
    <div className="xs-glass p-5">
      <div className="flex items-center gap-3">
        <img
          src={`/ximatars/${candidate.ximatar_archetype}.webp`}
          alt=""
          aria-hidden="true"
          className="h-12 w-12 shrink-0 rounded-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
        />
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold leading-tight text-foreground">
            {archetypeName(t, candidate.ximatar_archetype, profile?.name)}
          </p>
          <p className="truncate text-[13px] text-muted-foreground">
            {archetypeTitle(t, candidate.ximatar_archetype, profile?.title)} · {t('candidate_pool.level_short', 'L{{n}}', { n: candidate.ximatar_level })}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <MemberCodeBadge code={candidate.subscriber_code} />
        {signals.map((s) => <Chip key={s}>{s}</Chip>)}
      </div>

      <p className="xs-eyebrow mt-5">{t('candidate_pool.five_pillars', 'The five pillars')}</p>
      <p className="mt-1 text-[12px] text-muted-foreground">{t('candidate_pool.pillars_scale', 'Assessment values · scale 0–10')}</p>
      <div className="mt-3 space-y-2.5">
        {PILLAR_KEYS.map((key) => {
          const value = readPillar(candidate.pillar_scores, key);
          return (
            <div key={key} className="grid grid-cols-[110px_minmax(0,1fr)_22px] items-center gap-3 text-[13px]">
              <span className="truncate text-foreground">{t(`shortlist.pillar.${key}`)}</span>
              <span className="h-[5px] rounded-sm bg-[hsl(var(--xs-line))]">
                <span className="block h-full rounded-sm bg-primary" style={{ width: `${value ?? 0}%` }} />
              </span>
              <span className="text-right font-mono tabular-nums text-foreground">
                {value == null ? '—' : Math.round(value / 10)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-[hsl(var(--xs-line))] pt-4">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {t('candidate_pool.protected_identity', 'Protected identity')}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {t('candidate_pool.protected_identity_body', 'The profile describes how this person thinks and works. The name is revealed only if they accept your invitation.')}
        </p>
      </div>

      {candidate.is_synthetic ? (
        <p className="mt-4 text-[13px] text-muted-foreground">{t('candidate_pool.sample_profile', 'Sample profile')}</p>
      ) : (
        <div className="mt-5 flex gap-2">
          <Button className="flex-1" onClick={() => onInvite(candidate)} disabled={inviteDisabled}>
            <Send className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('candidate_pool.invite', 'Invite')}
          </Button>
          <Button variant="outline" size="icon" onClick={() => onSave(candidate)} aria-label={t('candidate_pool.save', 'Save')}>
            <Bookmark className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PoolCandidateDetail;
