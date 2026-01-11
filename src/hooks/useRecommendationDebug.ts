import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  XIMATAR_PROFILES, 
  XIMATAR_PILLAR_VECTORS,
  computePillarDistance,
  NEUTRAL_PILLARS,
  type XimatarPillars,
} from '@/lib/ximatarTaxonomy';
import { 
  computeXimatarRecommendations,
  type RecommendationResult,
  type XimatarRecommendation,
  SCORING_WEIGHTS,
} from '@/lib/recommendations';

// Re-export for use in components
export { XIMATAR_PROFILES, XIMATAR_PILLAR_VECTORS };

export interface CompanyContext {
  source: 'business_profiles';
  company_name: string | null;
  industry: string | null;
  website: string | null;
  hq_city: string | null;
  employees_count: number | null;
  pillar_vector: XimatarPillars | null;
  values: string[] | null;
  ideal_traits: string[] | null;
  operating_style: string | null;
  communication_style: string | null;
  recommended_ximatars: string[] | null;
  ideal_ximatar_profile_ids: string[] | null;
}

export interface HiringGoalContext {
  source: 'hiring_goal_drafts';
  id: string;
  role_title: string | null;
  function_area: string | null;
  experience_level: string | null;
  task_description: string | null;
  work_model: string | null;
  country: string | null;
  city_region: string | null;
}

export interface XimatarExplanation {
  ximatar: string;
  distance: number;
  rank: number;
  pillar_deltas: Record<string, number>;
  match_signals: string[];
  source_alignment: 'company' | 'goal' | 'both' | 'template_default';
  contribution_breakdown: {
    pillar: string;
    company_value: number;
    template_value: number;
    delta: number;
  }[];
}

export interface RecommendationDebugData {
  timestamp: string;
  companyContext: CompanyContext | null;
  hiringGoalContext: HiringGoalContext | null;
  matchingStrategy: {
    algorithm: string;
    description: string;
    weights: Record<string, number>;
    constraints: {
      min_company_constraint: number;
      total_recommendations: number;
    };
  };
  // New engine results
  engineResult: RecommendationResult | null;
  // Legacy format for backward compatibility
  recommendedXimatars: XimatarExplanation[];
  allXimatarsRanked: XimatarExplanation[];
  mismatchWarnings: string[];
}

function computeExplanation(
  ximatar: string,
  companyVector: XimatarPillars | null,
  rank: number
): XimatarExplanation {
  const profile = XIMATAR_PROFILES[ximatar];
  const template = profile?.pillars || NEUTRAL_PILLARS;
  const effectiveCompanyVector = companyVector || NEUTRAL_PILLARS;
  
  const distance = computePillarDistance(effectiveCompanyVector, template);
  
  const pillars = ['drive', 'comp_power', 'communication', 'creativity', 'knowledge'] as const;
  const pillar_deltas: Record<string, number> = {};
  const contribution_breakdown = pillars.map(p => {
    const compVal = effectiveCompanyVector[p];
    const templateVal = template[p];
    const delta = templateVal - compVal;
    pillar_deltas[p] = delta;
    return {
      pillar: p,
      company_value: compVal,
      template_value: templateVal,
      delta
    };
  });
  
  // Identify match signals
  const match_signals: string[] = [];
  const sortedByDelta = [...contribution_breakdown].sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
  const closestPillars = sortedByDelta.slice(0, 2);
  closestPillars.forEach(p => {
    if (Math.abs(p.delta) < 15) {
      match_signals.push(`Strong ${p.pillar} alignment (Δ${p.delta > 0 ? '+' : ''}${p.delta})`);
    }
  });
  
  // Check for high template values that match company needs
  contribution_breakdown.forEach(p => {
    if (p.template_value >= 80 && p.company_value >= 70) {
      match_signals.push(`High ${p.pillar} match (both ≥70)`);
    }
  });
  
  return {
    ximatar,
    distance: Math.round(distance * 10) / 10,
    rank,
    pillar_deltas,
    match_signals,
    source_alignment: companyVector ? 'company' : 'template_default',
    contribution_breakdown
  };
}

