import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Target, Briefcase, CheckCircle } from 'lucide-react';
import { Level2Rubric, RoleFamily } from '@/lib/challenges/level2Templates';

interface Level2ContextBlockProps {
  companyName: string;
  roleTitle?: string | null;
  roleFamily?: RoleFamily | null;
  skillFocus?: string[];
  ximaCoreSummary?: string[];
}

/**
 * Read-only context block shown at the top of Level 2 challenges.
 * Displays company context, role constraints, and XIMA Core summary.
 */
export function Level2ContextBlock({
  companyName,
  roleTitle,
  roleFamily,
  skillFocus = [],
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
      {/* Company & Role Context */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/20 shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">
                {t('candidate.level2.context_title')}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t('candidate.level2.context_desc', { companyName, roleTitle: roleTitle || t('common.this_role') })}
              </p>
              
              {/* Role badge */}
              <div className="flex flex-wrap gap-2 mt-3">
                {roleTitle && (
                  <Badge variant="secondary" className="gap-1">
                    <Briefcase className="h-3 w-3" />
                    {roleTitle}
                  </Badge>
                )}
                {roleFamily && (
                  <Badge variant="outline" className="bg-background">
                    {getRoleFamilyLabel(roleFamily)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* XIMA Core Summary (if available) */}
      {ximaCoreSummary && ximaCoreSummary.length > 0 && (
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-muted shrink-0">
                <Target className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  {t('candidate.level2.core_context_title')}
                </h4>
                <ul className="space-y-1.5">
                  {ximaCoreSummary.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full mt-2 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hard Skill Focus Declaration */}
      {skillFocus.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-2">
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
