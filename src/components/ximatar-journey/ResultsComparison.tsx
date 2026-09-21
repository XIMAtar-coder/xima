import React, { useState, useEffect } from 'react';
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
          toast({
            title: "Error",
            description: "Failed to assign mentor. Please try again.",
            variant: "destructive"
          });
        } else if (data?.success) {
          log.debug('[ResultsComparison] Mentor assigned successfully:', data.mentor);
          toast({
            title: "Success",
            description: "Mentor assigned successfully!",
          });
        }
      } catch (error) {
        log.error('[ResultsComparison] Failed to assign mentor:', error);
        toast({
          title: "Error", 
          description: "Failed to assign mentor. Please try again.",
          variant: "destructive"
        });
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
  const firstName = user?.name?.trim().split(/\s+/)[0] || '';

  const header = (
    <div className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <Eyebrow className="mb-2.5">
          {t('guestJourney.results.eyebrow')}{fieldTitle ? ` / ${fieldTitle}` : ''}
        </Eyebrow>
        <h1 className="xs-title">
          {firstName ? t('guestJourney.results.title_named', { name: firstName }) : t('guestJourney.results.title')}
        </h1>
        <p className="mt-2.5 max-w-[610px] text-[15px] text-muted-foreground">{t('guestJourney.results.subtitle')}</p>
      </div>
      <JourneyInline current={3} className="shrink-0 sm:pb-1" />
    </div>
  );

  if (isAnalyzing) {
    return (
      <div>
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
      <div>
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

  // Calculate Drive level
  const driveScore = pillarScores.find(p => p.pillar === 'drive')?.score || 0;
  const getDriveLevel = (score: number): 'high' | 'medium' | 'low' => {
    if (score >= 7.5) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  };
  const driveLevel = getDriveLevel(driveScore);

  // Get strongest and weakest pillars (excluding Drive)
  const nonDrivePillars = pillarScores.filter(p => p.pillar !== 'drive');
  const sortedPillars = [...nonDrivePillars].sort((a, b) => b.score - a.score);
  const strongestPillar = sortedPillars[0];
  const weakestPillar = sortedPillars[sortedPillars.length - 1];

  const legacyPillarKey = (pillar: string) => (pillar === 'computational_power' ? 'computational' : pillar);
  const orderedScores = PILLAR_ORDER
    .map((id) => pillarScores.find((p) => p.pillar === id))
    .filter((p): p is PillarScore => !!p);

  const translations = ximatarData?.translations;
  const ximatarName = ximatarData
    ? String(t(`ximatar.${ximatarData.label}.name`, { defaultValue: ximatarData.label }))
    : '';
  const traits = splitTraits(translations?.core_traits);
  const lowEvidence = openAnswerChars !== null && openAnswerChars < 150;

  const savedText = hasCv ? t('ximatarJourney.register_value_saved_with_cv') : t('ximatarJourney.register_value_saved');

  return (
    <div>
      {header}

      <div className="grid gap-5 lg:grid-cols-[1.06fr_1fr] lg:gap-6">
        {/* 1 · Identity */}
        <Panel className="p-6 sm:p-7">
          {ximatarData ? (
            <>
              <div className="flex items-center gap-5 sm:gap-6">
                <img
                  src={ximatarData.image_url}
                  alt={ximatarName}
                  width={138}
                  height={138}
                  loading="lazy"
                  decoding="async"
                  className="h-[104px] w-[104px] shrink-0 rounded-[14px] bg-[hsl(var(--xs-page))] object-contain p-1 sm:h-[138px] sm:w-[138px]"
                  onError={(e) => { e.currentTarget.src = '/ximatars/fox.webp'; }}
                />
                <div className="min-w-0">
                  <Eyebrow className="text-primary">{t('ximatarJourney.your_ximatar_label')}</Eyebrow>
                  <h2 className="my-1 text-[28px] font-semibold capitalize leading-tight tracking-[-0.8px] text-foreground sm:text-[34px] sm:tracking-[-1px]">
                    {ximatarName}
                  </h2>
                  {translations?.title && <p className="text-[15px] text-foreground sm:text-[17px]">{translations.title}</p>}
                  {traits && (
                    <ul className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
                      {traits.map((trait) => (
                        <li key={trait} className="rounded border border-[hsl(var(--xs-line))] px-2 py-0.5 text-[11px] text-foreground sm:px-2.5 sm:py-1 sm:text-xs">
                          {trait}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {translations?.behavior && (
                <p className="mt-6 max-w-[620px] text-[15px] text-muted-foreground">{translations.behavior}</p>
              )}
              {!traits && translations?.core_traits && (
                <p className="mt-3 max-w-[620px] text-sm text-muted-foreground">{translations.core_traits}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('results.no_assessment_subtitle')}</p>
          )}

          {strongestPillar && weakestPillar && (
            <div className="mt-6 grid gap-5 border-t border-[hsl(var(--xs-line))] pt-6 sm:grid-cols-2 sm:gap-6">
              <div>
                <Eyebrow>{t('guestJourney.results.strength')}</Eyebrow>
                <h3 className="mt-1.5 text-[17px] font-semibold text-foreground">
                  {pillarShortName(t, strongestPillar.pillar)} · <span className="tabular-nums">{fmt(strongestPillar.score)}</span>
                </h3>
                <p className="mt-1.5 text-[13px] text-muted-foreground">{t(`pillars.${legacyPillarKey(strongestPillar.pillar)}.as_strength`)}</p>
              </div>
              <div>
                <Eyebrow>{t('guestJourney.results.growth')}</Eyebrow>
                <h3 className="mt-1.5 text-[17px] font-semibold text-foreground">
                  {pillarShortName(t, weakestPillar.pillar)} · <span className="tabular-nums">{fmt(weakestPillar.score)}</span>
                </h3>
                <p className="mt-1.5 text-[13px] text-muted-foreground">{t(`pillars.${legacyPillarKey(weakestPillar.pillar)}.as_weakness`)}</p>
              </div>
            </div>
          )}

          {lowEvidence && (
            <p className="mt-5 text-[13px] text-foreground">{t('ximatarJourney.result_low_evidence')}</p>
          )}

          {translations?.ideal_roles && (
            <p className="mt-5 text-[13px] text-muted-foreground">
              <b className="font-semibold text-foreground">{t('guestJourney.results.roles')}</b>
              <br />
              {translations.ideal_roles}
            </p>
          )}

          <details className="mt-5 border-t border-[hsl(var(--xs-line))] pt-4 text-[13px]">
            <summary className="cursor-pointer font-semibold text-primary">{t('guestJourney.results.how_to_read')}</summary>
            <div className="mt-3 space-y-3 text-muted-foreground">
              <p>{t('ximatarJourney.result_reading')}</p>
              {driveLevel !== 'high' && <p>{t('ximatarJourney.result_drive_separate')}</p>}
              {translations?.weaknesses && <p>{translations.weaknesses}</p>}
            </div>
          </details>
        </Panel>

        {/* 2 · The five pillars */}
        {pillarScores.length > 0 && (
          <Panel className="p-6 sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-[21px] font-semibold tracking-[-0.5px] text-foreground sm:text-[23px]">{t('guestJourney.results.pillars_title')}</h2>
              <small className="text-[13px] text-muted-foreground">{t('guestJourney.results.pillars_scale')}</small>
            </div>
            <p className="text-[13px] text-muted-foreground">{t('guestJourney.results.pillars_intro')}</p>
            <div className="mt-2">
              {orderedScores.map((pillar) => {
                const isStrong = strongestPillar?.pillar === pillar.pillar;
                const isWeak = weakestPillar?.pillar === pillar.pillar;
                const pct = Math.max(0, Math.min(100, pillar.score * 10));
                return (
                  <div key={pillar.pillar} className="mt-5 sm:mt-6">
                    <div className="mb-2 flex items-center justify-between gap-4 text-[13px]">
                      <span className="text-foreground">{pillarShortName(t, pillar.pillar)}</span>
                      <b className="font-semibold tabular-nums text-foreground">{fmt(pillar.score)}</b>
                    </div>
                    <div
                      className="h-[7px] rounded-sm bg-[hsl(var(--xs-line))]"
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={10}
                      aria-valuenow={Number(pillar.score.toFixed(1))}
                      aria-label={pillarShortName(t, pillar.pillar)}
                    >
                      <span className="block h-full rounded-sm bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    {(isStrong || isWeak) && (
                      <small className="mt-1.5 block text-[11px] text-muted-foreground">
                        {isStrong ? t('guestJourney.results.strength_tag') : t('guestJourney.results.growth_tag')}
                      </small>
                    )}
                  </div>
                );
              })}
              <div className="mt-4 flex justify-between font-mono text-[11px] text-muted-foreground" aria-hidden>
                <span>0</span><span>5</span><span>10</span>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground">{t('guestJourney.results.pillars_note')}</p>
            {totalScore !== null && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t('ximatarJourney.scores_total_label')} <span className="font-semibold tabular-nums text-foreground">{fmt(totalScore)}/50</span>
              </p>
            )}
          </Panel>
        )}

        {/* 3 · Drive */}
        <Panel className="flex flex-col justify-center p-6 sm:p-7">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-[21px] font-semibold tracking-[-0.5px] text-foreground sm:text-[23px]">{t('guestJourney.results.drive_title')}</h2>
            <small className="text-[13px] text-muted-foreground">{t('guestJourney.results.drive_small')}</small>
          </div>
          <div className="my-3 flex items-baseline gap-3.5">
            <b className="text-[40px] font-semibold leading-none tracking-[-1.5px] text-foreground sm:text-[52px]">
              <span className="tabular-nums">{fmt(driveScore)}</span>
              <small className="text-base font-normal tracking-normal text-muted-foreground"> / 10</small>
            </b>
            <span className="rounded bg-primary/10 px-2.5 py-0.5 text-xs text-primary">{t(`guestJourney.results.drive_${driveLevel}`)}</span>
          </div>
          <p className="max-w-[450px] text-[13px] text-muted-foreground">{t(`ximatarJourney.drive_${driveLevel}_body`)}</p>
          <div className="my-5 flex gap-1" role="list" aria-label={t('guestJourney.results.drive_title')}>
            {(['low', 'medium', 'high'] as const).map((level) => {
              const active = level === driveLevel;
              return (
                <span
                  key={level}
                  role="listitem"
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'flex-1 border-b-[5px] pb-2 text-center text-[11px]',
                    active ? 'border-primary font-bold text-primary' : 'border-[hsl(var(--xs-line))] text-muted-foreground',
                  )}
                >
                  {t(`guestJourney.results.drive_${level}`)}
                  {active && ` · ${t('guestJourney.results.drive_yours')}`}
                </span>
              );
            })}
          </div>
          <p className="max-w-[450px] text-[13px] text-muted-foreground">{t('ximatarJourney.drive_section_body')}</p>
          <p className="mt-3 text-[11px] text-muted-foreground">{t('guestJourney.results.drive_note')}</p>
        </Panel>

        {/* 4 · Mentor (optional) */}
        <Panel className="p-6 sm:p-7">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-[21px] font-semibold tracking-[-0.5px] text-foreground sm:text-[23px]">{t('guestJourney.results.mentor_title')}</h2>
            <small className="text-[13px] text-muted-foreground">{t('guestJourney.results.mentor_optional')}</small>
          </div>
          <p className="mb-5 max-w-[590px] text-[13px] text-muted-foreground">{t('guestJourney.results.mentor_intro')}</p>

          <FeaturedProfessionals
            variant="compact"
            limit={2}
            onSelect={handleMentorSelect}
            selectedId={selectedProfessional || undefined}
            pillarScores={pillarScores}
            ximatar={ximatarData?.label}
          />

          <div className="mt-4 flex flex-col gap-2 border-t border-[hsl(var(--xs-line))] pt-4 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-4" aria-live="polite">
            {selectedProfessional ? (
              <>
                <span className="text-primary">
                  {t('guestJourney.results.mentor_selected_note', {
                    name: (JSON.parse(localStorage.getItem('selected_professional_data') || 'null')?.full_name || '').split(/\s+/)[0],
                  })}
                </span>
                <button type="button" onClick={handleDeselectMentor} className="shrink-0 text-left text-primary hover:underline sm:text-right">
                  {t('guestJourney.results.mentor_later')}
                </button>
              </>
            ) : (
              <span className="text-muted-foreground">{t('ximatarJourney.mentor_choose_later')}</span>
            )}
          </div>
        </Panel>
      </div>

      {!hasCv && openResponses.length > 0 && (
        <Panel className="mt-5 p-6 sm:p-7 lg:mt-6">
          <h2 className="mb-5 text-[21px] font-semibold tracking-[-0.5px] text-foreground sm:text-[23px]">{t('ximatarJourney.open_scores_title')}</h2>
          <div className="space-y-6">
            {openResponses.map((response) => (
              <OpenAnswerScore
                key={response.open_key}
                openKey={response.open_key}
                answer={response.answer}
                rubric={response.rubric}
                fieldKey={fieldKey || undefined}
              />
            ))}
          </div>
        </Panel>
      )}

      {/* What the account keeps. On a phone it stays here, in the flow: inside
          the sticky bar it would cover half the screen for the whole page. */}
      {!isAuthenticated && (
        <div className="mt-5 px-1 sm:hidden">
          <p className="text-[13px] text-muted-foreground">{savedText} {t('ximatarJourney.register_value_next')}</p>
          {!hasCv && guestOpenAnswerCount > 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t('ximatarJourney.open_scores_after_register', { count: guestOpenAnswerCount })}
            </p>
          )}
        </div>
      )}

      {/* The one translucent surface of the page: the save bar, sticky at the bottom. */}
      <div className="xs-glass sticky bottom-4 z-20 mt-3 flex flex-col gap-3 !p-4 sm:mt-5 sm:!px-7 sm:!py-6 lg:mt-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-[-0.3px] text-foreground sm:text-xl">
            {isAuthenticated ? t('guestJourney.results.save_title_auth') : t('guestJourney.results.save_title')}
          </h2>
          {!isAuthenticated && (
            <div className="hidden sm:block">
              <p className="mt-1 max-w-[600px] text-[13px] text-muted-foreground">
                {savedText} {t('ximatarJourney.register_value_next')}
              </p>
              {!hasCv && guestOpenAnswerCount > 0 && (
                <p className="mt-1 max-w-[600px] text-[11px] text-muted-foreground">
                  {t('ximatarJourney.open_scores_after_register', { count: guestOpenAnswerCount })}
                </p>
              )}
            </div>
          )}
        </div>
        <Button onClick={handleProceedWithSelection} className="h-12 shrink-0 rounded-[7px] px-5 text-[15px] lg:w-auto">
          {isAuthenticated ? t('results.proceed_to_dashboard') : t('guestJourney.results.save_cta')}
          <ArrowUpRight size={17} aria-hidden />
        </Button>
      </div>
    </div>
  );
};

/** "Affidabilità, Costanza, Lealtà" → chips; a sentence stays a sentence. */
function splitTraits(text: string | null | undefined): string[] | null {
  if (!text) return null;
  const parts = text.split(/[,;·•\n]+/).map((s) => s.trim().replace(/\.$/, '')).filter(Boolean);
  if (parts.length < 2 || parts.length > 6 || parts.some((p) => p.length > 32)) return null;
  return parts;
}

export default ResultsComparison;
