/**
 * Level 2 (Role-Based) Challenge Templates
 * 
 * These templates define structured role-specific challenges
 * that validate hard skills through realistic deliverables.
 */

export type RoleFamily = 'engineering' | 'data' | 'sales' | 'marketing' | 'operations';

export type DeliverableType = 
  | 'structured_design' 
  | 'structured_analysis' 
  | 'email_sequence' 
  | 'campaign_brief' 
  | 'process_plan';

export interface Level2PromptBlock {
  id: string;
  labelKey: string;
  placeholderKey: string;
  type: 'textarea' | 'list' | 'structured';
  required: boolean;
}

export interface Level2Template {
  id: string;
  roleFamily: RoleFamily;
  titleKey: string;
  descriptionKey: string;
  deliverableType: DeliverableType;
  timeboxMinutes: number;
  skillFocus: string[];
  prompts: Level2PromptBlock[];
  evaluationCriteriaKeys: string[];
}

export interface Level2Rubric {
  level: 2;
  type: 'role_based';
  role_family: RoleFamily;
  skill_focus: string[];
  deliverable_type: DeliverableType;
  timebox_minutes: number;
  company_context_ref: {
    business_id: string;
    hiring_goal_id: string;
  };
  prompts: Level2PromptBlock[];
  evaluation_criteria: string[];
  template_id?: string;
}

/**
 * Curated Level 2 templates by role family
 */
export const LEVEL_2_TEMPLATES: Level2Template[] = [
  // Engineering
  {
    id: 'engineering_system_design',
    roleFamily: 'engineering',
    titleKey: 'level2.templates.engineering.title',
    descriptionKey: 'level2.templates.engineering.description',
    deliverableType: 'structured_design',
    timeboxMinutes: 45,
    skillFocus: ['system_design', 'constraints_handling', 'technical_communication'],
    prompts: [
      {
        id: 'context',
        labelKey: 'level2.prompts.context',
        placeholderKey: 'level2.prompts.context_placeholder',
        type: 'textarea',
        required: true,
      },
      {
        id: 'components',
        labelKey: 'level2.prompts.components',
        placeholderKey: 'level2.prompts.components_placeholder',
        type: 'list',
        required: true,
      },
      {
        id: 'tradeoffs',
        labelKey: 'level2.prompts.tradeoffs',
        placeholderKey: 'level2.prompts.tradeoffs_placeholder',
        type: 'textarea',
        required: true,
      },
      {
        id: 'constraints',
        labelKey: 'level2.prompts.constraints',
        placeholderKey: 'level2.prompts.constraints_placeholder',
        type: 'textarea',
        required: false,
      },
    ],
    evaluationCriteriaKeys: [
      'level2.criteria.engineering.clarity',
      'level2.criteria.engineering.feasibility',
      'level2.criteria.engineering.tradeoffs',
    ],
  },

  // Data
  {
    id: 'data_metrics_experiment',
    roleFamily: 'data',
    titleKey: 'level2.templates.data.title',
    descriptionKey: 'level2.templates.data.description',
    deliverableType: 'structured_analysis',
    timeboxMinutes: 40,
    skillFocus: ['metrics_definition', 'experiment_design', 'analytical_reasoning'],
    prompts: [
      {
        id: 'problem',
        labelKey: 'level2.prompts.problem',
        placeholderKey: 'level2.prompts.problem_placeholder',
        type: 'textarea',
        required: true,
      },
      {
        id: 'metrics',
        labelKey: 'level2.prompts.metrics',
        placeholderKey: 'level2.prompts.metrics_placeholder',
        type: 'list',
        required: true,
      },
      {
        id: 'experiment',
        labelKey: 'level2.prompts.experiment',
        placeholderKey: 'level2.prompts.experiment_placeholder',
        type: 'structured',
        required: true,
      },
      {
        id: 'risks',
        labelKey: 'level2.prompts.risks',
        placeholderKey: 'level2.prompts.risks_placeholder',
        type: 'textarea',
        required: false,
      },
    ],
    evaluationCriteriaKeys: [
      'level2.criteria.data.metrics_relevance',
      'level2.criteria.data.experiment_rigor',
      'level2.criteria.data.risk_awareness',
    ],
  },

  // Sales
  {
    id: 'sales_account_plan',
    roleFamily: 'sales',
    titleKey: 'level2.templates.sales.title',
    descriptionKey: 'level2.templates.sales.description',
    deliverableType: 'email_sequence',
    timeboxMinutes: 35,
    skillFocus: ['account_planning', 'outreach_strategy', 'value_proposition'],
    prompts: [
      {
        id: 'target_analysis',
        labelKey: 'level2.prompts.target_analysis',
        placeholderKey: 'level2.prompts.target_analysis_placeholder',
        type: 'textarea',
        required: true,
      },
      {
        id: 'value_prop',
        labelKey: 'level2.prompts.value_prop',
        placeholderKey: 'level2.prompts.value_prop_placeholder',
        type: 'textarea',
        required: true,
      },
      {
        id: 'outreach_sequence',
        labelKey: 'level2.prompts.outreach_sequence',
        placeholderKey: 'level2.prompts.outreach_sequence_placeholder',
        type: 'list',
        required: true,
      },
    ],
    evaluationCriteriaKeys: [
      'level2.criteria.sales.target_understanding',
      'level2.criteria.sales.value_clarity',
      'level2.criteria.sales.sequence_logic',
    ],
  },

  // Marketing
  {
    id: 'marketing_campaign_brief',
    roleFamily: 'marketing',
    titleKey: 'level2.templates.marketing.title',
    descriptionKey: 'level2.templates.marketing.description',
    deliverableType: 'campaign_brief',
    timeboxMinutes: 40,
    skillFocus: ['campaign_strategy', 'audience_targeting', 'kpi_definition'],
    prompts: [
      {
        id: 'objective',
        labelKey: 'level2.prompts.objective',
        placeholderKey: 'level2.prompts.objective_placeholder',
        type: 'textarea',
        required: true,
      },
      {
        id: 'audience',
        labelKey: 'level2.prompts.audience',
        placeholderKey: 'level2.prompts.audience_placeholder',
        type: 'textarea',
        required: true,
      },
      {
        id: 'channels',
        labelKey: 'level2.prompts.channels',
        placeholderKey: 'level2.prompts.channels_placeholder',
        type: 'list',
        required: true,
      },
      {
        id: 'kpis',
        labelKey: 'level2.prompts.kpis',
        placeholderKey: 'level2.prompts.kpis_placeholder',
        type: 'list',
        required: true,
      },
    ],
    evaluationCriteriaKeys: [
      'level2.criteria.marketing.strategic_alignment',
      'level2.criteria.marketing.audience_fit',
      'level2.criteria.marketing.measurability',
    ],
  },

  // Operations
  {
    id: 'operations_process_improvement',
    roleFamily: 'operations',
    titleKey: 'level2.templates.operations.title',
    descriptionKey: 'level2.templates.operations.description',
    deliverableType: 'process_plan',
    timeboxMinutes: 40,
    skillFocus: ['process_analysis', 'optimization', 'change_management'],
    prompts: [
      {
        id: 'current_state',
        labelKey: 'level2.prompts.current_state',
        placeholderKey: 'level2.prompts.current_state_placeholder',
        type: 'textarea',
        required: true,
      },
      {
        id: 'pain_points',
        labelKey: 'level2.prompts.pain_points',
        placeholderKey: 'level2.prompts.pain_points_placeholder',
        type: 'list',
        required: true,
      },
      {
        id: 'proposed_changes',
        labelKey: 'level2.prompts.proposed_changes',
        placeholderKey: 'level2.prompts.proposed_changes_placeholder',
        type: 'structured',
        required: true,
      },
      {
        id: 'rollout_plan',
        labelKey: 'level2.prompts.rollout_plan',
        placeholderKey: 'level2.prompts.rollout_plan_placeholder',
        type: 'textarea',
        required: false,
      },
    ],
    evaluationCriteriaKeys: [
      'level2.criteria.operations.problem_diagnosis',
      'level2.criteria.operations.solution_practicality',
      'level2.criteria.operations.implementation_clarity',
    ],
  },
];

