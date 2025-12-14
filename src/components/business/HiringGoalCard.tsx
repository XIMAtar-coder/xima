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
import { Target, ChevronDown, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
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

interface HiringGoalCardProps {
  onComplete?: () => void;
}

export function HiringGoalCard({ onComplete }: HiringGoalCardProps) {
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
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing draft
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('hiring_goal_drafts')
          .select('*')
          .eq('business_id', user.id)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        
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
        }
      } catch (err) {
        console.error('Error loading hiring goal draft:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDraft();
  }, []);

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
          // Update currency based on country
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
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
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

      if (draft.id) {
        await supabase
          .from('hiring_goal_drafts')
          .update(payload)
          .eq('id', draft.id);
      } else {
        await supabase
          .from('hiring_goal_drafts')
          .insert(payload);
      }

      toast.success(t('business.hiring_goal.success'));
      onComplete?.();
    } catch (err) {
      console.error('Error submitting hiring goal:', err);
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
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{t('business.hiring_goal.title')}</CardTitle>
            <CardDescription>{t('business.hiring_goal.description')}</CardDescription>
          </div>
          {saving && (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('business.hiring_goal.saving')}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* PRIMARY: Task Description */}
        <div className="space-y-2">
          <Label htmlFor="task_description" className="text-sm font-medium">
            {t('business.hiring_goal.task_label')} <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">{t('business.hiring_goal.task_hint')}</p>
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

        {/* OPTIONAL: Role Title (Progressive Disclosure) */}
        <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ChevronDown className={`h-4 w-4 transition-transform ${optionalOpen ? 'rotate-180' : ''}`} />
              {t('business.hiring_goal.optional_fields')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="space-y-2">
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
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Experience Level */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            {t('business.hiring_goal.experience_label')} <span className="text-destructive">*</span>
          </Label>
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

        {/* Work Model + Location */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('business.hiring_goal.work_model_label')} <span className="text-destructive">*</span>
            </Label>
            <Select value={draft.work_model} onValueChange={(v) => updateField('work_model', v)}>
              <SelectTrigger className={errors.work_model ? 'border-destructive' : ''}>
                <SelectValue placeholder={t('business.hiring_goal.work_model_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">{t('business.hiring_goal.work_remote')}</SelectItem>
                <SelectItem value="hybrid">{t('business.hiring_goal.work_hybrid')}</SelectItem>
                <SelectItem value="onsite">{t('business.hiring_goal.work_onsite')}</SelectItem>
              </SelectContent>
            </Select>
            {errors.work_model && (
              <span className="text-destructive text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.work_model}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('business.hiring_goal.country_label')} <span className="text-destructive">*</span>
            </Label>
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
        </div>

        {/* City/Region (optional) */}
        <div className="space-y-2">
          <Label htmlFor="city_region" className="text-sm font-medium">
            {t('business.hiring_goal.city_label')}
          </Label>
          <Input
            id="city_region"
            value={draft.city_region}
            onChange={(e) => updateField('city_region', e.target.value)}
            placeholder={t('business.hiring_goal.city_placeholder')}
          />
        </div>

        {/* Compensation Range */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              {t('business.hiring_goal.salary_label')} <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={draft.salary_period === 'yearly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateField('salary_period', 'yearly')}
              >
                {t('business.hiring_goal.yearly')}
              </Button>
              <Button
                type="button"
                variant={draft.salary_period === 'monthly' ? 'default' : 'outline'}
                size="sm"
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

          {/* AI Benchmark Hint */}
          {(benchmark || benchmarkLoading) && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              {benchmarkLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('business.hiring_goal.loading_benchmark')}
                </div>
              ) : benchmark && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {benchmark.source === 'country' 
                        ? t('business.hiring_goal.benchmark_country', { country: benchmark.country_name })
                        : t('business.hiring_goal.benchmark_eu')
                      }
                    </span>
                    <Badge className={getConfidenceColor(benchmark.confidence)}>
                      {t(`business.hiring_goal.confidence_${benchmark.confidence}`)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {benchmark.currency} {benchmark.min.toLocaleString()} — {benchmark.max.toLocaleString()}
                      <span className="ml-2 text-xs">
                        ({t('business.hiring_goal.median')}: {benchmark.median.toLocaleString()})
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={applyBenchmark}
                      className="text-primary hover:text-primary"
                    >
                      {t('business.hiring_goal.apply_benchmark')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {t('business.hiring_goal.continue')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
