import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ALL_PILLARS,
  PillarKey,
  buildChallengePayload,
  archiveSiblingsContainsFilter,
} from '@/features/challenge-builder/saveChallenge';
import type { Json } from '@/integrations/supabase/types';
import {
  Brain,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Rocket,
  Save,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react';

interface HiringGoal {
  id: string;
  role_title: string | null;
  task_description: string | null;
  experience_level: string | null;
  function_area?: string | null;
  work_model: string | null;
  country: string | null;
}

interface BusinessProfile {
  company_name: string | null;
  manual_industry: string | null;
  snapshot_industry: string | null;
}

interface GeneratedCustomL1 {
  scenario: string;
  business_type?: string;
  context_tag?: string;
  context_snapshot?: Json;
  evaluation_lens?: Json;
  expected_tensions?: Json;
  estimated_time_minutes?: number;
  questions: Array<{ id: string; title: string; text: string }>;
}

const PILLAR_LABEL_KEYS: Record<PillarKey, string> = {
  drive: 'pillar.drive',
  computational_power: 'pillar.computational_power',
  communication: 'pillar.communication',
  creativity: 'pillar.creativity',
  knowledge: 'pillar.knowledge',
};

const PILLAR_DEFAULT_LABELS: Record<PillarKey, string> = {
  drive: 'Drive',
  computational_power: 'Computational Power',
  communication: 'Communication',
  creativity: 'Creativity',
  knowledge: 'Knowledge',
};

interface Props {
  businessId: string;
  goalId: string | null;
  hiringGoal: HiringGoal | null;
  businessProfile: BusinessProfile | null;
  returnTo: string | null;
}

const normalizeLocale = (lang?: string) => {
  const l = lang?.split('-')[0];
  return l && ['en', 'it', 'es'].includes(l) ? l : 'it';
};

export default function CustomL1Builder({
  businessId,
  goalId,
  hiringGoal,
  businessProfile,
  returnTo,
}: Props) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  // Form state — business orientation
  const [focusPillars, setFocusPillars] = useState<PillarKey[]>([]);
  const [scenarioHint, setScenarioHint] = useState('');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [locale, setLocale] = useState<string>(normalizeLocale(i18n.language));
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [numQuestions, setNumQuestions] = useState(4);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedCustomL1 | null>(null);

  // Save state
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!startAt) {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setStartAt(now.toISOString().slice(0, 16));
      setEndAt(weekFromNow.toISOString().slice(0, 16));
    }
  }, [startAt]);

  const roleTitle = hiringGoal?.role_title || t('challenge.xima_core.context_fallback_role', 'Role');
  const industry =
    businessProfile?.manual_industry ||
    businessProfile?.snapshot_industry ||
    t('challenge.xima_core.context_fallback_industry', 'Business context');
  const contextTag = `${roleTitle} · ${industry}`;

  const togglePillar = (p: PillarKey) => {
    setFocusPillars((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  };

  const handleGenerate = async () => {
    if (!hiringGoal?.task_description && !goalId) {
      // Allow generation without a goal (uses synthetic context).
    }
    setGenerating(true);
    setGenerated(null);
    try {
      const { data, error } = await supabase.functions.invoke<GeneratedCustomL1>('generate-challenge', {
        body: {
          mode: 'l1_custom',
          locale,
          business_id: businessId,
          hiring_goal_id: goalId || undefined,
          context: {
            roleTitle: hiringGoal?.role_title || undefined,
            experienceLevel: hiringGoal?.experience_level || undefined,
            taskDescription: hiringGoal?.task_description || undefined,
            functionArea: hiringGoal?.function_area || undefined,
          },
          params: {
            focus_pillars: focusPillars,
            custom_scenario_hint: scenarioHint.trim() || undefined,
            difficulty,
            duration_minutes: durationMinutes,
            num_questions: numQuestions,
          },
        },
      });

      if (error) throw error;
      if (!data?.scenario || !Array.isArray(data?.questions) || data.questions.length === 0) {
        throw new Error('Invalid AI response');
      }

      setGenerated(data);
      toast({
        title: t('challenge_builder.generated', 'Sfida generata'),
        description: t('challenge_builder.generated_desc_l1custom', 'Rivedi scenario e domande, poi attiva.'),
      });
    } catch (err: any) {
      console.error('[CustomL1Builder] generate failed:', err);
      toast({
        title: t('common.error', 'Errore'),
        description: err?.message || t('challenge_builder.generation_failed', 'Generazione fallita'),
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const buildDescription = (g: GeneratedCustomL1, candidateIntro: string): string => {
    return [
      candidateIntro,
      '',
      '---',
      '',
      `**${t('challenge.xima_core.scenario_label', 'Scenario')}:**`,
      g.scenario,
      '',
      '---',
      '',
      `**${t('challenge.xima_core.questions_title', 'Domande')}:**`,
      '',
      ...g.questions.map((q, i) => `${i + 1}. **${q.title}**\n${q.text}`),
    ].join('\n');
  };

  const handleSave = async (status: 'draft' | 'active') => {
    if (!generated) {
      toast({ title: t('common.error', 'Errore'), description: t('challenge_builder.generate_first', 'Genera prima la sfida'), variant: 'destructive' });
      return;
    }
    if (status === 'active' && (!startAt || !endAt)) {
      toast({ title: t('common.error', 'Errore'), description: t('challenge_builder.dates_required', 'Date richieste'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Type-scoped archive: only archive OTHER active Custom-AI L1 on same goal.
      // XIMA Core rows are NOT touched.
      if (status === 'active' && goalId) {
        await supabase
          .from('business_challenges')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('business_id', businessId)
          .eq('hiring_goal_id', goalId)
          .eq('status', 'active')
          .contains('config_json', archiveSiblingsContainsFilter('custom-ai'));
      }

      const candidateIntro = t(
        'challenge.custom_l1.candidate_intro',
        "Leggi lo scenario e rispondi alle domande con esempi concreti. Non c'è una risposta giusta: vogliamo capire come ragioni."
      );

      const payload = buildChallengePayload({
        type: 'custom-ai',
        businessId,
        goalId: goalId || null,
        title: `${t('challenge_type.custom_title', 'L1 Custom')} · ${roleTitle}`,
        description: buildDescription(generated, candidateIntro),
        successCriteria: generated.questions.map((q) => q.title),
        timeEstimateMinutes: generated.estimated_time_minutes || durationMinutes,
        status,
        startAt: startAt || null,
        endAt: endAt || null,
        scenario: generated.scenario,
        contextTag: generated.context_tag || contextTag,
        candidateIntro,
        questions: generated.questions,
        contextSnapshot: generated.context_snapshot || null,
        evaluationLens: generated.evaluation_lens || null,
        expectedTensions: generated.expected_tensions || null,
        focusPillars,
        customScenarioHint: scenarioHint.trim() || null,
        difficulty,
        locale,
        durationMinutes,
        numQuestions: generated.questions.length,
      });

      const { error } = await supabase.from('business_challenges').insert([payload as any]);
      if (error) throw error;

      toast({
        title: status === 'active'
          ? t('challenge_builder.activated', 'Sfida attivata')
          : t('challenge_builder.draft_saved', 'Bozza salvata'),
      });

      if (goalId && returnTo === 'shortlist' && status === 'active') {
        navigate(`/business/hiring-goals/${goalId}/shortlist?challengeCreated=1`);
      } else if (goalId) {
        navigate(`/business/candidates?fromGoal=${goalId}`);
      } else {
        navigate('/business/challenges');
      }
    } catch (err: any) {
      console.error('[CustomL1Builder] save failed:', err);
      toast({
        title: t('common.error', 'Errore'),
        description: err?.message || 'Save failed',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const evalLensSignals = useMemo(() => {
    const lens = (generated?.evaluation_lens as Record<string, string[]> | null) || null;
    if (!lens) return [];
    return ALL_PILLARS.map((p) => ({
      pillar: p,
      label: t(PILLAR_LABEL_KEYS[p], PILLAR_DEFAULT_LABELS[p]),
      signals: Array.isArray(lens[`${p}_signals`]) ? (lens[`${p}_signals`] as string[]) : [],
    }));
  }, [generated, t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
          <Wand2 className="h-7 w-7 text-primary" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold text-foreground">
              {t('challenge.custom_l1.title', 'L1 Custom — Sfida soft-skills orientata')}
            </h1>
            <Badge variant="secondary">{t('xima_core.level_1_badge', 'Level 1')}</Badge>
            <Badge variant="outline">{contextTag}</Badge>
          </div>
          <p className="max-w-2xl text-base text-muted-foreground">
            {t(
              'challenge.custom_l1.subtitle',
              'Stessa profondità della XIMA Core, orientata dalle tue scelte: focus pilastri, scenario specifico, difficoltà, lingua, durata e numero di domande.'
            )}
          </p>
        </div>
      </div>

      {/* Step 1: Business orientation params */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t('challenge.custom_l1.params_title', 'Orientamento sfida')}
          </CardTitle>
          <CardDescription>
            {t('challenge.custom_l1.params_desc', 'Definisci come orientare la sfida. XIMA genererà scenario e domande coerenti con DNA azienda + obiettivo + queste preferenze.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Focus pillars */}
          <div className="space-y-2">
            <Label>{t('challenge.custom_l1.focus_label', 'Pilastri da enfatizzare')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('challenge.custom_l1.focus_hint', 'Opzionale. Tutti i 5 pilastri restano valutati; quelli scelti ricevono segnali più ricchi.')}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {ALL_PILLARS.map((p) => {
                const active = focusPillars.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePillar(p)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                      active
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border/60 bg-muted/30 text-muted-foreground hover:border-border'
                    }`}
                  >
                    {active && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
                    {t(PILLAR_LABEL_KEYS[p], PILLAR_DEFAULT_LABELS[p])}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scenario hint */}
          <div className="space-y-2">
            <Label htmlFor="scenario-hint">{t('challenge.custom_l1.hint_label', 'Spunto / contesto specifico (opzionale)')}</Label>
            <Textarea
              id="scenario-hint"
              value={scenarioHint}
              onChange={(e) => setScenarioHint(e.target.value.slice(0, 500))}
              placeholder={t('challenge.custom_l1.hint_placeholder', 'Es. "Il candidato deve affrontare una negoziazione difficile con un fornitore strategico durante una scadenza ravvicinata"…')}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{scenarioHint.length} / 500</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Difficulty */}
            <div className="space-y-2">
              <Label>{t('challenge.custom_l1.difficulty_label', 'Difficoltà')}</Label>
              <div className="flex gap-2">
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d as 1 | 2 | 3)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm transition-all ${
                      difficulty === d
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border/60 bg-muted/30 text-muted-foreground hover:border-border'
                    }`}
                  >
                    {d === 1 ? t('challenge.custom_l1.diff_low', 'Base') : d === 2 ? t('challenge.custom_l1.diff_mid', 'Media') : t('challenge.custom_l1.diff_high', 'Alta')}
                  </button>
                ))}
              </div>
            </div>

            {/* Locale */}
            <div className="space-y-2">
              <Label>{t('challenge.custom_l1.locale_label', 'Lingua')}</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="it">Italiano</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>
                {t('challenge.custom_l1.duration_label', 'Durata stimata')} · {durationMinutes} min
              </Label>
              <Slider
                min={10}
                max={60}
                step={5}
                value={[durationMinutes]}
                onValueChange={(v) => setDurationMinutes(v[0])}
              />
            </div>

            {/* Num questions */}
            <div className="space-y-2">
              <Label>{t('challenge.custom_l1.num_questions_label', 'Numero domande')}</Label>
              <Select value={String(numQuestions)} onValueChange={(v) => setNumQuestions(parseInt(v, 10))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full sm:w-auto">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {generated
              ? t('challenge.custom_l1.regenerate_btn', 'Rigenera sfida')
              : t('challenge.custom_l1.generate_btn', 'Genera sfida')}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Generated preview */}
      {generated && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {t('challenge.custom_l1.preview_title', 'Anteprima sfida')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-medium">{t('challenge.xima_core.scenario_label', 'Scenario')}</h3>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm leading-6 text-foreground whitespace-pre-wrap">
                {generated.scenario}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium">{t('challenge.xima_core.questions_title', 'Domande')} ({generated.questions.length})</h3>
              <ol className="space-y-3 list-decimal list-inside">
                {generated.questions.map((q) => (
                  <li key={q.id}>
                    <span className="font-medium text-foreground">{q.title}</span>
                    <p className="ml-6 mt-1 text-sm text-muted-foreground">{q.text}</p>
                  </li>
                ))}
              </ol>
            </div>

            {Array.isArray(generated.expected_tensions) && (generated.expected_tensions as any[]).length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">{t('challenge.custom_l1.tensions_title', 'Tensioni attese')}</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {(generated.expected_tensions as string[]).map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}

            {evalLensSignals.length > 0 && (
              <details className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {t('challenge.custom_l1.lens_title', 'Evaluation lens (5 pilastri)')}
                </summary>
                <div className="mt-3 space-y-3">
                  {evalLensSignals.map(({ pillar, label, signals }) => (
                    <div key={pillar}>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {label} {focusPillars.includes(pillar) && <span className="text-primary">★</span>}
                      </p>
                      <ul className="ml-4 mt-1 list-disc text-sm text-muted-foreground">
                        {signals.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Schedule + activate */}
      {generated && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              {t('challenge_builder.schedule_title', 'Finestra di attivazione')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start-at">{t('challenge_builder.start_at', 'Inizio')}</Label>
                <Input id="start-at" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-at">{t('challenge_builder.end_at', 'Fine')}</Label>
                <Input id="end-at" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={saving} onClick={() => handleSave('draft')}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('challenge_builder.save_draft', 'Salva bozza')}
              </Button>
              <Button disabled={saving} onClick={() => handleSave('active')}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                {t('challenge_builder.activate', 'Attiva sfida')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
