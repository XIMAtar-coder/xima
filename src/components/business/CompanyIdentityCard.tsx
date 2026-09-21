import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Panel, Eyebrow } from '@/components/layout/PageHeader';
import { Chip, PillarBars } from '@/components/business/XsBits';
import { getCompanyDisplayField } from '@/utils/companyProfileDisplay';

interface CompanyIdentityCardProps {
  businessProfile: {
    company_name: string;
    company_size?: string | null;
    hiring_approach?: string | null;
    team_culture?: string | null;
    growth_stage?: string | null;
    snapshot_industry?: string | null;
    snapshot_hq_city?: string | null;
    snapshot_hq_country?: string | null;
    manual_industry?: string | null;
    manual_hq_city?: string | null;
    manual_hq_country?: string | null;
    manual_employees_count?: number | null;
    snapshot_employees_count?: number | null;
    metadata?: any;
  } | null;
  companyProfile: {
    pillar_vector?: Record<string, number> | null;
    recommended_ximatars?: string[] | null;
    summary?: string | null;
    summary_override?: string | null;
    values?: string[] | null;
    values_override?: any | null;
    operating_style?: string | null;
    operating_style_override?: string | null;
    communication_style?: string | null;
    communication_style_override?: string | null;
    ideal_traits?: string[] | null;
    ideal_traits_override?: any | null;
    risk_areas?: string[] | null;
  } | null;
  profileStatus: 'ready' | 'incomplete' | 'loading';
  onGenerate: () => void;
}

const formatCulture = (c: string, t: (key: string, fallback: string) => string) => ({
  high_performance: t('businessPortal.culture_high_performance', 'High-Performance'),
  collaborative: t('businessPortal.culture_collaborative', 'Collaborative'),
  innovation_first: t('businessPortal.culture_innovation_first', 'Innovation-First'),
  people_centered: t('businessPortal.culture_people_centered', 'People-Centered'),
  mission_driven: t('businessPortal.culture_mission_driven', 'Mission-Driven'),
}[c] || c);

const cultureDescription = (c: string, t: (key: string, fallback: string) => string) => ({
  high_performance: t('businessPortal.culture_high_performance_desc', 'Results and excellence drive your organization'),
  collaborative: t('businessPortal.culture_collaborative_desc', 'Teamwork and trust are your foundation'),
  innovation_first: t('businessPortal.culture_innovation_first_desc', 'You experiment, disrupt, and move fast'),
  people_centered: t('businessPortal.culture_people_centered_desc', 'Growth, wellbeing, and balance lead your decisions'),
  mission_driven: t('businessPortal.culture_mission_driven_desc', 'United by purpose and impact over profit'),
}[c] || '');

const formatHiringApproach = (h: string, t: (key: string, fallback: string) => string) => ({
  skills_first: t('businessPortal.hiring_skills_first', 'Skills-First'),
  cultural_fit: t('businessPortal.hiring_cultural_fit', 'Cultural Fit'),
  potential: t('businessPortal.hiring_potential', 'Potential Over Experience'),
  balanced: t('businessPortal.hiring_balanced', 'Balanced Approach'),
}[h] || h);

const hiringDescription = (h: string, t: (key: string, fallback: string) => string) => ({
  skills_first: t('businessPortal.hiring_skills_first_desc', 'You evaluate what people can do, not credentials'),
  cultural_fit: t('businessPortal.hiring_cultural_fit_desc', 'Values alignment matters as much as capabilities'),
  potential: t('businessPortal.hiring_potential_desc', 'You hire for trajectory, not just track record'),
  balanced: t('businessPortal.hiring_balanced_desc', 'You weigh skills, culture, and potential equally'),
}[h] || '');

const formatGrowthStage = (g: string, t: (key: string, fallback: string) => string) => ({
  startup: t('businessPortal.stage_startup', 'Startup'),
  scaleup: t('businessPortal.stage_scaleup', 'Scale-up'),
  established: t('businessPortal.stage_established', 'Established'),
  enterprise: t('businessPortal.stage_enterprise', 'Enterprise'),
  nonprofit: t('businessPortal.stage_nonprofit', 'Non-profit / Public'),
}[g] || g);

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The company profile panel of the dashboard: who you are, the five pillars
 * as bars, the XIMAtars close to the company, and the full profile folded
 * under "Explore the full profile".
 */