/**
 * Get templates by role family
 */
export function getTemplatesByRoleFamily(roleFamily: RoleFamily): Level2Template[] {
  return LEVEL_2_TEMPLATES.filter(t => t.roleFamily === roleFamily);
}

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): Level2Template | undefined {
  return LEVEL_2_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Get all role families
 */
export function getAllRoleFamilies(): RoleFamily[] {
  return ['engineering', 'data', 'sales', 'marketing', 'operations'];
}

/**
 * Build a Level 2 rubric from a template
 */
export function buildLevel2Rubric(
  template: Level2Template,
  businessId: string,
  hiringGoalId: string,
  evaluationCriteria: string[]
): Level2Rubric {
  return {
    level: 2,
    type: 'role_based',
    role_family: template.roleFamily,
    skill_focus: template.skillFocus,
    deliverable_type: template.deliverableType,
    timebox_minutes: template.timeboxMinutes,
    company_context_ref: {
      business_id: businessId,
      hiring_goal_id: hiringGoalId,
    },
    prompts: template.prompts,
    evaluation_criteria: evaluationCriteria,
    template_id: template.id,
  };
}

/**
 * Build a custom Level 2 rubric (no template)
 */
export function buildCustomLevel2Rubric(
  businessId: string,
  hiringGoalId: string,
  config: {
    roleFamily: RoleFamily;
    skillFocus: string[];
    deliverableType: DeliverableType;
    timeboxMinutes: number;
    prompts: Level2PromptBlock[];
    evaluationCriteria: string[];
  }
): Level2Rubric {
  return {
    level: 2,
    type: 'role_based',
    role_family: config.roleFamily,
    skill_focus: config.skillFocus,
    deliverable_type: config.deliverableType,
    timebox_minutes: config.timeboxMinutes,
    company_context_ref: {
      business_id: businessId,
      hiring_goal_id: hiringGoalId,
    },
    prompts: config.prompts,
    evaluation_criteria: config.evaluationCriteria,
  };
}

/**
 * Detect if a rubric is Level 2
 */
export function isLevel2Rubric(rubric: unknown): rubric is Level2Rubric {
  if (!rubric || typeof rubric !== 'object') return false;
  const r = rubric as Record<string, unknown>;
  return r.level === 2 && r.type === 'role_based';
}

/**
 * Get deliverable type label key
 */
export function getDeliverableTypeKey(type: DeliverableType): string {
  const map: Record<DeliverableType, string> = {
    structured_design: 'level2.deliverable.structured_design',
    structured_analysis: 'level2.deliverable.structured_analysis',
    email_sequence: 'level2.deliverable.email_sequence',
    campaign_brief: 'level2.deliverable.campaign_brief',
    process_plan: 'level2.deliverable.process_plan',
  };
  return map[type] || type;
}

/**
 * Get role family label key
 */
export function getRoleFamilyKey(family: RoleFamily): string {
  return `level2.role_family.${family}`;
}