export function useRecommendationDebug(businessId: string | undefined, hiringGoalId: string | null) {
  const [debugData, setDebugData] = useState<RecommendationDebugData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDebugData = useCallback(async () => {
    if (!businessId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 1. Load business profile
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', businessId)
        .maybeSingle();
      
      // 2. Load company profile (AI-generated)
      const { data: companyProfile } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('company_id', businessId)
        .maybeSingle();
      
      // 3. Load hiring goal if specified
      let hiringGoal = null;
      if (hiringGoalId) {
        const { data } = await supabase
          .from('hiring_goal_drafts')
          .select('*')
          .eq('id', hiringGoalId)
          .maybeSingle();
        hiringGoal = data;
      }
      
      // Parse pillar_vector from JSON
      let pillarVector: XimatarPillars | null = null;
      if (companyProfile?.pillar_vector && typeof companyProfile.pillar_vector === 'object') {
        const pv = companyProfile.pillar_vector as Record<string, unknown>;
        if (typeof pv.drive === 'number' && typeof pv.comp_power === 'number') {
          pillarVector = {
            drive: pv.drive as number,
            comp_power: pv.comp_power as number,
            communication: (pv.communication as number) || 50,
            creativity: (pv.creativity as number) || 50,
            knowledge: (pv.knowledge as number) || 50,
          };
        }
      }
      
      // Parse ideal_ximatar_profile_ids
      let idealXimatarIds: string[] | null = null;
      if (companyProfile?.ideal_ximatar_profile_ids && Array.isArray(companyProfile.ideal_ximatar_profile_ids)) {
        idealXimatarIds = companyProfile.ideal_ximatar_profile_ids;
      }
      
      const companyContext: CompanyContext = {
        source: 'business_profiles',
        company_name: businessProfile?.company_name || null,
        industry: businessProfile?.snapshot_industry || businessProfile?.manual_industry || null,
        website: businessProfile?.website || businessProfile?.manual_website || null,
        hq_city: businessProfile?.snapshot_hq_city || businessProfile?.manual_hq_city || null,
        employees_count: businessProfile?.snapshot_employees_count || businessProfile?.manual_employees_count || null,
        pillar_vector: pillarVector,
        values: companyProfile?.values || null,
        ideal_traits: companyProfile?.ideal_traits || null,
        operating_style: companyProfile?.operating_style || null,
        communication_style: companyProfile?.communication_style || null,
        recommended_ximatars: companyProfile?.recommended_ximatars || null,
        ideal_ximatar_profile_ids: idealXimatarIds,
      };
      
      const hiringGoalContext: HiringGoalContext | null = hiringGoal ? {
        source: 'hiring_goal_drafts',
        id: hiringGoal.id,
        role_title: hiringGoal.role_title,
        function_area: hiringGoal.function_area,
        experience_level: hiringGoal.experience_level,
        task_description: hiringGoal.task_description,
        work_model: hiringGoal.work_model,
        country: hiringGoal.country,
        city_region: hiringGoal.city_region,
      } : null;
      
      // ============ RUN NEW RECOMMENDATION ENGINE ============
      const engineResult = computeXimatarRecommendations(
        {
          ideal_ximatar_profile_ids: companyContext.ideal_ximatar_profile_ids,
          pillar_vector: companyContext.pillar_vector,
          values: companyContext.values,
          ideal_traits: companyContext.ideal_traits,
          industry: companyContext.industry,
        },
        {
          role_title: hiringGoalContext?.role_title,
          function_area: hiringGoalContext?.function_area,
          experience_level: hiringGoalContext?.experience_level,
          task_description: hiringGoalContext?.task_description,
          country: hiringGoalContext?.country,
          city_region: hiringGoalContext?.city_region,
        }
      );
      
      // ============ LEGACY: Compute pillar-distance rankings ============
      const companyPillarVector = companyContext.pillar_vector;
      const effectiveVector = companyPillarVector || NEUTRAL_PILLARS;
      
      const allXimatarsRanked = Object.keys(XIMATAR_PROFILES)
        .map(x => {
          const profile = XIMATAR_PROFILES[x];
          return { ximatar: x, distance: computePillarDistance(effectiveVector, profile.pillars) };
        })
        .sort((a, b) => a.distance - b.distance)
        .map((x, idx) => computeExplanation(x.ximatar, companyPillarVector, idx + 1));
      
      const recommendedXimatars = allXimatarsRanked.slice(0, 3);
      
      // Detect mismatches
      const mismatchWarnings: string[] = [];
      
      if (!companyProfile) {
        mismatchWarnings.push('⚠️ No company profile generated - recommendations use default values');
      }
      
      if (!idealXimatarIds || idealXimatarIds.length === 0) {
        mismatchWarnings.push('⚠️ No ideal_ximatar_profile_ids in company profile - using goal-only strategy');
      }
      
      if (companyContext.recommended_ximatars) {
        const storedTop3 = companyContext.recommended_ximatars.slice(0, 3);
        const engineTop3 = engineResult.recommendations.slice(0, 3).map(r => r.ximatar_id);
        const storedSet = new Set(storedTop3);
        const engineSet = new Set(engineTop3);
        const missing = storedTop3.filter(x => !engineSet.has(x));
        
        if (missing.length > 0) {
          mismatchWarnings.push(`⚠️ Legacy stored [${storedTop3.join(', ')}] differs from engine [${engineTop3.join(', ')}]`);
        }
      }
      
      if (!pillarVector) {
        mismatchWarnings.push('⚠️ No pillar_vector in company_profiles - using neutral baseline (50 all)');
      }
      
      if (hiringGoalContext && !hiringGoalContext.role_title) {
        mismatchWarnings.push('⚠️ Hiring goal has no role_title - may affect matching quality');
      }
      
      // Build debug data
      const data: RecommendationDebugData = {
        timestamp: new Date().toISOString(),
        companyContext,
        hiringGoalContext,
        matchingStrategy: {
          algorithm: 'hybrid_constraint_scoring',
          description: `Hard constraint: ≥${engineResult.debug_info.min_company_constraint} from company's ideal list. Soft rank by goal similarity (skills 45%, keywords 25%, industry 15%, seniority 10%, location 5%).`,
          weights: SCORING_WEIGHTS,
          constraints: {
            min_company_constraint: engineResult.debug_info.min_company_constraint,
            total_recommendations: 12,
          },
        },
        engineResult,
        recommendedXimatars,
        allXimatarsRanked,
        mismatchWarnings
      };
      
      setDebugData(data);
      
      // Log to console for easy debugging
      console.log('[RecommendationDebug] Full debug data:', data);
      console.log('[RecommendationDebug] Engine result:', engineResult);
      
    } catch (err: any) {
      console.error('[RecommendationDebug] Error:', err);
      setError(err.message || 'Failed to load debug data');
    } finally {
      setLoading(false);
    }
  }, [businessId, hiringGoalId]);

  useEffect(() => {
    loadDebugData();
  }, [loadDebugData]);

  return {
    debugData,
    loading,
    error,
    refresh: loadDebugData
  };
}
