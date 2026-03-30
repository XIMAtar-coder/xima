import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Sparkles, Settings, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    values?: string[] | null;
    operating_style?: string | null;
    communication_style?: string | null;
    ideal_traits?: string[] | null;
    risk_areas?: string[] | null;
  } | null;
  profileStatus: 'ready' | 'incomplete' | 'loading';
  onGenerate: () => void;
}

const formatCulture = (c: string) => ({
  high_performance: 'High-Performance',
  collaborative: 'Collaborative',
  innovation_first: 'Innovation-First',
  people_centered: 'People-Centered',
  mission_driven: 'Mission-Driven',
}[c] || c);

const cultureDescription = (c: string) => ({
  high_performance: 'Results and excellence drive your organization',
  collaborative: 'Teamwork and trust are your foundation',
  innovation_first: 'You experiment, disrupt, and move fast',
  people_centered: 'Growth, wellbeing, and balance lead your decisions',
  mission_driven: 'United by purpose and impact over profit',
}[c] || '');

const formatHiringApproach = (h: string) => ({
  skills_first: 'Skills-First',
  cultural_fit: 'Cultural Fit',
  potential: 'Potential Over Experience',
  balanced: 'Balanced Approach',
}[h] || h);

const hiringDescription = (h: string) => ({
  skills_first: 'You evaluate what people can do, not credentials',
  cultural_fit: 'Values alignment matters as much as capabilities',
  potential: 'You hire for trajectory, not just track record',
  balanced: 'You weigh skills, culture, and potential equally',
}[h] || '');

const formatGrowthStage = (g: string) => ({
  startup: 'Startup',
  scaleup: 'Scale-up',
  established: 'Established',
  enterprise: 'Enterprise',
  nonprofit: 'Non-profit / Public',
}[g] || g);

const PILLAR_LABELS: Record<string, string> = {
  drive: 'Drive',
  comp_power: 'Comp. Power',
  computational_power: 'Comp. Power',
  communication: 'Communication',
  creativity: 'Creativity',
  knowledge: 'Knowledge',
};

