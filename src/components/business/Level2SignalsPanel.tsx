import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Briefcase, 
  Target, 
  Lightbulb, 
  AlertTriangle, 
  Wrench,
  Package
} from 'lucide-react';

interface Level2Payload {
  approach?: string;
  decisions_tradeoffs?: string;
  concrete_deliverables?: string;
  tools_methods?: string;
  risks_failures?: string;
  questions_for_company?: string;
  // Legacy fields for backwards compatibility
  role_plan?: string;
  assumptions_tradeoffs?: string;
  key_deliverables?: string;
}

interface Level2SignalsPanelProps {
  payload: Level2Payload;
  roleTitle?: string | null;
  roleFamily?: string | null;
  skillFocus?: string[];
}

/**
 * Business-facing panel that presents Level 2 hard-skill signals
 * in a structured, scannable format for review.
 */
export function Level2SignalsPanel({
  payload,
  roleTitle,
  roleFamily,
  skillFocus = [],
}: Level2SignalsPanelProps) {
  const { t } = useTranslation();

  // Check which payload format we have
  const hasNewFormat = payload.decisions_tradeoffs || payload.concrete_deliverables;
  
  const sections = hasNewFormat ? [
    {
      key: 'approach',
      icon: Target,
      title: t('business.level2.approach_section'),
      content: payload.approach,
    },
    {
      key: 'decisions',
      icon: Lightbulb,
      title: t('business.level2.decisions_section'),
      content: payload.decisions_tradeoffs,
    },
    {
      key: 'deliverables',
      icon: Package,
      title: t('business.level2.deliverables_section'),
      content: payload.concrete_deliverables,
    },
    {
      key: 'tools',
      icon: Wrench,
      title: t('business.level2.tools_section'),
      content: payload.tools_methods,
    },
    {
      key: 'risks',
      icon: AlertTriangle,
      title: t('business.level2.risks_section'),
      content: payload.risks_failures,
    },
  ] : [
    // Legacy format support
    {
      key: 'approach',
      icon: Target,
      title: t('business.level2.approach_section'),
      content: payload.approach,
    },
    {
      key: 'plan',
      icon: Briefcase,
      title: t('candidate.challenge.role_plan_label'),
      content: payload.role_plan,
    },
    {
      key: 'tradeoffs',
      icon: Lightbulb,
      title: t('candidate.challenge.assumptions_tradeoffs_label'),
      content: payload.assumptions_tradeoffs,
    },
    {
      key: 'deliverables',
      icon: Package,
      title: t('candidate.challenge.key_deliverables_label'),
      content: payload.key_deliverables,
    },
  ];

  const filledSections = sections.filter(s => s.content?.trim());

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              {t('business.level2.hard_skills_title')}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('business.level2.hard_skills_subtitle')}
            </p>
          </div>
          {roleFamily && (
            <Badge variant="secondary">
              {t(`level2.role_family.${roleFamily}`)}
            </Badge>
          )}
        </div>
        
        {/* Skills evaluated */}
        {skillFocus.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {skillFocus.map((skill) => (
              <Badge 
                key={skill} 
                variant="outline" 
                className="text-[10px] h-5 bg-primary/5 border-primary/20"
              >
                {t(`level2.skills.${skill}`, { defaultValue: skill.replace(/_/g, ' ') })}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {filledSections.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('business.level2.no_response_yet')}
          </p>
        ) : (
          filledSections.map((section, index) => (
            <div key={section.key}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <section.icon className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">{section.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">
                  {section.content}
                </p>
              </div>
            </div>
          ))
        )}

        {/* Questions for company (if any) */}
        {payload.questions_for_company?.trim() && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {t('business.level2.candidate_questions')}
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-amber-50 dark:bg-amber-950/30 rounded p-3 border border-amber-200 dark:border-amber-800">
                {payload.questions_for_company}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
