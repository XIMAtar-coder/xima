import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  XIMATAR_PROFILES, 
  XIMATAR_PILLAR_VECTORS,
  computePillarDistance,
  computeKeywordBonus,
  rankXimatarsByDistance,
  NEUTRAL_PILLARS,
  type XimatarPillars,
  type XimatarProfile
} from '@/lib/ximatarTaxonomy';

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
  };
  recommendedXimatars: XimatarExplanation[];
  allXimatarsRanked: XimatarExplanation[];
  mismatchWarnings: string[];
}

function computeDistance(a: XimatarPillars, b: XimatarPillars): number {
  return Math.sqrt(
    (a.drive - b.drive) ** 2 +
    (a.comp_power - b.comp_power) ** 2 +
    (a.communication - b.communication) ** 2 +
    (a.creativity - b.creativity) ** 2 +
    (a.knowledge - b.knowledge) ** 2
  );
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
      
      // Build contexts
      // Safely parse pillar_vector from JSON
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
      
      // Compute all XIMAtar rankings using canonical taxonomy
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
      
      if (companyContext.recommended_ximatars) {
        const storedTop3 = companyContext.recommended_ximatars.slice(0, 3);
        const computedTop3 = recommendedXimatars.map(x => x.ximatar);
        const storedSet = new Set(storedTop3);
        const computedSet = new Set(computedTop3);
        const missing = storedTop3.filter(x => !computedSet.has(x));
        const extra = computedTop3.filter(x => !storedSet.has(x));
        
        if (missing.length > 0 || extra.length > 0) {
          mismatchWarnings.push(`⚠️ Stored recommendations [${storedTop3.join(', ')}] differ from computed [${computedTop3.join(', ')}]`);
        }
      }
      
      if (!pillarVector) {
        mismatchWarnings.push('⚠️ No pillar_vector in company_profiles - using neutral baseline (50 all)');
      }
      
      if (hiringGoalContext && !hiringGoalContext.role_title) {
        mismatchWarnings.push('⚠️ Hiring goal has no role_title - may affect future matching');
      }
      
      // Build debug data
      const data: RecommendationDebugData = {
        timestamp: new Date().toISOString(),
        companyContext,
        hiringGoalContext,
        matchingStrategy: {
          algorithm: 'euclidean_distance',
          description: 'Ranks XIMAtar templates by Euclidean distance from company pillar_vector. Closest templates are recommended.',
          weights: {
            drive: 1,
            comp_power: 1,
            communication: 1,
            creativity: 1,
            knowledge: 1
          }
        },
        recommendedXimatars,
        allXimatarsRanked,
        mismatchWarnings
      };
      
      setDebugData(data);
      
      // Log to console for easy debugging
      console.log('[RecommendationDebug] Full debug data:', data);
      
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

// Re-exported from ximatarTaxonomy for backward compatibility
