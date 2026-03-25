import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GrowthResource {
  id: string;
  title: string;
  platform?: string;
  url?: string;
  read_url?: string;
  primary_pillar: string;
  secondary_pillar?: string | null;
  estimated_hours?: number;
  episode_length_minutes?: number;
  why_for_you: string;
  language: string;
  difficulty?: string;
  free_access_note?: string;
  author?: string;
  key_takeaway?: string;
  availability?: string;
  host?: string;
  episode_title?: string | null;
}

export interface GrowthPath {
  id: string;
  user_id: string;
  path_title: string;
  path_objective: string | null;
  target_pillar: string;
  resources: {
    courses: GrowthResource[];
    books: GrowthResource[];
    podcasts: GrowthResource[];
  };
  growth_insight: string | null;
  next_milestone: string | null;
  status: string;
  estimated_total_hours: number | null;
  created_at: string;
}

export interface GrowthProgress {
  id: string;
  resource_id: string;
  resource_type: string;
  resource_title: string;
  resource_platform: string | null;
  resource_url: string | null;
  primary_pillar: string | null;
  status: string;
  test_score: number | null;
  test_passed: boolean | null;
  test_config: any;
  pillar_deltas: any;
}

export interface GrowthTestResult {
  total_score: number;
  passed: boolean;
  per_question: Array<{ question_id: string; score: number; feedback: string }>;
  overall_feedback: string;
  next_recommendation: string;
  pillar_deltas?: Record<string, number>;
  delta_reasoning?: string;
}

export function useGrowthHub() {
  const { toast } = useToast();
  const [activePath, setActivePath] = useState<GrowthPath | null>(null);
  const [progress, setProgress] = useState<GrowthProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [testingResourceId, setTestingResourceId] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<any>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<GrowthTestResult | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: paths } = await supabase
        .from('growth_paths')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      const path = paths?.[0] || null;
      setActivePath(path as any);

      if (path) {
        const { data: prog } = await supabase
          .from('growth_hub_progress')
          .select('*')
          .eq('path_id', path.id)
          .eq('user_id', user.id);
        setProgress((prog as any[]) || []);
      } else {
        setProgress([]);
      }
    } catch (err) {
      console.error('[GrowthHub] fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generatePath = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-growth-path', {
        body: {}
      });
      if (error) throw error;
      toast({ title: 'Growth Hub', description: 'Your personalized Growth Path is ready!' });
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate growth path', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const markResourceCompleted = async (progressId: string) => {
    try {
      await supabase
        .from('growth_hub_progress')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', progressId);
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const generateTest = async (progressId: string) => {
    setTestingResourceId(progressId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-growth-test', {
        body: { progress_id: progressId }
      });
      if (error) throw error;
      setActiveTest({ ...data.test, progress_id: progressId });
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate test', variant: 'destructive' });
    } finally {
      setTestingResourceId(null);
    }
  };

  const submitTest = async (progressId: string, answers: Array<{ question_id: string; answer_text: string }>) => {
    setEvaluating(true);
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-growth-test', {
        body: { progress_id: progressId, answers }
      });
      if (error) throw error;
      setLastTestResult(data.results);
      setActiveTest(null);
      await fetchData();
      return data;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to evaluate test', variant: 'destructive' });
    } finally {
      setEvaluating(false);
    }
  };

  const dismissTestResult = () => setLastTestResult(null);

  const getProgressForResource = (resourceId: string) =>
    progress.find(p => p.resource_id === resourceId);

  const completedCount = progress.filter(p => p.status === 'test_passed').length;
  const totalCount = progress.length;
  const overallProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return {
    activePath,
    progress,
    loading,
    generating,
    testingResourceId,
    activeTest,
    evaluating,
    lastTestResult,
    generatePath,
    markResourceCompleted,
    generateTest,
    submitTest,
    dismissTestResult,
    getProgressForResource,
    completedCount,
    totalCount,
    overallProgress,
    setActiveTest,
  };
}
