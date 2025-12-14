import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sparkles, ChevronDown, Loader2, CheckCircle2, AlertCircle, ArrowRight, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HiringGoalDraft {
  id?: string;
  task_description: string;
  role_title: string;
  experience_level: string;
  work_model: string;
  country: string;
  city_region: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_period: string;
  status: string;
}

interface SalaryBenchmark {
  min: number;
  max: number;
  median: number;
  currency: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  country_name: string;
}

const COUNTRIES = [
  { code: 'IT', name: 'Italy', currency: 'EUR' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'ES', name: 'Spain', currency: 'EUR' },
  { code: 'UK', name: 'United Kingdom', currency: 'GBP' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', currency: 'EUR' },
  { code: 'AT', name: 'Austria', currency: 'EUR' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF' },
];

const TASK_SUGGESTION_CHIPS = [
  'own_pipeline',
  'improve_conversion',
  'manage_accounts',
  'lead_team',
  'automate_reporting',
  'build_partnerships'
];

interface HiringGoalCardProps {
  draftId?: string | null;
  onComplete?: () => void;
}

export function HiringGoalCard({ draftId: initialDraftId, onComplete }: HiringGoalCardProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<HiringGoalDraft>({
    task_description: '',
    role_title: '',
    experience_level: '',
    work_model: '',
    country: '',
    city_region: '',
    salary_min: null,
    salary_max: null,
    salary_currency: 'EUR',
    salary_period: 'yearly',
    status: 'draft'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [benchmark, setBenchmark] = useState<SalaryBenchmark | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [roleTitleOpen, setRoleTitleOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  // Load existing draft
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
          .from('hiring_goal_drafts')
          .select('*')
          .eq('business_id', user.id);
        
        if (initialDraftId) {
          query = query.eq('id', initialDraftId);
        } else {
          query = query.neq('status', 'completed').order('updated_at', { ascending: false }).limit(1);
        }
        
        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        
        console.log('[HiringGoalCard] Loaded draft:', { id: data?.id, status: data?.status, task: data?.task_description?.substring(0, 30) });
        
        if (data) {
          setDraft({
            id: data.id,
            task_description: data.task_description || '',
            role_title: data.role_title || '',
            experience_level: data.experience_level || '',
            work_model: data.work_model || '',
            country: data.country || '',
            city_region: data.city_region || '',
            salary_min: data.salary_min,
            salary_max: data.salary_max,
            salary_currency: data.salary_currency || 'EUR',
            salary_period: data.salary_period || 'yearly',
            status: data.status || 'draft'
          });
          // If we loaded an existing draft with content, mark as editing
          if (data.task_description) {
            setIsEditingExisting(true);
          }
          // Open role title section if it has content
          if (data.role_title) {
            setRoleTitleOpen(true);
          }
        }
      } catch (err) {
        console.error('[HiringGoalCard] Error loading draft:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDraft();
  }, [initialDraftId]);

  // Auto-save with debounce
  const saveDraft = useCallback(async (currentDraft: HiringGoalDraft) => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        business_id: user.id,
        task_description: currentDraft.task_description || null,
        role_title: currentDraft.role_title || null,
        experience_level: currentDraft.experience_level || null,
        work_model: currentDraft.work_model || null,
        country: currentDraft.country || null,
        city_region: currentDraft.city_region || null,
        salary_min: currentDraft.salary_min,
        salary_max: currentDraft.salary_max,
        salary_currency: currentDraft.salary_currency,
        salary_period: currentDraft.salary_period,
        status: 'draft'
      };

      if (currentDraft.id) {
        await supabase
          .from('hiring_goal_drafts')
          .update(payload)
          .eq('id', currentDraft.id);
      } else {
        const { data } = await supabase
          .from('hiring_goal_drafts')
          .insert(payload)
          .select('id')
          .single();
        
        if (data) {
          setDraft(prev => ({ ...prev, id: data.id }));
        }
      }
    } catch (err) {
      console.error('Error saving draft:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  // Debounced save
  useEffect(() => {
    if (loading) return;
    
    const timer = setTimeout(() => {
      saveDraft(draft);
    }, 1000);

    return () => clearTimeout(timer);
  }, [draft, loading, saveDraft]);

  // Fetch salary benchmark when country and experience change
  useEffect(() => {
    const fetchBenchmark = async () => {
      if (!draft.country || !draft.experience_level) {
        setBenchmark(null);
        return;
      }

      setBenchmarkLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-salary-benchmark', {
          body: { 
            country: draft.country, 
            experience_level: draft.experience_level 
          }
        });

        if (error) throw error;
        if (data?.success && data?.benchmark) {
          setBenchmark(data.benchmark);
          const country = COUNTRIES.find(c => c.code === draft.country);
          if (country) {
            setDraft(prev => ({ ...prev, salary_currency: country.currency }));
          }
        }
      } catch (err) {
        console.error('Error fetching benchmark:', err);
      } finally {
        setBenchmarkLoading(false);
      }
    };

    fetchBenchmark();
  }, [draft.country, draft.experience_level]);

  const updateField = <K extends keyof HiringGoalDraft>(field: K, value: HiringGoalDraft[K]) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const insertSuggestion = (chipKey: string) => {
    const suggestion = t(`business.hiring_goal.suggestion_${chipKey}`);
    const currentText = draft.task_description;
    const bulletPrefix = currentText && !currentText.endsWith('\n') && currentText.length > 0 ? '\n• ' : '• ';
    const newText = currentText + bulletPrefix + suggestion;
    if (newText.length <= 600) {
      updateField('task_description', newText);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!draft.task_description?.trim()) {
      newErrors.task_description = t('business.hiring_goal.errors.task_required');
    } else if (draft.task_description.length > 600) {
      newErrors.task_description = t('business.hiring_goal.errors.task_too_long');
    }

    if (!draft.experience_level) {
      newErrors.experience_level = t('business.hiring_goal.errors.experience_required');
    }

    if (!draft.work_model) {
      newErrors.work_model = t('business.hiring_goal.errors.work_model_required');
    }

    if (!draft.country) {
      newErrors.country = t('business.hiring_goal.errors.country_required');
    }

    if (!draft.salary_min || !draft.salary_max) {
      newErrors.salary = t('business.hiring_goal.errors.salary_required');
    } else if (draft.salary_min > draft.salary_max) {
      newErrors.salary = t('business.hiring_goal.errors.salary_invalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        business_id: user.id,
        task_description: draft.task_description,
        role_title: draft.role_title || null,
        experience_level: draft.experience_level,
        work_model: draft.work_model,
        country: draft.country,
        city_region: draft.city_region || null,
        salary_min: draft.salary_min,
        salary_max: draft.salary_max,
        salary_currency: draft.salary_currency,
        salary_period: draft.salary_period,
        status: 'completed'
      };

      console.log('[HiringGoalCard] Submitting:', { draftId: draft.id, payload });

      let result;
      if (draft.id) {
        result = await supabase
          .from('hiring_goal_drafts')
          .update(payload)
          .eq('id', draft.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('hiring_goal_drafts')
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) throw result.error;
      
      console.log('[HiringGoalCard] Submit success:', result.data);

      toast.success(t('business.hiring_goal.success'));
      onComplete?.();
    } catch (err) {
      console.error('[HiringGoalCard] Error submitting:', err);
      toast.error(t('business.hiring_goal.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const applyBenchmark = () => {
    if (benchmark) {
      setDraft(prev => ({
        ...prev,
        salary_min: benchmark.min,
        salary_max: benchmark.max
      }));
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'medium': return 'bg-amber-500/20 text-amber-700 dark:text-amber-400';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{t('business.hiring_goal.title')}</CardTitle>
            <CardDescription>{t('business.hiring_goal.description')}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* PRIMARY: Task Description */}
        <div className="space-y-2">
          <Label htmlFor="task_description" className="text-sm font-medium">
            {t('business.hiring_goal.task_label')} <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">{t('business.hiring_goal.task_hint')}</p>
          
          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2 py-2">
            {TASK_SUGGESTION_CHIPS.map((chip) => (
              <Button
                key={chip}
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2.5 hover:bg-primary/10 hover:border-primary/30"
                onClick={() => insertSuggestion(chip)}
              >
                + {t(`business.hiring_goal.chip_${chip}`)}
              </Button>
            ))}
          </div>
          
          <Textarea
            id="task_description"
            value={draft.task_description}
            onChange={(e) => updateField('task_description', e.target.value)}
            placeholder={t('business.hiring_goal.task_placeholder')}
            className={`min-h-[120px] resize-none ${errors.task_description ? 'border-destructive' : ''}`}
            maxLength={600}
          />
          <div className="flex justify-between text-xs">
            {errors.task_description && (
              <span className="text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.task_description}
              </span>
            )}
            <span className={`ml-auto ${draft.task_description.length > 500 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {draft.task_description.length}/600
            </span>
          </div>
        </div>

        {/* OPTIONAL: Role Title (Collapsed by default) */}
        <Collapsible open={roleTitleOpen} onOpenChange={setRoleTitleOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
              <ChevronDown className={`h-4 w-4 transition-transform ${roleTitleOpen ? 'rotate-180' : ''}`} />
              {t('business.hiring_goal.optional_fields')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-2">
            <Label htmlFor="role_title" className="text-sm font-medium">
              {t('business.hiring_goal.role_label')}
            </Label>
            <p className="text-xs text-muted-foreground">{t('business.hiring_goal.role_hint')}</p>
            <Input
              id="role_title"
              value={draft.role_title}
              onChange={(e) => updateField('role_title', e.target.value)}
              placeholder={t('business.hiring_goal.role_placeholder')}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Experience Level */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">
              {t('business.hiring_goal.experience_label')} <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">{t('business.hiring_goal.experience_hint')}</p>
          </div>
          <RadioGroup
            value={draft.experience_level}
            onValueChange={(value) => updateField('experience_level', value)}
            className="grid gap-2"
          >
            {['first_time', 'independent', 'led_others'].map((level) => (
              <div
                key={level}
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  draft.experience_level === level
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => updateField('experience_level', level)}
              >
                <RadioGroupItem value={level} id={level} />
                <Label htmlFor={level} className="cursor-pointer flex-1">
                  {t(`business.hiring_goal.experience_${level}`)}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {errors.experience_level && (
            <span className="text-destructive text-xs flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.experience_level}
            </span>
          )}
        </div>

        {/* Work Model + Location - Compact Layout */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">
            {t('business.hiring_goal.where_how_label')} <span className="text-destructive">*</span>
          </Label>
          
          {/* Work Model Pills */}
          <div className="flex flex-wrap gap-2">
            {['remote', 'hybrid', 'onsite'].map((model) => (
              <Button
                key={model}
                type="button"
                variant={draft.work_model === model ? 'default' : 'outline'}
                size="sm"
                className={`h-8 ${draft.work_model === model ? '' : 'hover:bg-muted/50'}`}
                onClick={() => updateField('work_model', model)}
              >
                {t(`business.hiring_goal.work_${model}`)}
              </Button>
            ))}
          </div>
          {errors.work_model && (
            <span className="text-destructive text-xs flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.work_model}
            </span>
          )}
          
          {/* Country + City in row */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Select value={draft.country} onValueChange={(v) => updateField('country', v)}>
                <SelectTrigger className={errors.country ? 'border-destructive' : ''}>
                  <SelectValue placeholder={t('business.hiring_goal.country_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && (
                <span className="text-destructive text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.country}
                </span>
              )}
            </div>
            
            <Input
              value={draft.city_region}
              onChange={(e) => updateField('city_region', e.target.value)}
              placeholder={t('business.hiring_goal.city_placeholder')}
            />
          </div>
        </div>

        {/* Compensation Range */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Label className="text-sm font-medium">
              {t('business.hiring_goal.salary_label')} <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={draft.salary_period === 'yearly' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => updateField('salary_period', 'yearly')}
              >
                {t('business.hiring_goal.yearly')}
              </Button>
              <Button
                type="button"
                variant={draft.salary_period === 'monthly' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => updateField('salary_period', 'monthly')}
              >
                {t('business.hiring_goal.monthly')}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                type="number"
                value={draft.salary_min ?? ''}
                onChange={(e) => updateField('salary_min', e.target.value ? parseInt(e.target.value) : null)}
                placeholder={t('business.hiring_goal.salary_min')}
                className={errors.salary ? 'border-destructive' : ''}
              />
            </div>
            <span className="text-muted-foreground">—</span>
            <div className="flex-1">
              <Input
                type="number"
                value={draft.salary_max ?? ''}
                onChange={(e) => updateField('salary_max', e.target.value ? parseInt(e.target.value) : null)}
                placeholder={t('business.hiring_goal.salary_max')}
                className={errors.salary ? 'border-destructive' : ''}
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground w-12">
              {draft.salary_currency}
            </span>
          </div>

          {errors.salary && (
            <span className="text-destructive text-xs flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.salary}
            </span>
          )}

          {/* AI Benchmark Hint - Subtle, non-blocking */}
          {(benchmark || benchmarkLoading) && (
            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/30">
              {benchmarkLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('business.hiring_goal.loading_benchmark')}
                </div>
              ) : benchmark && (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary/70" />
                    <span>
                      {benchmark.currency} {benchmark.min.toLocaleString()}–{benchmark.max.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground/70">
                      {t('business.hiring_goal.market_hint')}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={applyBenchmark}
                    className="text-xs h-6 px-2 text-primary hover:text-primary"
                  >
                    {t('business.hiring_goal.apply_benchmark')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with status + CTA */}
        <div className="flex items-center justify-between pt-4 border-t gap-3 flex-wrap">
          {/* Draft saved indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('business.hiring_goal.saving')}
              </>
            ) : (
              <>
                <Save className="h-3 w-3" />
                {isEditingExisting 
                  ? t('business.hiring_goal.editing_saved') 
                  : t('business.hiring_goal.draft_saved')
                }
              </>
            )}
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {t('business.hiring_goal.continue_cta')}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
