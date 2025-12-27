import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { XIMA_CORE_CHALLENGE } from '@/lib/challenges/ximaCoreChallenge';
import { 
  ArrowLeft, Loader2, Rocket, Eye, Clock, Target, 
  CheckCircle2, Sparkles, HelpCircle, CalendarClock
} from 'lucide-react';

interface HiringGoal {
  id: string;
  role_title: string | null;
  task_description: string | null;
  experience_level: string | null;
  function_area: string | null;
  work_model: string | null;
  country: string | null;
}

interface CompanyProfile {
  operating_style: string | null;
  communication_style: string | null;
  values: string[] | null;
}

const CreateXimaCoreChallenge = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const goalId = searchParams.get('goal');
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: businessLoading } = useBusinessRole();

  const [hiringGoal, setHiringGoal] = useState<HiringGoal | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Challenge state
  const [scenario, setScenario] = useState(XIMA_CORE_CHALLENGE.scenarioTemplate);
  const [businessType, setBusinessType] = useState('');
  const [startAt, setStartAt] = useState<string>('');
  const [endAt, setEndAt] = useState<string>('');

  // Set default dates
  useEffect(() => {
    if (!startAt) {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setStartAt(now.toISOString().slice(0, 16));
      setEndAt(weekFromNow.toISOString().slice(0, 16));
    }
  }, [startAt]);

  // Load data
  useEffect(() => {
    if (!isAuthenticated || (businessLoading === false && !isBusiness)) {
      navigate('/business/login');
      return;
    }

    if (!businessLoading && user?.id) {
      loadData();
    }
  }, [goalId, user?.id, isAuthenticated, isBusiness, businessLoading, navigate]);

  const loadData = async () => {
    // Load hiring goal if provided
    if (goalId) {
      const { data: goalData, error: goalError } = await supabase
        .from('hiring_goal_drafts')
        .select('id, role_title, task_description, experience_level, function_area, work_model, country')
        .eq('id', goalId)
        .eq('business_id', user?.id)
        .single();

      if (goalError || !goalData) {
        toast({
          title: t('common.error'),
          description: 'Hiring goal not found',
          variant: 'destructive'
        });
        navigate('/business/dashboard');
        return;
      }

      setHiringGoal(goalData);
    }

    // Load company profile
    const { data: companyData } = await supabase
      .from('company_profiles')
      .select('operating_style, communication_style, values')
      .eq('company_id', user?.id)
      .single();

    if (companyData) {
      setCompanyProfile(companyData);
    }

    setLoading(false);
    
    // Auto-generate scenario
    generateScenario();
  };

  const generateScenario = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-challenge', {
        body: {
          mode: 'xima_core',
          context: {
            roleTitle: hiringGoal?.role_title || undefined,
            functionArea: hiringGoal?.function_area || undefined,
            experienceLevel: hiringGoal?.experience_level || undefined,
            taskDescription: hiringGoal?.task_description || undefined,
            decisionStyle: companyProfile?.operating_style || undefined,
          }
        }
      });

      if (error) throw error;
      
      if (data?.scenario) {
        setScenario(data.scenario);
        setBusinessType(data.business_type || '');
      }
    } catch (err) {
      console.error('Failed to generate scenario:', err);
      // Keep default scenario
    } finally {
      setGenerating(false);
    }
  };

  const handleActivate = async () => {
    if (!startAt || !endAt) {
      toast({
        title: t('common.error'),
        description: t('challenge_builder.dates_required'),
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      // Build the full description with intro + scenario + questions
      const fullDescription = buildChallengeDescription();
      
      // Archive any existing active challenges for this goal
      if (goalId) {
        await supabase
          .from('business_challenges')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('business_id', user?.id)
          .eq('hiring_goal_id', goalId)
          .eq('status', 'active');
      }

      // Create the challenge
      const { error } = await supabase
        .from('business_challenges')
        .insert([{
          title: XIMA_CORE_CHALLENGE.title,
          description: fullDescription,
          success_criteria: XIMA_CORE_CHALLENGE.questions.map(q => q.label),
          time_estimate_minutes: XIMA_CORE_CHALLENGE.timeEstimateMinutes,
          rubric: {
            criteria: { framing: 1, decision_quality: 1, execution_bias: 1, impact_thinking: 1 },
            scenario,
            level: 1,
            isXimaCore: true,
          },
          status: 'active',
          business_id: user?.id,
          hiring_goal_id: goalId || null,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          difficulty: 1, // Level 1
        }]);

      if (error) throw error;

      toast({
        title: t('challenge_builder.activated'),
        description: t('xima_core.activated_desc'),
      });

      // Navigate back
      if (goalId) {
        navigate(`/business/candidates?fromGoal=${goalId}`);
      } else {
        navigate('/business/challenges');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      toast({
        title: t('common.error'),
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const buildChallengeDescription = (): string => {
    const parts = [
      XIMA_CORE_CHALLENGE.intro,
      '',
      '---',
      '',
      '**Scenario:**',
      scenario,
      '',
      '---',
      '',
      '**Questions:**',
      '',
      ...XIMA_CORE_CHALLENGE.questions.map((q, idx) => 
        `${idx + 1}. **${q.label}**\n${q.prompt}`
      ),
    ];
    return parts.join('\n');
  };

  if (loading || businessLoading) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(goalId ? `/business/candidates?fromGoal=${goalId}` : '/business/challenges')}
            className="gap-2 -ml-2"
          >
            <ArrowLeft size={16} />
            {t('common.back')}
          </Button>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/20">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">
                  {XIMA_CORE_CHALLENGE.title}
                </h1>
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  Level 1
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {t('xima_core.page_subtitle')}
              </p>
              {hiringGoal?.role_title && (
                <Badge variant="outline" className="mt-2">
                  {hiringGoal.role_title}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Info */}
          <div className="space-y-6">
            {/* What is XIMA Core */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  {t('xima_core.what_is_title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  {t('xima_core.what_is_desc')}
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{t('xima_core.feature_1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{t('xima_core.feature_2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{t('xima_core.feature_3')}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Scenario Preview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    {t('xima_core.scenario_title')}
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generateScenario}
                    disabled={generating}
                    className="gap-2"
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {t('xima_core.regenerate')}
                  </Button>
                </div>
                <CardDescription>
                  {t('xima_core.scenario_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generating ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <p className="text-foreground whitespace-pre-wrap">{scenario}</p>
                    {businessType && (
                      <Badge variant="outline" className="mt-3">
                        {businessType}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time Window */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  {t('challenge_builder.time_window_label')}
                </CardTitle>
                <CardDescription>{t('challenge_builder.time_window_hint')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      {t('challenge_builder.start_date')}
                    </label>
                    <Input
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      {t('challenge_builder.end_date')}
                    </label>
                    <Input
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            <Card className="lg:sticky lg:top-6">
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{t('xima_core.preview_title')}</CardTitle>
                </div>
                <CardDescription>{t('xima_core.preview_desc')}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Intro */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-foreground text-sm italic">
                    {XIMA_CORE_CHALLENGE.intro}
                  </p>
                </div>

                <Separator />

                {/* Scenario */}
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {t('xima_core.scenario_label')}
                  </h3>
                  <p className="text-foreground text-sm">{scenario}</p>
                </div>

                <Separator />

                {/* Questions */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">
                    {t('xima_core.questions_label')}
                  </h3>
                  <div className="space-y-4">
                    {XIMA_CORE_CHALLENGE.questions.map((q, idx) => (
                      <div key={q.id} className="text-sm">
                        <p className="font-medium text-foreground">
                          {idx + 1}. {q.label}
                        </p>
                        <p className="text-muted-foreground mt-1">
                          {q.prompt}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Time */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {t('challenge_builder.estimated_time', { minutes: XIMA_CORE_CHALLENGE.timeEstimateMinutes })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-24" />

      {/* Fixed CTA bar */}
      <div 
        className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-white/10 p-4"
        style={{ zIndex: 9999 }}
      >
        <div className="max-w-5xl mx-auto flex gap-3 justify-end">
          <Button 
            onClick={handleActivate} 
            disabled={saving || generating || !startAt || !endAt}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            {t('xima_core.activate_button')}
          </Button>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default CreateXimaCoreChallenge;