export const CompanyIdentityCard: React.FC<CompanyIdentityCardProps> = ({
  businessProfile,
  companyProfile,
  profileStatus,
  onGenerate,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [aiProfileOpen, setAiProfileOpen] = useState(false);

  if (!businessProfile) return null;

  const bp = businessProfile;
  const industry = bp.manual_industry || bp.snapshot_industry || (bp.metadata as any)?.industry;
  const city = bp.manual_hq_city || bp.snapshot_hq_city || (bp.metadata as any)?.headquarters_city;
  const country = bp.manual_hq_country || bp.snapshot_hq_country || (bp.metadata as any)?.headquarters_country;
  const companySize = bp.company_size || (bp.metadata as any)?.company_size;
  const teamCulture = bp.team_culture || (bp.metadata as any)?.team_culture;
  const hiringApproach = bp.hiring_approach || (bp.metadata as any)?.hiring_approach;
  const growthStage = bp.growth_stage || (bp.metadata as any)?.growth_stage;
  const recommendedXimatars = companyProfile?.recommended_ximatars || [];
  const pillarVector = companyProfile?.pillar_vector;

  // Profile is "ready" when AI company profile exists with a summary
  const resolvedStatus = profileStatus === 'loading' ? 'loading' : (companyProfile?.summary ? 'ready' : 'incomplete');

  return (
    <Card className="border-border/50">
      <CardContent className="p-6">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">{bp.company_name}</h2>
            <div className="flex gap-2 mt-2 flex-wrap">
              {industry && <Badge variant="outline">{industry}</Badge>}
              {growthStage && <Badge variant="outline">{formatGrowthStage(growthStage)}</Badge>}
              {companySize && <Badge variant="outline">{companySize} employees</Badge>}
              {city && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {city}{country ? `, ${country}` : ''}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {resolvedStatus !== 'loading' && (
              <Badge
                variant={resolvedStatus === 'ready' ? 'default' : 'secondary'}
                className={resolvedStatus === 'ready'
                  ? 'bg-green-500/15 text-green-600 border-green-500/25'
                  : 'bg-amber-500/15 text-amber-600 border-amber-500/25'
                }
              >
                {resolvedStatus === 'ready' 
                  ? t('businessPortal.dashboard_profile_ready', 'Profile Ready') 
                  : t('businessPortal.dashboard_profile_incomplete', 'Incomplete')}
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/business/settings')}>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Culture + Hiring DNA */}
        {(teamCulture || hiringApproach) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {teamCulture && (
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('businessPortal.team_culture_label', 'Team Culture')}</p>
                <p className="font-medium mt-1 text-foreground">{formatCulture(teamCulture)}</p>
                <p className="text-sm text-muted-foreground mt-1">{cultureDescription(teamCulture)}</p>
              </div>
            )}
            {hiringApproach && (
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('businessPortal.hiring_approach_label', 'Hiring Approach')}</p>
                <p className="font-medium mt-1 text-foreground">{formatHiringApproach(hiringApproach)}</p>
                <p className="text-sm text-muted-foreground mt-1">{hiringDescription(hiringApproach)}</p>
              </div>
            )}
          </div>
        )}

        {/* Pillar DNA */}
        {pillarVector && Object.keys(pillarVector).length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">{t('businessPortal.pillar_dna_label', 'Company Pillar DNA')}</p>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(pillarVector).map(([key, value]) => {
                const score = typeof value === 'number' ? value : 0;
                const label = PILLAR_LABELS[key] || key.replace(/_/g, ' ');
                return (
                  <div key={key} className="text-center">
                    <div
                      className="relative mx-auto w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center"
                      style={{
                        background: `conic-gradient(hsl(var(--primary)) ${score}%, transparent ${score}%)`,
                      }}
                    >
                      <span className="text-xs font-bold text-foreground bg-background rounded-full w-8 h-8 flex items-center justify-center">
                        {score}
                      </span>
                    </div>
                    <p className="text-xs mt-1 text-muted-foreground capitalize">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommended XIMatars */}
        {recommendedXimatars.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">{t('businessPortal.best_fit_ximatars', 'Best-fit XIMatars for your culture:')}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {recommendedXimatars.map((x) => (
                <div key={x} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-sm">
                  <img src={`/ximatars/${x}.png`} className="w-5 h-5" alt={x} />
                  <span className="capitalize text-foreground">{x}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible AI Profile */}
        {companyProfile && companyProfile.summary && (
          <div className="mt-4 pt-4 border-t border-border">
            <button 
              onClick={() => setAiProfileOpen(!aiProfileOpen)}
              className="text-sm text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${aiProfileOpen ? 'rotate-90' : ''}`} />
              {t('businessPortal.view_ai_profile', 'View Full AI Profile')}
            </button>
            {aiProfileOpen && (
              <div className="mt-4 space-y-4">
                {companyProfile.summary && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('businessPortal.company_summary', 'Company Summary')}</p>
                    <p className="text-sm mt-1 text-foreground">{companyProfile.summary}</p>
                  </div>
                )}
                {companyProfile.values && companyProfile.values.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('businessPortal.core_values', 'Core Values')}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {companyProfile.values.map((v: string) => (
                        <span key={v} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground">{v}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {companyProfile.operating_style && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('businessPortal.operating_style', 'Operating Style')}</p>
                      <p className="text-sm mt-1 text-foreground">{companyProfile.operating_style}</p>
                    </div>
                  )}
                  {companyProfile.communication_style && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('businessPortal.communication_style', 'Communication Style')}</p>
                      <p className="text-sm mt-1 text-foreground">{companyProfile.communication_style}</p>
                    </div>
                  )}
                </div>
                {companyProfile.ideal_traits && companyProfile.ideal_traits.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('businessPortal.ideal_traits', 'Ideal Candidate Traits')}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {companyProfile.ideal_traits.map((trait: string) => (
                        <span key={trait} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{trait}</span>
                      ))}
                    </div>
                  </div>
                )}
                <button 
                  onClick={onGenerate}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mt-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('businessPortal.regenerate_profile', 'Regenerate Profile')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Generate profile CTA if no AI profile */}
        {!companyProfile && (
          <div className="mt-6 p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 text-center">
            <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              {t('business.profile.generate_description')}
            </p>
            <Button onClick={onGenerate} size="sm" className="gap-2">
              <Sparkles className="h-4 w-4" />
              {t('business.profile.generate_cta')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
