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
import { ArrowLeft, Loader2, Brain, Wrench, Sparkles, CheckCircle2, Star } from 'lucide-react';

const ChallengeTypeSelector = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const goalId = searchParams.get('goal');
  const { t } = useTranslation();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: businessLoading } = useBusinessRole();

  const [loading, setLoading] = useState(true);
  const [hasActiveXimaCore, setHasActiveXimaCore] = useState(false);
  const [hiringGoalTitle, setHiringGoalTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || (businessLoading === false && !isBusiness)) {
      navigate('/business/login');
      return;
    }

    if (!businessLoading && user?.id) {
      checkExistingChallenges();
    }
  }, [goalId, user?.id, isAuthenticated, isBusiness, businessLoading, navigate]);

  const checkExistingChallenges = async () => {
    if (!goalId) {
      // No goal specified - redirect to XIMA Core by default
      navigate('/business/challenges/xima-core');
      return;
    }

    // Get hiring goal title
    const { data: goalData } = await supabase
      .from('hiring_goal_drafts')
      .select('role_title')
      .eq('id', goalId)
      .eq('business_id', user?.id)
      .single();

    if (goalData?.role_title) {
      setHiringGoalTitle(goalData.role_title);
    }

    // Check if XIMA Core already exists for this goal
    const { data: existingCore } = await supabase
      .from('business_challenges')
      .select('id')
      .eq('business_id', user?.id)
      .eq('hiring_goal_id', goalId)
      .eq('status', 'active')
      .contains('rubric', { isXimaCore: true })
      .single();

    if (existingCore) {
      setHasActiveXimaCore(true);
      setLoading(false);
    } else {
      // No XIMA Core exists - redirect directly to XIMA Core page
      navigate(`/business/challenges/xima-core?goal=${goalId}`);
    }
  };

  const handleSelectXimaCore = () => {
    navigate(`/business/challenges/xima-core?goal=${goalId}`);
  };

  const handleSelectCustom = () => {
    navigate(`/business/challenges/new?goal=${goalId}&type=custom`);
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
      <div className="max-w-3xl mx-auto space-y-8 py-8">
        {/* Header */}
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(goalId ? `/business/candidates?fromGoal=${goalId}` : '/business/dashboard')}
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
            {hiringGoalTitle && (
              <Badge variant="secondary" className="mt-3">
                {hiringGoalTitle}
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
                    {t('challenge_type.xima_core_title')}
                    <Badge variant="outline" className="text-xs">
                      {t('xima_core.level_1_badge')}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {t('challenge_type.xima_core_desc')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{t('challenge_type.xima_feature_1')}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>{t('challenge_type.xima_feature_2')}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{t('challenge_type.xima_feature_3')}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{t('challenge_type.xima_feature_4')}</span>
                </div>
              </div>

              {hasActiveXimaCore && (
                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-600">
                  {t('challenge_type.xima_core_active_note')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Challenge - Secondary Option */}
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
                  <CardTitle className="text-xl">
                    {t('challenge_type.custom_title')}
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {t('challenge_type.custom_desc')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-sm text-muted-foreground">
                {t('challenge_type.custom_use_cases')}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default ChallengeTypeSelector;
