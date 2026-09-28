import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { OpenAnswerScore } from './OpenAnswerScore';
import FeaturedProfessionals from '../FeaturedProfessionals';
import { JourneyInline } from './JourneySteps';
import { PILLAR_ORDER, pillarShortName, formatScore } from './pillarLabels';
import { Eyebrow, Panel } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { ArrowUpRight, AlertCircle } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useXimatarsCatalog } from '@/hooks/useXimatarsCatalog';
import type { Rubric } from '@/lib/scoring/openResponse';
import { normalizeXimatarImageUrl } from '@/utils/normalizeXimatarImage';
import { useToast } from '@/hooks/use-toast';
import { log } from '@/lib/log';
import { loadSignals, summarise } from '@/lib/salita/signals';
import { Ximatar3D, has3DModel, canOpenAR, openXimatarAR, type Ximatar3DRef } from '@/components/ximatar3d/Ximatar3D';
import { useAssessmentBenchmarks } from '@/hooks/useAssessmentBenchmarks';

interface ResultsComparisonProps {
  onComplete: (step: number) => void;
  hasCv: boolean;
}

interface XimatarData {
  id: string;
  label: string;
  image_url: string;
  translations: {
    title: string;
    core_traits?: string | null;
    behavior?: string | null;
    weaknesses?: string | null;
    ideal_roles?: string | null;
  };
}

interface PillarScore {
  pillar: string;
  score: number;
}

