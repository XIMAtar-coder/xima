import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { validateChallengeDates, getChallengeTimeInfo } from '@/utils/challengeTimeUtils';
import { 
  ArrowLeft, Sparkles, Loader2, Rocket, Save, Eye, Clock, 
  Target, CheckCircle2, Wand2, AlertCircle, Archive, CalendarClock
} from 'lucide-react';
interface HiringGoal {
  id: string;
  role_title: string | null;
  task_description: string | null;
  experience_level: string | null;
  work_model: string | null;
  country: string | null;
}

interface ExistingChallenge {
  id: string;
  title: string;
  description: string | null;
  success_criteria: string[] | null;
  time_estimate_minutes: number | null;
  rubric: any;
  status: string;
  hiring_goal_id: string | null;
  start_at: string | null;
  end_at: string | null;
}

const CreateChallenge = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: challengeId } = useParams();
  const goalId = searchParams.get('goal');
  const challengeType = searchParams.get('type'); // 'custom' means they explicitly chose custom
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: businessLoading } = useBusinessRole();

  const isEditMode = !!challengeId;

  const [hiringGoal, setHiringGoal] = useState<HiringGoal | null>(null);
  const [existingChallenge, setExistingChallenge] = useState<ExistingChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [successCriteria, setSuccessCriteria] = useState<string[]>(['', '', '']);
  const [timeEstimate, setTimeEstimate] = useState(45);
  const [currentStatus, setCurrentStatus] = useState('draft');
  const [startAt, setStartAt] = useState<string>('');
  const [endAt, setEndAt] = useState<string>('');

  // Set default dates (start now, end in 7 days)
  useEffect(() => {
    if (!startAt && !isEditMode) {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setStartAt(now.toISOString().slice(0, 16));
      setEndAt(weekFromNow.toISOString().slice(0, 16));
    }
  }, [isEditMode, startAt]);

  // Redirect to selector if not editing and not explicitly choosing custom
  useEffect(() => {
    if (!isEditMode && goalId && challengeType !== 'custom') {
      // User navigated directly to /challenges/new?goal=X without going through selector
      // Redirect them to the challenge type selector
      navigate(`/business/challenges/select?goal=${goalId}`, { replace: true });
      return;
    }
  }, [isEditMode, goalId, challengeType, navigate]);

  // Load hiring goal or existing challenge
  useEffect(() => {
    if (!isAuthenticated || (businessLoading === false && !isBusiness)) {
      navigate('/business/login');
      return;
    }

    if (!businessLoading && user?.id) {
      if (isEditMode) {
        loadExistingChallenge();
      } else if (goalId && challengeType === 'custom') {
        loadHiringGoal();
      } else if (!goalId) {
        // Create without goal - just allow it
        setLoading(false);
      }
    }
  }, [challengeId, goalId, challengeType, user?.id, isAuthenticated, isBusiness, businessLoading, navigate]);

  const loadHiringGoal = async () => {
    const { data, error } = await supabase
      .from('hiring_goal_drafts')
      .select('id, role_title, task_description, experience_level, work_model, country')
      .eq('id', goalId)
      .eq('business_id', user?.id)
      .single();

    if (error || !data) {
      toast({
        title: t('common.error'),
        description: 'Hiring goal not found',
        variant: 'destructive'
      });
      navigate('/business/dashboard');
      return;
    }

    setHiringGoal(data);
    if (data.role_title) {
      setTitle(`${data.role_title} Challenge`);
    }
    setLoading(false);
  };

  const loadExistingChallenge = async () => {
    const { data, error } = await supabase
      .from('business_challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('business_id', user?.id)
      .single();

    if (error || !data) {
      toast({
        title: t('common.error'),
        description: 'Challenge not found',
        variant: 'destructive'
      });
      navigate('/business/challenges');
      return;
    }

    setExistingChallenge(data);
    setTitle(data.title);
    setDescription(data.description || '');
    setSuccessCriteria(data.success_criteria?.length ? data.success_criteria : ['', '', '']);
    setTimeEstimate(data.time_estimate_minutes || 45);
    setCurrentStatus(data.status);
    if (data.start_at) setStartAt(new Date(data.start_at).toISOString().slice(0, 16));
    if (data.end_at) setEndAt(new Date(data.end_at).toISOString().slice(0, 16));

    // Load hiring goal if exists
    if (data.hiring_goal_id) {
      const { data: goalData } = await supabase
        .from('hiring_goal_drafts')
        .select('id, role_title, task_description, experience_level, work_model, country')
        .eq('id', data.hiring_goal_id)
        .single();
      
      if (goalData) {
        setHiringGoal(goalData);
      }
    }

    setLoading(false);
  };

  // Generate with AI
  const handleGenerate = async () => {
    console.log('[CreateChallenge] handleGenerate called');
    console.log('[CreateChallenge] hiringGoal:', hiringGoal);
    
    if (!hiringGoal?.task_description) {
      console.warn('[CreateChallenge] No task description available');
      toast({
        title: t('common.error'),
        description: t('challenge_builder.no_task_description'),
        variant: 'destructive'
      });
      return;
    }

    setGenerating(true);
    try {
      console.log('[CreateChallenge] Invoking generate-challenge function with:', {
        task_description: hiringGoal.task_description?.substring(0, 50),
        role_title: hiringGoal.role_title
      });

      const { data, error } = await supabase.functions.invoke('generate-challenge', {
        body: {
          task_description: hiringGoal.task_description,
          role_title: hiringGoal.role_title,
          experience_level: hiringGoal.experience_level,
          work_model: hiringGoal.work_model,
          country: hiringGoal.country,
          locale: i18n.language?.split('-')[0] || 'en'
        }
      });

      console.log('[CreateChallenge] Response:', { data, error });

      if (error) {
        console.error('[CreateChallenge] Supabase function error:', error);
        throw error;
      }
      
      if (data?.error) {
        console.error('[CreateChallenge] API returned error:', data.error);
        throw new Error(data.error);
      }

      // Map response fields to form state
      setTitle(data.title_suggestion || title);
      setDescription(data.candidate_facing_description || '');
      setSuccessCriteria(data.success_criteria?.length ? data.success_criteria : ['', '', '']);
      setTimeEstimate(data.time_estimate_minutes || 45);

      console.log('[CreateChallenge] Form updated with:', {
        title: data.title_suggestion,
        descriptionLength: data.candidate_facing_description?.length,
        criteriaCount: data.success_criteria?.length,
        timeEstimate: data.time_estimate_minutes
      });

      toast({
        title: t('challenge_builder.generated'),
        description: t('challenge_builder.generated_desc'),
      });
    } catch (err: any) {
      console.error('[CreateChallenge] Generate challenge error:', err);
      toast({
        title: t('common.error'),
        description: err.message || t('challenge_builder.generation_failed') || 'AI generation failed. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  // Save (create or update)
  const handleSave = async (newStatus: 'draft' | 'active' | 'archived') => {
    if (!title.trim()) {
      toast({
        title: t('common.error'),
        description: t('challenge_builder.title_required'),
        variant: 'destructive'
      });
      return;
    }

    if (newStatus === 'active' && !description.trim()) {
      toast({
        title: t('common.error'),
        description: t('challenge_builder.fill_required'),
        variant: 'destructive'
      });
      return;
    }

    // Validate dates for activation
    if (newStatus === 'active') {
      const dateValidation = validateChallengeDates(startAt || null, endAt || null);
      if (!dateValidation.valid) {
        toast({
          title: t('common.error'),
          description: dateValidation.error || t('challenge_builder.dates_required'),
          variant: 'destructive'
        });
        return;
      }
    }

    setSaving(true);
    try {
      const challengeData = {
        title: title.trim(),
        description: description.trim(),
        success_criteria: successCriteria.filter(c => c.trim()),
        time_estimate_minutes: timeEstimate,
        rubric: { criteria: { outcome: 3, clarity: 3, reasoning: 3 } },
        status: newStatus,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
        updated_at: new Date().toISOString()
      };

      const effectiveGoalId = isEditMode ? existingChallenge?.hiring_goal_id : goalId;

      // If activating, archive other active challenges for the same goal
      if (newStatus === 'active' && effectiveGoalId) {
        await supabase
          .from('business_challenges')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('business_id', user?.id)
          .eq('hiring_goal_id', effectiveGoalId)
          .eq('status', 'active')
          .neq('id', challengeId || '');
      }

      if (isEditMode) {
        // Update existing
        const { error } = await supabase
          .from('business_challenges')
          .update(challengeData)
          .eq('id', challengeId);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('business_challenges')
          .insert({
            ...challengeData,
            business_id: user?.id,
            hiring_goal_id: goalId || null
          });

        if (error) throw error;
      }

      const toastMessages = {
        draft: { title: t('challenge_builder.draft_saved'), desc: t('challenge_builder.draft_saved_desc') },
        active: { title: t('challenge_builder.activated'), desc: t('challenge_builder.activated_desc') },
        archived: { title: t('challenges.archived'), desc: t('challenges.archived_desc') }
      };

      toast({
        title: toastMessages[newStatus].title,
        description: toastMessages[newStatus].desc,
      });

      // Navigate back
      if (effectiveGoalId) {
        navigate(`/business/candidates?fromGoal=${effectiveGoalId}`);
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

  const updateCriterion = (index: number, value: string) => {
    const updated = [...successCriteria];
    updated[index] = value;
    setSuccessCriteria(updated);
  };

  const getBackUrl = () => {
    const effectiveGoalId = isEditMode ? existingChallenge?.hiring_goal_id : goalId;
    if (effectiveGoalId) {
      return `/business/candidates?fromGoal=${effectiveGoalId}`;
    }
    return '/business/challenges';
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
            onClick={() => navigate(getBackUrl())}
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
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {isEditMode ? t('challenge_builder.edit_title') : t('challenge_builder.page_title')}
              </h1>
              <p className="text-muted-foreground">
                {t('challenge_builder.page_subtitle')}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {hiringGoal?.role_title && (
                  <Badge variant="outline">
                    {hiringGoal.role_title}
                  </Badge>
                )}
                {isEditMode && (
                  <Badge 
                    className={
                      currentStatus === 'active' 
                        ? 'bg-green-500/20 text-green-600 border-green-500/30' 
                        : currentStatus === 'archived'
                        ? 'bg-muted text-muted-foreground'
                        : ''
                    }
                    variant={currentStatus === 'draft' ? 'outline' : 'default'}
                  >
                    {t(`challenges.status_${currentStatus}`)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-6">
            {/* AI Generation */}
            {hiringGoal?.task_description && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Wand2 className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{t('challenge_builder.ai_generate_title')}</p>
                        <p className="text-sm text-muted-foreground">{t('challenge_builder.ai_generate_desc')}</p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleGenerate} 
                      disabled={generating}
                      className="gap-2 shrink-0"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('common.loading')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          {title ? t('challenge_builder.regenerate') : t('challenge_builder.generate')}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Title */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t('challenge_builder.title_label')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('challenge_builder.title_placeholder')}
                  maxLength={100}
                />
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t('challenge_builder.description_label')}</CardTitle>
                <CardDescription>{t('challenge_builder.description_hint')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('challenge_builder.description_placeholder')}
                  rows={6}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground mt-2">{description.length}/2000</p>
              </CardContent>
            </Card>

            {/* Success Criteria */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  {t('challenge_builder.criteria_label')}
                </CardTitle>
                <CardDescription>{t('challenge_builder.criteria_hint')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {successCriteria.map((criterion, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                    <Input
                      value={criterion}
                      onChange={(e) => updateCriterion(idx, e.target.value)}
                      placeholder={t('challenge_builder.criterion_placeholder')}
                      maxLength={200}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Time Estimate */}
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
                {startAt && endAt && (
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const info = getChallengeTimeInfo(startAt, endAt, currentStatus);
                      if (info.remainingText) {
                        return `⏱ ${info.remainingText}`;
                      }
                      return null;
                    })()}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Time Estimate */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  {t('challenge_builder.time_label')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={timeEstimate}
                    onChange={(e) => setTimeEstimate(parseInt(e.target.value) || 30)}
                    min={10}
                    max={480}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">{t('challenge_builder.minutes')}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <Card className="lg:sticky lg:top-6">
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{t('challenge_builder.preview_title')}</CardTitle>
                </div>
                <CardDescription>{t('challenge_builder.preview_desc')}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {title || t('challenge_builder.preview_no_title')}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {hiringGoal?.role_title || 'Role'}
                  </p>
                </div>

                <Separator />

                <div>
                  <p className="text-foreground whitespace-pre-wrap">
                    {description || <span className="text-muted-foreground italic">{t('challenge_builder.preview_no_description')}</span>}
                  </p>
                </div>

                {successCriteria.some(c => c.trim()) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">{t('challenge_builder.preview_criteria')}</h3>
                      <ul className="space-y-1">
                        {successCriteria.filter(c => c.trim()).map((c, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {t('challenge_builder.estimated_time', { minutes: timeEstimate })}
                </div>
              </CardContent>
            </Card>


            {!hiringGoal?.task_description && !isEditMode && (
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{t('challenge_builder.no_task_title')}</p>
                    <p className="text-sm text-muted-foreground">{t('challenge_builder.no_task_desc')}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Bottom spacer to prevent content from being hidden behind fixed CTA */}
      <div className="h-24" />

      {/* Fixed CTA bar - always visible at viewport bottom */}
      <div 
        className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-white/10 p-4"
        style={{ zIndex: 9999 }}
      >
        <div className="max-w-5xl mx-auto flex flex-wrap gap-3 justify-center sm:justify-end">
          {isEditMode && currentStatus !== 'archived' && (
            <Button 
              variant="ghost"
              onClick={() => handleSave('archived')} 
              disabled={saving}
              className="gap-2 text-muted-foreground"
            >
              <Archive className="h-4 w-4" />
              {t('challenges.archive')}
            </Button>
          )}
          
          <Button 
            variant="outline"
            onClick={() => handleSave('draft')} 
            disabled={saving || !title.trim()}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {t('challenge_builder.save_draft')}
          </Button>
          
          {currentStatus !== 'active' && (
            <Button 
              onClick={() => handleSave('active')} 
              disabled={saving || !title.trim() || !description.trim()}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {t('challenge_builder.activate_button')}
            </Button>
          )}
          
          {currentStatus === 'active' && isEditMode && (
            <Button 
              onClick={() => handleSave('active')} 
              disabled={saving || !title.trim() || !description.trim()}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t('challenges.save_changes')}
            </Button>
          )}
        </div>
      </div>
    </BusinessLayout>
  );
};

export default CreateChallenge;