export const CompanyIdentityCard: React.FC<CompanyIdentityCardProps> = ({
  businessProfile,
  companyProfile,
  profileStatus,
  onGenerate,
}) => {
  const { t } = useTranslation();

  if (!businessProfile) return null;

  const bp = businessProfile;
  const logoUrl = (bp as any).logo_url || (bp as any).company_logo;
  const industry = bp.manual_industry || bp.snapshot_industry || (bp.metadata as any)?.industry;
  const city = bp.manual_hq_city || bp.snapshot_hq_city || (bp.metadata as any)?.headquarters_city;
  const country = bp.manual_hq_country || bp.snapshot_hq_country || (bp.metadata as any)?.headquarters_country;
  const companySize = bp.company_size || (bp.metadata as any)?.company_size;
  const teamCulture = bp.team_culture || (bp.metadata as any)?.team_culture;
  const hiringApproach = bp.hiring_approach || (bp.metadata as any)?.hiring_approach;
  const growthStage = bp.growth_stage || (bp.metadata as any)?.growth_stage;
  const recommendedXimatars = companyProfile?.recommended_ximatars || [];
  const pillarVector = companyProfile?.pillar_vector;

  // Use override-aware display helpers
  const displaySummary = getCompanyDisplayField(companyProfile, 'summary');
  const displayValues: string[] = getCompanyDisplayField(companyProfile, 'values') || [];
  const displayOperatingStyle = getCompanyDisplayField(companyProfile, 'operating_style');
  const displayCommunicationStyle = getCompanyDisplayField(companyProfile, 'communication_style');
  const displayIdealTraits: string[] = getCompanyDisplayField(companyProfile, 'ideal_traits') || [];

  const resolvedStatus = profileStatus === 'loading' ? 'loading' : (displaySummary ? 'ready' : 'incomplete');
  const metaLine = [
    industry,
    growthStage ? formatGrowthStage(growthStage, t) : null,
    companySize ? `${companySize} ${t('businessPortal.employees', 'employees')}` : null,
    city ? `${city}${country ? `, ${country}` : ''}` : null,
  ].filter(Boolean).join(' · ');

  const hasFullProfile = !!(displayOperatingStyle || displayCommunicationStyle || displayIdealTraits.length || teamCulture || hiringApproach);

  return (
    <Panel aria-busy={resolvedStatus === 'loading'}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eyebrow>{t('businessPortal.company_profile_title')}</Eyebrow>
          {resolvedStatus === 'incomplete' && <Chip>{t('businessPortal.dashboard_profile_incomplete', 'Incomplete')}</Chip>}
        </div>
        <Link to="/business/settings" className="text-xs font-medium text-primary hover:underline">
          {t('common.edit')} <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={bp.company_name}
            width={36}
            height={36}
            loading="lazy"
            decoding="async"
            className="h-9 w-9 shrink-0 rounded-lg border border-[hsl(var(--xs-line))] bg-background object-contain"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base font-semibold text-primary" aria-hidden="true">
            {bp.company_name?.[0]?.toLowerCase() || 'c'}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[19px] font-semibold tracking-[-0.45px] text-foreground">{bp.company_name}</h2>
          {metaLine && <p className="text-xs text-muted-foreground">{metaLine}</p>}
        </div>
      </div>

      {displaySummary && <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{displaySummary}</p>}

      {displayValues.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5" aria-label={t('businessPortal.core_values')}>
          {displayValues.map((v) => <Chip key={v}>{v}</Chip>)}
        </div>
      )}

      {pillarVector && Object.keys(pillarVector).length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-foreground">{t('businessPortal.overview_five_pillars', 'The five pillars')}</h3>
            <span className="text-xs text-muted-foreground">{t('businessPortal.scale_0_100', 'Scale 0–100')}</span>
          </div>
          <PillarBars scores={pillarVector} showAxis />
        </div>
      )}

      {recommendedXimatars.length > 0 && (
        <div className="mt-6">
          <Eyebrow>{t('businessPortal.overview_ximatars_close', 'XIMAtars close to the company')}</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-4">
            {recommendedXimatars.map((x) => (
              <div key={x} className="flex items-center gap-2 text-xs text-foreground">
                <img loading="lazy" decoding="async" src={`/ximatars/${x}.webp`} className="h-9 w-9 object-contain" alt="" />
                <span>{t(`about.archetypes.name_${x}`, capitalize(x))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {companyProfile && hasFullProfile && (
        <details className="mt-5 border-t border-[hsl(var(--xs-line))] pt-4">
          <summary className="cursor-pointer text-xs font-medium text-primary">{t('businessPortal.overview_explore_profile', 'Explore the full profile')}</summary>
          <div className="mt-3 space-y-3 text-xs leading-relaxed text-muted-foreground">
            {teamCulture && (
              <p><b className="text-foreground">{t('businessPortal.team_culture_label', 'Team Culture')}.</b> {formatCulture(teamCulture, t)}. {cultureDescription(teamCulture, t)}</p>
            )}
            {hiringApproach && (
              <p><b className="text-foreground">{t('businessPortal.hiring_approach_label', 'Hiring Approach')}.</b> {formatHiringApproach(hiringApproach, t)}. {hiringDescription(hiringApproach, t)}</p>
            )}
            {displayOperatingStyle && (
              <p><b className="text-foreground">{t('businessPortal.operating_style', 'Operating Style')}.</b> {displayOperatingStyle}</p>
            )}
            {displayCommunicationStyle && (
              <p><b className="text-foreground">{t('businessPortal.communication_style', 'Communication Style')}.</b> {displayCommunicationStyle}</p>
            )}
            {displayIdealTraits.length > 0 && (
              <p><b className="text-foreground">{t('businessPortal.ideal_traits', 'Ideal Candidate Traits')}.</b> {displayIdealTraits.join(', ')}</p>
            )}
            <button type="button" onClick={onGenerate} className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              {t('businessPortal.regenerate_profile', 'Regenerate Profile')}
            </button>
          </div>
        </details>
      )}

      {!companyProfile && resolvedStatus !== 'loading' && (
        <div className="mt-5 border-t border-[hsl(var(--xs-line))] pt-4">
          <p className="text-xs leading-relaxed text-muted-foreground">{t('business.profile.generate_description')}</p>
          <Button onClick={onGenerate} size="sm" variant="outline" className="mt-3">
            {t('business.profile.generate_cta')}
          </Button>
        </div>
      )}
    </Panel>
  );
};
