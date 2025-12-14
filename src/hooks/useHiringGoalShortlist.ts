import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HiringGoal {
  id: string;
  task_description: string | null;
  role_title: string | null;
  experience_level: string | null;
  work_model: string | null;
  country: string | null;
  city_region: string | null;
}

interface CandidateWithMatch {
  user_id: string;
  ximatar_label: string;
  ximatar_image: string;
  evaluation_score: number;
  pillar_average: number;
  computational_power: number;
  communication: number;
  knowledge: number;
  creativity: number;
  drive: number;
  rank: number;
  matchLevel: 'high' | 'medium' | 'low';
  matchReasons: string[];
  relevanceScore: number;
}

// Simple keyword extraction from task description
const extractKeywords = (text: string): string[] => {
  if (!text) return [];
  
  // Common task-related keywords to look for
  const taskKeywords = [
    'sales', 'pipeline', 'conversion', 'accounts', 'team', 'lead', 'manage',
    'automate', 'reporting', 'partnerships', 'strategy', 'analysis', 'data',
    'marketing', 'communication', 'creative', 'design', 'development', 'code',
    'customer', 'support', 'operations', 'finance', 'hr', 'recruit',
    'project', 'product', 'growth', 'revenue', 'cost', 'efficiency',
    'independent', 'collaborate', 'execute', 'plan', 'build', 'optimize'
  ];
  
  const lowerText = text.toLowerCase();
  return taskKeywords.filter(kw => lowerText.includes(kw));
};

// Map experience level to expected pillar thresholds
const getExperienceThresholds = (level: string | null): { min: number; preferred: number } => {
  switch (level) {
    case 'first_time':
      return { min: 4, preferred: 6 };
    case 'independent':
      return { min: 6, preferred: 7.5 };
    case 'led_others':
      return { min: 7, preferred: 8.5 };
    default:
      return { min: 5, preferred: 7 };
  }
};

// Map task keywords to pillar affinities
const keywordToPillarMap: Record<string, string[]> = {
  'sales': ['communication', 'drive'],
  'pipeline': ['drive', 'computational_power'],
  'conversion': ['communication', 'creativity'],
  'accounts': ['communication', 'knowledge'],
  'team': ['communication', 'drive'],
  'lead': ['drive', 'communication'],
  'manage': ['drive', 'knowledge'],
  'automate': ['computational_power', 'creativity'],
  'reporting': ['computational_power', 'knowledge'],
  'partnerships': ['communication', 'drive'],
  'strategy': ['knowledge', 'creativity'],
  'analysis': ['computational_power', 'knowledge'],
  'data': ['computational_power', 'knowledge'],
  'marketing': ['creativity', 'communication'],
  'creative': ['creativity', 'communication'],
  'design': ['creativity', 'knowledge'],
  'development': ['computational_power', 'creativity'],
  'code': ['computational_power', 'knowledge'],
  'customer': ['communication', 'drive'],
  'support': ['communication', 'knowledge'],
  'operations': ['drive', 'knowledge'],
  'growth': ['drive', 'creativity'],
  'independent': ['drive', 'computational_power'],
  'execute': ['drive', 'knowledge'],
  'build': ['creativity', 'computational_power'],
  'optimize': ['computational_power', 'drive']
};