const ResultsComparison: React.FC<ResultsComparisonProps> = ({ onComplete, hasCv }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user } = useUser();
  const { toast } = useToast();
  const { catalogMap, loading: catalogLoading } = useXimatarsCatalog();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [ximatarData, setXimatarData] = useState<XimatarData | null>(null);
  const [pillarScores, setPillarScores] = useState<PillarScore[]>([]);
  const [totalScore, setTotalScore] = useState<number | null>(null);
  const [openResponses, setOpenResponses] = useState<Array<{
    open_key: 'open1' | 'open2';
    answer: string;
    score: number;
    rubric: Rubric;
  }>>([]);
  const [topPillars, setTopPillars] = useState<Array<{ name: string; score: number }>>([]);
  const [guestOpenAnswerCount, setGuestOpenAnswerCount] = useState(0);
  // Total characters written in the open answers, to flag a profile resting
  // mostly on quick multiple-choice clicks.
  const [openAnswerChars, setOpenAnswerChars] = useState<number | null>(null);
  const [hasNoAssessment, setHasNoAssessment] = useState(false);
  const [fieldKey, setFieldKey] = useState<string | null>(null);
  const viewerRef = useRef<Ximatar3DRef>(null);
  // Averages over all fields: per-field numbers need many more tests.
  const { data: benchmarks } = useAssessmentBenchmarks();

  useEffect(() => {
    const fetchComputedResults = async () => {
      if (catalogLoading) return;

      const currentLang = (i18n.language || 'it').split('-')[0] as 'it' | 'en' | 'es';
      
      // Check for guest data first (use sessionStorage for security)
      const guestPillarScores = sessionStorage.getItem('guest_pillar_scores');
      const guestXimatar = sessionStorage.getItem('guest_ximatar');
      
      if (guestPillarScores && !user?.id) {
        const guestScores = JSON.parse(guestPillarScores);
        const scores: PillarScore[] = [
          { pillar: 'computational_power', score: guestScores.computational_power },
          { pillar: 'communication', score: guestScores.communication },
          { pillar: 'knowledge', score: guestScores.knowledge },
          { pillar: 'creativity', score: guestScores.creativity },
          { pillar: 'drive', score: guestScores.drive }
        ];
        setPillarScores(scores);
        
        const total = scores.reduce((sum, s) => sum + s.score, 0);
        setTotalScore(total);
        
        // Identify top 2 pillars
        const sortedScores = [...scores].sort((a, b) => b.score - a.score);
        setTopPillars(sortedScores.slice(0, 2).map(s => ({ name: s.pillar, score: s.score })));
        
        // Use catalog for XIMAtar data
        if (guestXimatar && catalogMap.has(guestXimatar.toLowerCase())) {
          const catalogItem = catalogMap.get(guestXimatar.toLowerCase());
          if (catalogItem) {
            setXimatarData({
              id: catalogItem.id,
              label: catalogItem.label,
              image_url: normalizeXimatarImageUrl(catalogItem.image_url),
              translations: catalogItem.translation || {
                title: '',
                core_traits: '',
                behavior: '',
                weaknesses: '',
                ideal_roles: ''
              }
            });
          }
        }
        
        setTimeout(() => {
          setIsAnalyzing(false);
          setShowResults(true);
        }, 1500);
        return;
      }
      
      if (!user?.id) {
        setHasNoAssessment(true);
        setIsAnalyzing(false);
        return;
      }

      // Authenticated user - fetch latest assessment
      const resultId = localStorage.getItem('current_result_id');
      
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = 2000;

      const pollResults = async (): Promise<boolean> => {
        // Fetch the latest completed assessment
        const { data: result, error } = await supabase
          .from('assessment_results')
          .select('id, ximatar_id, total_score, computed_at')
          .eq('user_id', user!.id)
          .eq('completed', true)
          .order('computed_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          log.error('Error fetching assessment:', error);
          return false;
        }

        if (!result || !result.ximatar_id) {
          return false;
        }

        // Fetch XIMAtar info with translations
        const { data: ximatarInfo, error: ximatarError } = await supabase
          .from('ximatars')
          .select(`
            id,
            label,
            image_url,
            ximatar_translations!inner(
              title,
              core_traits,
              behavior,
              weaknesses,
              ideal_roles
            )
          `)
          .eq('id', result.ximatar_id)
          .eq('ximatar_translations.lang', currentLang)
          .maybeSingle();

        if (ximatarError) {
          log.error('Error fetching XIMAtar:', ximatarError);
          return false;
        }

        if (ximatarInfo) {
          const translations = Array.isArray(ximatarInfo.ximatar_translations) 
            ? ximatarInfo.ximatar_translations[0] 
            : ximatarInfo.ximatar_translations;

          setXimatarData({
            id: ximatarInfo.id,
            label: ximatarInfo.label,
            image_url: normalizeXimatarImageUrl(ximatarInfo.image_url),
            translations: translations || {
              title: '',
              core_traits: '',
              behavior: '',
              weaknesses: '',
              ideal_roles: ''
            }
          });
        }

        // Fetch pillar scores
        const { data: scores, error: scoresError } = await supabase
          .from('pillar_scores')
          .select('pillar, score')
          .eq('assessment_result_id', result.id)
          .order('score', { ascending: false });

        if (scoresError) {
          log.error('Error fetching pillar scores:', scoresError);
        }

        if (scores && scores.length > 0) {
          setPillarScores(scores);
          setTopPillars(scores.slice(0, 2).map(s => ({ name: s.pillar, score: s.score })));
        }

        setTotalScore(result.total_score);
        return true;
      };

      // Poll for results
      const poll = async () => {
        attempts++;
        const success = await pollResults();
        
        if (success) {
          setIsAnalyzing(false);
          setShowResults(true);
        } else if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
        } else {
          log.warn('Max polling attempts reached - no assessment found');
          setHasNoAssessment(true);
          setIsAnalyzing(false);
          setShowResults(true);
        }
      };

      poll();
    };

    fetchComputedResults();
  }, [user, i18n.language, catalogLoading, catalogMap]);

  // Fetch open responses
  useEffect(() => {
    const fetchOpenResponses = async () => {
      const guestData = sessionStorage.getItem('guest_assessment_data');
      if (guestData && !user?.id) {
        // Guests' written answers are scored by analyze-open-answer only after
        // registration. This branch used to fabricate a score (70-99) and a
        // full rubric with Math.random() and render them as if graded. Show
        // nothing graded; tell them when grading happens instead.
        const data = JSON.parse(guestData);
        setGuestOpenAnswerCount(Object.keys(data.openAnswers || {}).length);
        setOpenAnswerChars((Object.values(data.openAnswers || {}) as unknown[]).reduce<number>((sum, a) => sum + String(a ?? '').trim().length, 0));
        setOpenResponses([]);
        return;
      }
      
      if (!user?.id) return;
      
      const attemptId = localStorage.getItem('current_attempt_id');
      if (!attemptId) return;

      const { data, error } = await supabase
        .from('assessment_open_responses')
        .select('open_key, answer, score, rubric, field_key')
        .eq('user_id', user.id)
        .eq('attempt_id', attemptId)
        .order('open_key', { ascending: true });

      if (!error && data && data.length > 0) {
        setOpenResponses(data as any);
        setOpenAnswerChars(data.reduce((sum, row: any) => sum + String(row.answer ?? '').trim().length, 0));
        // Set fieldKey from the first response
        setFieldKey(data[0].field_key);
      }
    };

    if (showResults) {
      fetchOpenResponses();
    }
  }, [showResults, user]);

  const handleMentorSelect = async (mentor: any) => {
    log.debug('[ResultsComparison] Mentor selected:', mentor);
    log.debug('[ResultsComparison] isAuthenticated:', isAuthenticated, 'user?.id:', user?.id);
    
    setSelectedProfessional(mentor.id);
    localStorage.setItem('selected_professional_data', JSON.stringify(mentor));
    
    // Call assign-mentor edge function to create the mentor match
    if (isAuthenticated && user?.id) {
      log.debug('[ResultsComparison] Calling assign-mentor edge function...');
      try {
        const { data, error } = await supabase.functions.invoke('assign-mentor', {
          body: { professional_id: mentor.id },
        });
        
        log.debug('[ResultsComparison] Edge function response:', { data, error });
        
        if (error) {
          log.error('[ResultsComparison] Error assigning mentor:', error);
          toast({ title: t('results2.mentor_assign_error_title'), description: t('results2.mentor_assign_error'), variant: 'destructive' });
        } else if (data?.success) {
          log.debug('[ResultsComparison] Mentor assigned successfully:', data.mentor);
          toast({ title: t('results2.mentor_assigned', { name: String(mentor.full_name || '').split(/\s+/)[0] }) });
        }
      } catch (error) {
        log.error('[ResultsComparison] Failed to assign mentor:', error);
        toast({ title: t('results2.mentor_assign_error_title'), description: t('results2.mentor_assign_error'), variant: 'destructive' });
      }
    } else {
      log.debug('[ResultsComparison] Not calling edge function - user not authenticated or no user ID');
    }
  };

  // Choosing a mentor is optional: the candidate can go on without one and
  // pick later from the dashboard. Only a mentor chosen on this page is passed
  // along — selected_professional_data may be left over from an earlier visit.
  const handleProceedWithSelection = () => {
    const professionalData = selectedProfessional
      ? JSON.parse(localStorage.getItem('selected_professional_data') || 'null')
      : null;

    if (isAuthenticated) {
      navigate('/profile', { 
        state: { 
          selectedProfessional: professionalData,
          ximatarData: ximatarData,
          pillarScores: pillarScores
        }
      });
    } else {
      localStorage.setItem('selectedProfessional', JSON.stringify({
        professional: professionalData,
        ximatarData: ximatarData,
        pillarScores: pillarScores
      }));
      navigate('/register');
    }
  };

  /** "Decido più avanti": drop the choice; the candidate can pick a mentor later from the dashboard. */
  const handleDeselectMentor = () => setSelectedProfessional(null);

  const locale = (i18n.language || 'it').split('-')[0];
  const fmt = (n: number) => formatScore(n, locale);
  const currentFieldKey = fieldKey || (typeof window !== 'undefined' ? localStorage.getItem('preferred_field') : null);
  const fieldTitle = currentFieldKey ? t(`field.${currentFieldKey}.title`, { defaultValue: '' }) : '';

  const header = (
    <div className="mb-6">
      <Eyebrow className="mb-2.5 text-primary">
        {t('guestJourney.results.eyebrow')}{fieldTitle ? ` / ${fieldTitle}` : ''}
      </Eyebrow>
      <JourneyInline current={3} className="mb-4" />
    </div>
  );

  if (isAnalyzing) {
    return (
      <div className="mx-auto max-w-[720px]">
        {header}
        <Panel className="flex flex-col items-center gap-5 py-14 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">{t('results.analyzing')}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{t('results.analyzing_subtitle')}</p>
          </div>
        </Panel>
      </div>
    );
  }

  if (hasNoAssessment) {
    return (
      <div className="mx-auto max-w-[720px]">
        {header}
        <Panel className="flex flex-col items-center gap-5 py-14 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">{t('results.no_assessment')}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{t('results.no_assessment_subtitle')}</p>
          </div>
          <Button onClick={() => navigate('/ximatar-journey')}>{t('results.start_assessment')}</Button>
        </Panel>
      </div>
    );
  }

  const driveScore = pillarScores.find(p => p.pillar === 'drive')?.score || 0;
  const getDriveLevel = (score: number): 'high' | 'medium' | 'low' => {
    if (score >= 7.5) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  };
  const driveLevel = getDriveLevel(driveScore);
  const salita = summarise(loadSignals());

  // Strongest and weakest among the four content pillars; Drive is read apart.
  const nonDrivePillars = pillarScores.filter(p => p.pillar !== 'drive');
  const sortedPillars = [...nonDrivePillars].sort((a, b) => b.score - a.score);
  const strongestPillar = sortedPillars[0];
  const weakestPillar = sortedPillars[sortedPillars.length - 1];
  const contentScores = PILLAR_ORDER
    .map((id) => pillarScores.find((p) => p.pillar === id))
    .filter((p): p is PillarScore => !!p && p.pillar !== 'drive');

  const translations = ximatarData?.translations;
  const ximatarKey = (ximatarData?.label || '').toLowerCase();
  const ximatarName = ximatarData ? String(t(`ximatar.${ximatarKey}.name`, { defaultValue: ximatarData.label })) : '';
  const ximatarTitle = ximatarData ? String(t(`ximatar.${ximatarKey}.title`, { defaultValue: translations?.title || '' })) : '';
  const lowEvidence = openAnswerChars !== null && openAnswerChars < 150;
  const weakName = weakestPillar ? pillarShortName(t, weakestPillar.pillar) : '';
  const strongName = strongestPillar ? pillarShortName(t, strongestPillar.pillar) : '';
  const averages = benchmarks?.averages ?? null;
  const with3D = has3DModel(ximatarKey);
  const withAR = with3D && canOpenAR();

  const compareLine = (score: number, avg: number) => {
    const diff = Math.round((score - avg) * 10) / 10;
    if (Math.abs(diff) < 0.3) return t('results2.compare_in_line');
    return diff > 0
      ? t('results2.compare_above', { diff: fmt(diff) })
      : t('results2.compare_below', { diff: fmt(Math.abs(diff)) });
  };

  const ScoreRow = ({ label, score, avg }: { label: string; score: number; avg: number | null }) => (
    <div className="border-b border-[hsl(var(--xs-line))] py-5 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[15px] text-foreground">{label}</span>
        <b className="text-[22px] font-semibold tabular-nums tracking-[-0.5px] text-foreground">
          {fmt(score)}<small className="text-[13px] font-normal text-muted-foreground"> / 10</small>
        </b>
      </div>
      <div
        className="relative mt-3 h-[6px] rounded-full bg-[hsl(var(--xs-line))]"
        role="meter" aria-valuemin={0} aria-valuemax={10} aria-valuenow={Number(score.toFixed(1))} aria-label={label}
      >
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary/25" style={{ width: `${Math.min(100, score * 10)}%` }} />
        {avg !== null && (
          <span className="absolute -top-[6px] h-[18px] w-[2px] rounded bg-foreground/70" style={{ left: `calc(${Math.min(100, avg * 10)}% - 1px)` }} aria-hidden />
        )}
        <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-background bg-primary shadow" style={{ left: `${Math.min(100, score * 10)}%` }} aria-hidden />
      </div>
      {avg !== null && (
        <div className="mt-2.5 flex justify-between gap-3 text-[12px] text-muted-foreground">
          <span>{t('results2.average_value', { value: fmt(avg) })}</span>
          <span>{compareLine(score, avg)}</span>
        </div>
      )}
    </div>
  );

  const goToSave = () => document.getElementById('xima-save')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <div className="mx-auto max-w-[720px]">
      {header}

      {/* 1 · The reveal */}
      <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-1.2px] text-foreground sm:text-[44px]">
        {ximatarTitle ? `${ximatarTitle.replace(/[.!]$/, '')}.` : t('guestJourney.results.title')}
      </h1>
      <p className="mt-2 text-[15px] text-muted-foreground">{t('results2.subtitle')}</p>

      {ximatarData && (
        <section className="mt-6 overflow-hidden rounded-[26px] bg-[#0E1B3D] text-white">
          <div className="flex items-center justify-between px-5 pt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
            <span>{t('ximatarJourney.your_ximatar_label')}</span>
            <span>{ximatarName}</span>
          </div>
          <Ximatar3D
            ref={viewerRef}
            ximatarId={ximatarKey}
            mode="reveal"
            fallbackSrc={ximatarData.image_url}
            alt={t('results2.stage_alt', { name: ximatarName })}
            className="h-[320px] sm:h-[380px]"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-5 text-[13px] text-white/75">
            <span>{with3D ? t('results2.drag_hint') : ''}</span>
            <div className="flex gap-2">
              {with3D && (
                <button type="button" onClick={() => viewerRef.current?.replay()} className="min-h-[40px] rounded-full border border-white/30 px-3.5 text-white hover:bg-white/10">
                  {t('results2.replay')}
                </button>
              )}
              {withAR && (
                <button type="button" onClick={() => openXimatarAR(ximatarKey)} className="min-h-[40px] rounded-full bg-white px-3.5 font-semibold text-[#0E1B3D]">
                  {t('results2.ar')}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 2 · The profile */}
      {ximatarData && (
        <section className="mt-10">
          <Eyebrow>{t('results2.profile_eyebrow')}</Eyebrow>
          <h2 className="mt-2 text-[44px] font-semibold capitalize leading-none tracking-[-1.6px] text-foreground">{ximatarName}.</h2>
          {translations?.behavior && (
            <p className="mt-4 text-[16px] leading-relaxed text-foreground">{translations.behavior.split(/(?<=[.!?])\s/)[0]}</p>
          )}
          {strongestPillar && weakestPillar && (
            <div className="mt-6 grid grid-cols-2 gap-5">
              <div className="border-l-2 border-primary pl-3.5">
                <small className="block text-[12px] text-muted-foreground">{t('results2.your_resource')}</small>
                <b className="mt-1 block text-[16px] font-semibold text-foreground">{strongName}</b>
              </div>
              <div className="border-l-2 border-[hsl(var(--xs-line))] pl-3.5">
                <small className="block text-[12px] text-muted-foreground">{t('results2.to_grow')}</small>
                <b className="mt-1 block text-[16px] font-semibold text-foreground">{weakName}</b>
              </div>
            </div>
          )}
          {lowEvidence && (
            <div className="mt-6 border-l-2 border-foreground/60 pl-3.5">
              <b className="block text-[14px] font-semibold text-foreground">{t('results2.reliability_title')}</b>
              <p className="mt-1 text-[14px] text-muted-foreground">{t('ximatarJourney.result_low_evidence')}</p>
            </div>
          )}
        </section>
      )}

      {/* 3 · Resources compared with the average */}
      {contentScores.length > 0 && (
        <section className="mt-12">
          <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-1px] text-foreground">{t('results2.compare_title')}</h2>
          <p className="mt-3 text-[14px] text-muted-foreground">
            {averages ? t('results2.compare_intro', { count: benchmarks?.count ?? 0 }) : t('results2.compare_pending', { count: benchmarks?.count ?? 0, min: benchmarks?.minCount ?? 30 })}
          </p>
          {averages && (
            <div className="mt-4 flex gap-5 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" />{t('results2.legend_you')}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-[2px] rounded bg-foreground/70" />{t('results2.legend_average')}</span>
            </div>
          )}
          <div className="mt-2">
            {contentScores.map((p) => (
              <ScoreRow key={p.pillar} label={pillarShortName(t, p.pillar)} score={p.score} avg={averages ? averages[p.pillar as keyof typeof averages] ?? null : null} />
            ))}
          </div>
          <details className="border-t border-[hsl(var(--xs-line))] py-4 text-[14px]">
            <summary className="cursor-pointer font-semibold text-foreground">{t('results2.faq_resource_q')}</summary>
            <p className="mt-2 text-muted-foreground">{t('results2.faq_resource_a')}</p>
          </details>
          <details className="border-t border-[hsl(var(--xs-line))] py-4 text-[14px]">
            <summary className="cursor-pointer font-semibold text-foreground">{t('results2.faq_read_q')}</summary>
            <p className="mt-2 text-muted-foreground">{t('ximatarJourney.result_reading')}</p>
          </details>
        </section>
      )}

      {/* 4 · Drive, on its own scale */}
      <section className="mt-8 rounded-[22px] bg-[hsl(var(--xs-page))] p-5 sm:p-6">
        <Eyebrow className="text-primary">{t('results2.drive_eyebrow')}</Eyebrow>
        <h2 className="mt-2 text-[30px] font-semibold tracking-[-1px] text-foreground">Drive</h2>
        <p className="mt-2 text-[14px] text-muted-foreground">{t('results2.drive_body')}</p>
        <ScoreRow label={`Drive · ${String(t(`guestJourney.results.drive_${driveLevel}`)).toLowerCase()}`} score={driveScore} avg={averages ? averages.drive ?? null : null} />
        <div className="mt-2 border-t border-[hsl(var(--xs-line))] pt-4">
          <p className="text-[14px] font-semibold text-foreground">{t('salita.cta_title')}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {salita ? t('salita.facts_line', { attempts: salita.hardAttempts, retries: salita.retries }) : t('salita.cta_body')}
          </p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate('/salita')}>{t('salita.cta_button')}</Button>
        </div>
      </section>

      {/* 5 · The mentor: the next step of the growth */}
      <section className="mt-12" id="xima-mentor">
        <Eyebrow className="text-primary">{t('results2.mentor_eyebrow', { pillar: weakName })}</Eyebrow>
        <h2 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-1px] text-foreground">{t('results2.mentor_title')}</h2>
        <p className="mt-3 text-[15px] text-muted-foreground">{t('results2.mentor_body', { pillar: weakName })}</p>
        <p className="mt-3 inline-block border-b-2 border-primary pb-1 text-[14px] font-semibold text-primary">{t('results2.mentor_free_call')}</p>
        <p className="mt-4 text-[13px] text-muted-foreground">{t('results2.mentor_matched')}</p>
        <div className="mt-4">
          <FeaturedProfessionals
            variant="compact"
            limit={2}
            onSelect={handleMentorSelect}
            selectedId={selectedProfessional || undefined}
            pillarScores={pillarScores}
            ximatar={ximatarData?.label}
          />
        </div>
        {selectedProfessional && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]" aria-live="polite">
            <span className="text-primary">
              {t('guestJourney.results.mentor_selected_note', {
                name: (JSON.parse(localStorage.getItem('selected_professional_data') || 'null')?.full_name || '').split(/\s+/)[0],
              })}
            </span>
            <button type="button" onClick={handleDeselectMentor} className="text-primary hover:underline">{t('guestJourney.results.mentor_later')}</button>
          </div>
        )}
        <ol className="mt-6 grid gap-2.5 text-[14px] text-foreground">
          {(isAuthenticated ? ['results2.step_auth_1', 'results2.step_auth_2', 'results2.step_3'] : ['results2.step_1', 'results2.step_2', 'results2.step_3']).map((key, i) => (
            <li key={key} className="grid grid-cols-[22px_1fr] gap-2"><span className="font-mono text-[12px] text-primary">{i + 1}</span>{t(key)}</li>
          ))}
        </ol>
        <details className="mt-4 border-t border-[hsl(var(--xs-line))] py-4 text-[14px]">
          <summary className="cursor-pointer font-semibold text-foreground">{t('results2.mentor_after_q')}</summary>
          <p className="mt-2 text-muted-foreground">{t('results2.mentor_after_a')}</p>
        </details>
        <details className="border-t border-[hsl(var(--xs-line))] py-4 text-[14px]">
          <summary className="cursor-pointer font-semibold text-foreground">{t('results2.mentor_sees_q')}</summary>
          <p className="mt-2 text-muted-foreground">{t('results2.mentor_sees_a')}</p>
        </details>
      </section>

      {/* 6 · Save: in the flow, never over the text */}
      <section id="xima-save" className="mt-8 rounded-[26px] bg-primary p-6 text-primary-foreground sm:p-7">
        <Eyebrow className="!text-white/80">{t('results2.save_eyebrow')}</Eyebrow>
        <h2 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-1px]">
          {isAuthenticated ? t('guestJourney.results.save_title_auth') : t('results2.save_title', { name: ximatarName })}
        </h2>
        {!isAuthenticated && <p className="mt-3 text-[15px] text-white/90">{t('results2.save_body')}</p>}
        <Button onClick={handleProceedWithSelection} className="mt-5 h-[52px] w-full rounded-[12px] bg-white text-[16px] font-semibold text-primary hover:bg-white/90">
          {isAuthenticated ? t('results.proceed_to_dashboard') : t('results2.save_cta')}
          <ArrowUpRight size={17} aria-hidden />
        </Button>
        {!isAuthenticated && (
          <>
            <p className="mt-2 text-[13px] text-white/80">{t('results2.save_how')}</p>
            <ul className="mt-5 grid gap-4 border-t border-white/25 pt-5">
              {(['keep', 'grow', 'visible'] as const).map((k) => (
                <li key={k}>
                  <b className="block text-[15px] font-semibold">{t(`results2.benefit_${k}_title`)}</b>
                  <span className="text-[13px] text-white/85">{t(`results2.benefit_${k}_body`)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {!isAuthenticated && <p className="mt-3 text-[13px] text-muted-foreground">{t('results2.save_without')}</p>}

      {/* 7 · Where to look next */}
      {translations?.ideal_roles && (
        <section className="mt-12">
          <Eyebrow className="text-primary">{t('results2.roles_eyebrow')}</Eyebrow>
          <h2 className="mt-2 text-[30px] font-semibold tracking-[-1px] text-foreground">{t('results2.roles_title')}</h2>
          <p className="mt-3 text-[15px] text-foreground">{translations.ideal_roles}</p>
          <p className="mt-2 text-[13px] text-muted-foreground">{t('results2.roles_note')}</p>
        </section>
      )}
      {translations?.behavior && (
        <details className="mt-6 border-t border-[hsl(var(--xs-line))] py-4 text-[14px]">
          <summary className="cursor-pointer font-semibold text-foreground">{t('results2.how_born', { name: ximatarName })}</summary>
          <div className="mt-2 space-y-2 text-muted-foreground">
            <p>{translations.behavior}</p>
            {strongestPillar && weakestPillar && (
              <p>{t('ximatarJourney.pair_line', { strong: strongName, weak: weakName, defaultValue: 'Strong in {{strong}}, {{weak}} to cultivate.' })}</p>
            )}
            {translations.weaknesses && <p>{translations.weaknesses}</p>}
          </div>
        </details>
      )}

      {!hasCv && openResponses.length > 0 && (
        <Panel className="mt-8 p-6 sm:p-7">
          <h2 className="mb-5 text-[21px] font-semibold tracking-[-0.5px] text-foreground sm:text-[23px]">{t('ximatarJourney.open_scores_title')}</h2>
          <div className="space-y-6">
            {openResponses.map((response) => (
              <OpenAnswerScore key={response.open_key} openKey={response.open_key} answer={response.answer} rubric={response.rubric} fieldKey={fieldKey || undefined} />
            ))}
          </div>
        </Panel>
      )}

      {!isAuthenticated && (
        <p className="mt-10 text-center">
          <button type="button" onClick={goToSave} className="text-[14px] text-foreground underline underline-offset-4">{t('results2.back_to_save')}</button>
        </p>
      )}
    </div>
  );
};

export default ResultsComparison;
