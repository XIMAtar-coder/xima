import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, Brain, Wrench, CheckCircle2, Star } from 'lucide-react';

const ChallengeTypeSelector = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const goalId = searchParams.get('goal');
  const fromListing = searchParams.get('from_listing');
  const noContext = searchParams.get('no_context') === '1';
  const returnTo = searchParams.get('returnTo');
  const returnParam = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : '';
  const { t } = useTranslation();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: businessLoading } = useBusinessRole();

  const [loading, setLoading] = useState(true);
  const [hasActiveXimaCore, setHasActiveXimaCore] = useState(false);
  const [contextLabel, setContextLabel] = useState<string | null>(null);
  // Opened without a goal: the challenge is written for a role, so ask which one.
  const [goalChoices, setGoalChoices] = useState<{ id: string; role_title: string | null }[] | null>(null);

  // Build downstream context query string preserving goal/from_listing/no_context.
  const buildContextParams = (extra = '') => {
    const parts: string[] = [];
    if (goalId) parts.push(`goal=${goalId}`);
    if (fromListing) parts.push(`from_listing=${fromListing}`);
    if (noContext) parts.push(`no_context=1`);
    if (returnTo) parts.push(`returnTo=${encodeURIComponent(returnTo)}`);
    if (extra) parts.push(extra);
    return parts.length ? `?${parts.join('&')}` : '';
  };

  useEffect(() => {
    if (!isAuthenticated || (businessLoading === false && !isBusiness)) {
      navigate('/business/login');
      return;
    }

    if (!businessLoading && user?.id) {
      checkExistingChallenges();
    }
  }, [goalId, fromListing, noContext, user?.id, isAuthenticated, isBusiness, businessLoading, navigate]);

  const checkExistingChallenges = async () => {
    // No context flag → show selector (no auto-redirect, no goal lookup)
    if (noContext && !goalId && !fromListing) {
      setLoading(false);
      return;
    }

    // From listing → fetch listing title for context label
    if (fromListing && !goalId) {
      const { data: jobData } = await supabase
        .from('job_posts')
        .select('title')
        .eq('id', fromListing)
        .eq('business_id', user?.id ?? '')
        .maybeSingle();

      if (jobData?.title) setContextLabel(jobData.title);
      setLoading(false);
      return;
    }

    // No goal: this used to jump to the XIMA Core page, which wrote a scenario
    // for "your next professional role" and spent an AI call on a placeholder.
    // A challenge belongs to a goal: pick it, or create the first one.
    if (!goalId) {
      const { data: goals } = await supabase
        .from('hiring_goal_drafts')
        .select('id, role_title')
        .eq('business_id', user?.id ?? '')
        .order('updated_at', { ascending: false })
        .limit(20);
      const list = (goals || []).filter((g) => g.role_title);
      if (list.length === 0) {
        navigate('/business/hiring-goals/new', { replace: true });
        return;
      }
      if (list.length === 1) {
        navigate(`/business/challenges/select?goal=${list[0].id}`, { replace: true });
        return;
      }
      setGoalChoices(list);
      setLoading(false);
      return;
    }
    setGoalChoices(null);

    // Get hiring goal title
    const { data: goalData } = await supabase
      .from('hiring_goal_drafts')
      .select('role_title')
      .eq('id', goalId)
      .eq('business_id', user?.id ?? '')
      .single();

    if (goalData?.role_title) {
      setContextLabel(goalData.role_title);
    }

    // Check if XIMA Core already exists for this goal (to inform the user,
    // but ALWAYS render both cards — never auto-redirect to xima-core).
    const { data: existingCore } = await supabase
      .from('business_challenges')
      .select('id')
      .eq('business_id', user?.id ?? '')
      .eq('hiring_goal_id', goalId)
      .eq('status', 'active')
      .contains('rubric', { isXimaCore: true })
      .maybeSingle();

    if (existingCore) {
      setHasActiveXimaCore(true);
    }
    setLoading(false);
  };

  const handleSelectXimaCore = () => {
    navigate(`/business/challenges/xima-core${buildContextParams()}`);
  };

  const handleSelectCustom = () => {
    navigate(`/business/challenges/new${buildContextParams('type=custom')}`);
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

  if (goalChoices) {
    return (
      <BusinessLayout>
        <div className="mx-auto max-w-xl space-y-6 py-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('challenge_type.pick_goal_title', 'Which role is the challenge for?')}</h1>
            <p className="mt-2 text-muted-foreground">{t('challenge_type.pick_goal_body', 'XIMA writes the challenge on the hiring goal: choose one.')}</p>
          </div>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {goalChoices.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/business/challenges/select?goal=${g.id}`)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-medium text-foreground hover:bg-muted/40"
                >
                  <span className="truncate">{g.role_title}</span>
                  <span aria-hidden="true" className="text-primary">→</span>
                </button>
              </li>
            ))}
          </ul>
          <Button variant="outline" onClick={() => navigate('/business/hiring-goals/new')}>
            {t('challenge_type.new_goal', 'Create a new hiring goal')}
          </Button>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="max-w-3xl mx-auto space-y-8 py-8">
        {/* Header */}
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(goalId && returnTo === 'shortlist' ? `/business/hiring-goals/${goalId}/shortlist` : goalId ? `/business/candidates?fromGoal=${goalId}` : '/business/challenges')}
            className="gap-2 -ml-2"
          >
            <ArrowLeft size={16} />
            {t('common.back')}
          </Button>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t('challenge_type.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('challenge_type.subtitle')}
            </p>
            {contextLabel && (
              <Badge variant="secondary" className="mt-3">
                {contextLabel}
              </Badge>
            )}
          </div>
        </div>

        {/* Challenge Type Options */}
        <div className="grid gap-6">
          {/* XIMA Core - Primary Option */}
          <Card 
            className="relative border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
            onClick={handleSelectXimaCore}
          >
            {/* Recommended badge */}
            <div className="absolute -top-3 left-6">
              <Badge className="bg-primary text-primary-foreground gap-1.5 px-3 py-1">
                <Star className="h-3.5 w-3.5 fill-current" />
                {t('challenge_type.recommended')}
              </Badge>
            </div>

            <CardHeader className="pt-8 pb-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 group-hover:scale-105 transition-transform">
                  <Brain className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl flex items-center gap-3">
                    {t('challenge_type.xima_core_title', 'XIMA Core')}
                    <Badge variant="outline" className="text-xs">
                      {t('xima_core.level_1_badge', 'Level 1')}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {t(
                      'challenge_type.xima_core_desc_v2',
                      'Sfida soft-skills standard generata da XIMA su obiettivo + DNA aziendale. Comparabile tra candidati. Scegli quando vuoi il benchmark canonico XIMA.'
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{t('challenge_type.xima_feature_1', 'Domande standard XIMA')}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{t('challenge_type.xima_feature_2', 'Scenario AI su DNA azienda')}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{t('challenge_type.xima_feature_3', 'Profilo 5 pilastri completo')}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{t('challenge_type.xima_feature_4', 'Comparabile tra candidati')}</span>
                </div>
              </div>

              {hasActiveXimaCore && (
                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-600">
                  {t('challenge_type.xima_core_active_note', 'Una XIMA Core è già attiva per questo obiettivo.')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom L1 AI-driven — alternative L1 option */}
          <Card
            className="border border-border/50 hover:border-border hover:shadow-md transition-all cursor-pointer group"
            onClick={handleSelectCustom}
          >
            <CardHeader className="pb-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-muted group-hover:scale-105 transition-transform">
                  <Wrench className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl flex items-center gap-3">
                    {t('challenge_type.custom_title', 'L1 Custom')}
                    <Badge variant="outline" className="text-xs">
                      {t('xima_core.level_1_badge', 'Level 1')}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {t(
                      'challenge_type.custom_desc_v2',
                      'Stessa profondità della Core (motore AI + DNA + contesto), ma orientata dal business: scegli pilastri da enfatizzare, scenario specifico, difficoltà, lingua, durata e numero di domande.'
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-sm text-muted-foreground">
                {t(
                  'challenge_type.custom_use_cases_v2',
                  'Scegli quando hai un focus specifico (es. ruolo molto particolare o una soft-skill prioritaria). Profilo 5 pilastri sempre completo.'
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default ChallengeTypeSelector;