// Calculate match score and reasons
const calculateMatch = (
  candidate: any,
  keywords: string[],
  thresholds: { min: number; preferred: number }
): { level: 'high' | 'medium' | 'low'; reasons: string[]; score: number } => {
  const reasons: string[] = [];
  let score = 0;

  // Rule 1: Keyword relevance (PRIMARY - up to 50 points)
  const pillarAffinities: Record<string, number> = {};
  keywords.forEach(kw => {
    const pillars = keywordToPillarMap[kw] || [];
    pillars.forEach(p => {
      pillarAffinities[p] = (pillarAffinities[p] || 0) + 1;
    });
  });

  // Check XIMAtar label alignment with keywords
  const ximatarLabel = (candidate.ximatar_label || '').toLowerCase();
  const ximatarKeywordMatches = keywords.filter(kw => {
    // Map XIMAtar types to relevant keywords
    const ximatarTraits: Record<string, string[]> = {
      'lion': ['lead', 'team', 'strategy', 'drive'],
      'fox': ['creative', 'strategy', 'growth', 'optimize'],
      'dolphin': ['team', 'communication', 'collaborate', 'support'],
      'owl': ['analysis', 'data', 'reporting', 'knowledge'],
      'bee': ['execute', 'operations', 'efficiency', 'team'],
      'wolf': ['team', 'strategy', 'lead', 'growth'],
      'elephant': ['strategy', 'knowledge', 'plan', 'operations'],
      'cat': ['independent', 'analysis', 'code', 'development'],
      'parrot': ['communication', 'marketing', 'sales', 'customer'],
      'horse': ['execute', 'drive', 'independent', 'operations'],
      'bear': ['operations', 'support', 'manage', 'knowledge'],
      'chameleon': ['creative', 'growth', 'collaborate', 'optimize']
    };
    return ximatarTraits[ximatarLabel]?.includes(kw);
  });

  if (ximatarKeywordMatches.length >= 2) {
    score += 40;
    reasons.push(`Strong match on ${ximatarKeywordMatches.slice(0, 2).join(' & ')} tasks`);
  } else if (ximatarKeywordMatches.length === 1) {
    score += 25;
    reasons.push(`Aligns with ${ximatarKeywordMatches[0]} focus`);
  }

  // Rule 2: Pillar affinity (SECONDARY - up to 35 points)
  const topAffinities = Object.entries(pillarAffinities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  const pillarScores: Record<string, number> = {
    computational_power: candidate.computational_power || 0,
    communication: candidate.communication || 0,
    knowledge: candidate.knowledge || 0,
    creativity: candidate.creativity || 0,
    drive: candidate.drive || 0
  };

  const highPillars: string[] = [];
  topAffinities.forEach(([pillar, weight]) => {
    const candidateScore = pillarScores[pillar] || 0;
    if (candidateScore >= thresholds.preferred) {
      score += 15;
      highPillars.push(pillar.replace('_', ' '));
    } else if (candidateScore >= thresholds.min) {
      score += 8;
    }
  });

  if (highPillars.length > 0) {
    const formattedPillars = highPillars.map(p => 
      p.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    );
    reasons.push(`High ${formattedPillars.join(' & ')} scores`);
  }

  // Rule 3: Overall pillar average bonus (up to 15 points)
  if (candidate.pillar_average >= thresholds.preferred) {
    score += 15;
    reasons.push('Strong overall profile');
  } else if (candidate.pillar_average >= thresholds.min) {
    score += 8;
  }

  // Determine level
  let level: 'high' | 'medium' | 'low';
  if (score >= 55) {
    level = 'high';
  } else if (score >= 30) {
    level = 'medium';
  } else {
    level = 'low';
  }

  // Ensure we have at least 2 reasons
  if (reasons.length === 0) {
    reasons.push('Potential fit based on profile');
  }
  if (reasons.length === 1 && candidate.pillar_average >= 5) {
    reasons.push('Solid foundational skills');
  }

  return { level, reasons: reasons.slice(0, 3), score };
};

export const useHiringGoalShortlist = (goalId: string | null) => {
  const [loading, setLoading] = useState(false);
  const [hiringGoal, setHiringGoal] = useState<HiringGoal | null>(null);
  const [shortlist, setShortlist] = useState<CandidateWithMatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateShortlist = useCallback(async () => {
    if (!goalId) return;
    
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch hiring goal
      const { data: goalData, error: goalError } = await supabase
        .from('hiring_goal_drafts')
        .select('id, task_description, role_title, experience_level, work_model, country, city_region')
        .eq('id', goalId)
        .single();

      if (goalError) throw goalError;
      setHiringGoal(goalData);

      // 2. Fetch all candidates via existing RPC
      const { data: candidatesData, error: candidatesError } = await supabase.rpc('get_candidate_visibility');
      if (candidatesError) throw candidatesError;

      // 3. Extract keywords and thresholds
      const keywords = extractKeywords(goalData.task_description || '');
      const thresholds = getExperienceThresholds(goalData.experience_level);

      console.group('🔍 [DEV] Shortlist Generation');
      console.log('Hiring Goal:', goalData);
      console.log('Extracted keywords:', keywords);
      console.log('Experience thresholds:', thresholds);
      console.log('Total candidates:', candidatesData?.length || 0);

      // 4. Score and filter candidates
      const scoredCandidates: CandidateWithMatch[] = (candidatesData || []).map((candidate: any) => {
        const match = calculateMatch(candidate, keywords, thresholds);
        return {
          user_id: candidate.user_id,
          ximatar_label: candidate.ximatar_label || 'Unknown',
          ximatar_image: candidate.ximatar_image || '/placeholder.svg',
          evaluation_score: Number(candidate.evaluation_score) || 0,
          pillar_average: Number(candidate.pillar_average) || 0,
          computational_power: Number(candidate.computational_power) || 0,
          communication: Number(candidate.communication) || 0,
          knowledge: Number(candidate.knowledge) || 0,
          creativity: Number(candidate.creativity) || 0,
          drive: Number(candidate.drive) || 0,
          rank: Number(candidate.rank) || 0,
          matchLevel: match.level,
          matchReasons: match.reasons,
          relevanceScore: match.score
        };
      });

      // 5. Sort by relevance score (descending) and take top 8-12
      const sorted = scoredCandidates
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 12);

      // Ensure we have at least some candidates even if low match
      const finalShortlist = sorted.length >= 8 
        ? sorted 
        : scoredCandidates.sort((a, b) => b.pillar_average - a.pillar_average).slice(0, 8);

      console.log('Final shortlist:', finalShortlist.length, 'candidates');
      console.table(finalShortlist.map(c => ({
        ximatar: c.ximatar_label,
        matchLevel: c.matchLevel,
        score: c.relevanceScore,
        reasons: c.matchReasons.join(' | ')
      })));
      console.groupEnd();

      setShortlist(finalShortlist);
    } catch (err: any) {
      console.error('Error generating shortlist:', err);
      setError(err.message || 'Failed to generate shortlist');
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    if (goalId) {
      generateShortlist();
    }
  }, [goalId, generateShortlist]);

  return {
    loading,
    hiringGoal,
    shortlist,
    error,
    refresh: generateShortlist
  };
};
