import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Target, Briefcase, CheckCircle, MapPin } from 'lucide-react';
import { RoleFamily } from '@/lib/challenges/level2Templates';

interface Level2ContextBlockProps {
  companyName: string;
  roleTitle?: string | null;
  roleFamily?: RoleFamily | null;
  skillFocus?: string[];
  scenarioContext?: string | null; // AI-generated scenario description
  ximaCoreSummary?: string[]; // Legacy - can still pass if no scenario
}

/**
 * Read-only context block shown at the top of Level 2 challenges.
 * Displays company context, mandatory scenario, role constraints, and skills evaluated.
 */
export function Level2ContextBlock({
  companyName,
  roleTitle,
  roleFamily,
  skillFocus = [],
  scenarioContext,
  ximaCoreSummary,
}: Level2ContextBlockProps) {
  const { t } = useTranslation();

  // Map skill keys to human-readable labels
  const skillLabels: Record<string, string> = {
    system_design: t('level2.skills.system_design'),
    constraints_handling: t('level2.skills.constraints_handling'),
    technical_communication: t('level2.skills.technical_communication'),
    metrics_definition: t('level2.skills.metrics_definition'),
    experiment_design: t('level2.skills.experiment_design'),
    analytical_reasoning: t('level2.skills.analytical_reasoning'),
    account_planning: t('level2.skills.account_planning'),
    outreach_strategy: t('level2.skills.outreach_strategy'),
    value_proposition: t('level2.skills.value_proposition'),
    campaign_strategy: t('level2.skills.campaign_strategy'),
    audience_targeting: t('level2.skills.audience_targeting'),
    kpi_definition: t('level2.skills.kpi_definition'),
    process_analysis: t('level2.skills.process_analysis'),
    optimization: t('level2.skills.optimization'),
    change_management: t('level2.skills.change_management'),
  };

  const getRoleFamilyLabel = (family: RoleFamily) => {
    return t(`level2.role_family.${family}`);
  };

  return (
    <div className="space-y-4">
      {/* Scenario Context Block - PRIMARY */}
      <Card className="border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-primary/20 shrink-0">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground text-lg mb-1">
                  {t('candidate.level2.scenario_title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('candidate.level2.scenario_intro', { 
                    role: roleTitle || t('common.this_role'), 
                    company: companyName 
                  })}
                </p>
              </div>

              {/* Role + Company Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1.5">
                  <Building2 className="h-3 w-3" />
                  {companyName}
                </Badge>
                {roleTitle && (
                  <Badge variant="outline" className="gap-1.5 bg-background">
                    <Briefcase className="h-3 w-3" />
                    {roleTitle}
                  </Badge>
                )}
                {roleFamily && (
                  <Badge variant="outline" className="bg-primary/5 border-primary/20">
                    {getRoleFamilyLabel(roleFamily)}
                  </Badge>
                )}
              </div>

              {/* Scenario Description */}
              {scenarioContext ? (
                <div className="bg-background/80 rounded-lg p-4 border border-border/50">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {scenarioContext}
                  </p>
                </div>
              ) : ximaCoreSummary && ximaCoreSummary.length > 0 ? (
                <div className="bg-background/80 rounded-lg p-4 border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {t('candidate.level2.core_context_title')}
                  </p>
                  <ul className="space-y-1.5">
                    {ximaCoreSummary.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full mt-2 shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="bg-background/80 rounded-lg p-4 border border-border/50">
                  <p className="text-sm text-muted-foreground italic">
                    {t('candidate.level2.scenario_fallback', { company: companyName, role: roleTitle || t('common.this_role') })}
                  </p>
                </div>
              )}

              {/* Important note about scenario */}
              <p className="text-xs text-muted-foreground">
                {t('candidate.level2.scenario_note')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hard Skill Focus Declaration */}
      {skillFocus.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1">
                  {t('candidate.level2.skills_title')}
                </h4>
                <p className="text-muted-foreground text-xs mb-3">
                  {t('candidate.level2.skills_subtitle')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {skillFocus.map((skill) => (
                    <Badge 
                      key={skill} 
                      variant="outline" 
                      className="bg-primary/5 border-primary/20 text-foreground"
                    >
                      {skillLabels[skill] || skill.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
