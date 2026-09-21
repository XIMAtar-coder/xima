import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CandidateLayout from '@/components/layout/CandidateLayout';
import { PageHeader, Panel, Eyebrow } from '@/components/layout/PageHeader';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { Button } from '@/components/ui/button';
import {
  CheckCircle, Clock, BookOpen, Headphones, Play, ExternalLink, Loader2,
  RefreshCw, GraduationCap, ChevronDown,
} from 'lucide-react';
import { useGrowthHub, GrowthResource, GrowthProgress } from '@/hooks/useGrowthHub';
import { useCandidateSnapshot } from '@/hooks/useCandidateSnapshot';
import { PillarBars, formatScore, pillarName, readPillar, type PillarKey } from '@/components/candidate/PillarBars';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import GrowthTestModal from '@/components/growth/GrowthTestModal';
import GrowthTestResultModal from '@/components/growth/GrowthTestResultModal';
import { cn } from '@/lib/utils';

type ResourceKind = 'courses' | 'books' | 'podcasts';

/** One resource of the library: a numbered entry, not a card with a shadow. */
const ResourceEntry: React.FC<{
  index: number;
  resource: GrowthResource;
  type: 'course' | 'book' | 'podcast';
  progress?: GrowthProgress;
  onMarkComplete: (id: string) => void;
  onTakeTest: (id: string) => void;
  testLoading: boolean;
}> = ({ index, resource, type, progress, onMarkComplete, onTakeTest, testLoading }) => {
  const { t } = useTranslation();
  const url = resource.url || resource.read_url || '';
  const isPassed = progress?.status === 'test_passed';
  const canMarkComplete = progress && ['not_started', 'in_progress'].includes(progress.status);
  const canTakeTest = progress && ['completed', 'test_ready', 'test_failed'].includes(progress.status);

  const statusLabel = (() => {
    switch (progress?.status) {
      case 'test_passed': return t('developmentPlan.status_passed', 'Passed');
      case 'test_failed': return t('developmentPlan.status_retry', 'To retry');
      case 'test_ready': return t('developmentPlan.status_test_ready', 'Test ready');
      case 'completed': return t('developmentPlan.status_completed', 'Take the test');
      case 'in_progress': return t('developmentPlan.status_in_progress', 'In progress');
      default: return t('developmentPlan.status_not_started', 'To start');
    }
  })();

  const openLabel = type === 'course'
    ? t('developmentPlan.open_course', 'Open course')
    : type === 'book'
      ? t('developmentPlan.open_book', 'Read')
      : t('developmentPlan.open_podcast', 'Listen');

  return (
    <article className={cn('flex flex-col border border-[hsl(var(--xs-line))] p-5', isPassed ? 'border-primary/40' : '')}>
      <div className="flex items-baseline gap-3">
        <span className="xs-num font-mono text-[12px] text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
        <h3 className="min-w-0 flex-1 text-[16px] font-semibold leading-snug text-foreground">{resource.title}</h3>
      </div>
      <p className="mt-1 pl-[30px] text-[13px] text-muted-foreground">
        {[resource.platform, resource.author, resource.host].filter(Boolean).join(' · ') || '—'}
      </p>
      {resource.why_for_you && (
        <p className="mt-2.5 pl-[30px] text-[14px] leading-relaxed text-muted-foreground">{resource.why_for_you}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-[30px]">
        <span className="rounded-md border border-[hsl(var(--xs-line))] px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {pillarName(t, resource.primary_pillar as PillarKey)}
        </span>
        {resource.estimated_hours ? (
          <span className="rounded-md border border-[hsl(var(--xs-line))] px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            <Clock className="mr-1 inline h-3 w-3" />{resource.estimated_hours}h
          </span>
        ) : null}
        {resource.episode_length_minutes ? (
          <span className="rounded-md border border-[hsl(var(--xs-line))] px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            <Clock className="mr-1 inline h-3 w-3" />{resource.episode_length_minutes}min
          </span>
        ) : null}
        {resource.language && (
          <span className="rounded-md border border-[hsl(var(--xs-line))] px-2 py-0.5 font-mono text-[11px] uppercase text-muted-foreground">{resource.language}</span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[hsl(var(--xs-line))] pt-3 pl-[30px]">
        <span className={cn('font-mono text-[11px] uppercase tracking-wider', isPassed ? 'text-primary' : 'text-muted-foreground')}>
          {statusLabel}
          {isPassed && progress?.test_score != null ? ` · ${progress.test_score}/100` : ''}
        </span>
        <span className="flex-1" />
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[14px] font-semibold text-primary hover:underline">
            {openLabel} <ExternalLink className="inline h-3.5 w-3.5" />
          </a>
        )}
        {canMarkComplete && (
          <button type="button" onClick={() => onMarkComplete(progress!.id)} className="text-[14px] font-semibold text-primary hover:underline">
            {t('developmentPlan.mark_complete', 'Mark as completed')}
          </button>
        )}
        {canTakeTest && (
          <button type="button" disabled={testLoading} onClick={() => onTakeTest(progress!.id)} className="text-[14px] font-semibold text-primary hover:underline disabled:opacity-60">
            {testLoading ? <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" /> : <GraduationCap className="mr-1 inline h-3.5 w-3.5" />}
            {t('developmentPlan.take_test', 'Take the test')}
          </button>
        )}
      </div>
    </article>
  );
};

const DevelopmentPlan = () => {
  const { t, i18n } = useTranslation();
  const snapshot = useCandidateSnapshot();
  const [tab, setTab] = useState<ResourceKind>('courses');
  const [whyOpen, setWhyOpen] = useState(false);
  const {
    activePath, loading, generating, testingResourceId,
    activeTest, evaluating, lastTestResult,
    generatePath, markResourceCompleted, generateTest, submitTest,
    dismissTestResult, getProgressForResource, completedCount, totalCount, overallProgress,
    setActiveTest,
  } = useGrowthHub();

  const breadcrumb = <span className="block truncate">{t('nav.candidate_area', 'Your space')} / {t('nav.tests')}</span>;

  if (loading) {
    return (
      <CandidateLayout breadcrumb={breadcrumb}>
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </CandidateLayout>
    );
  }

  const targetPillar = activePath?.target_pillar as PillarKey | undefined;
  const tabs: Array<{ id: ResourceKind; label: string; count: number }> = [
    { id: 'courses', label: t('developmentPlan.tab_courses', 'Courses'), count: activePath?.resources.courses?.length || 0 },
    { id: 'books', label: t('developmentPlan.tab_books', 'Books'), count: activePath?.resources.books?.length || 0 },
    { id: 'podcasts', label: t('developmentPlan.tab_podcasts', 'Podcasts'), count: activePath?.resources.podcasts?.length || 0 },
  ];

  return (
    <CandidateLayout breadcrumb={breadcrumb}>
      <EmailVerificationBanner slim />
      <PageHeader
        eyebrow={t('developmentPlan.eyebrow', 'Your development · Growth Hub')}
        title={snapshot.name
          ? t('developmentPlan.hero_title_name', { name: snapshot.name, defaultValue: 'The next step, {{name}}.' })
          : t('developmentPlan.hero_title', 'The next step.')}
        subtitle={t('developmentPlan.hero_subtitle', 'Courses, books and podcasts to train your skills.')}
        actions={!activePath ? (
          <span className="rounded-md border border-[hsl(var(--xs-line))] px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {t('developmentPlan.before_generation', 'Before generation')}
          </span>
        ) : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Left: the starting point */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Panel className="!p-5">
            <Eyebrow>{t('developmentPlan.starting_point', 'Your starting point')}</Eyebrow>
            <div className="mt-3 flex items-center gap-3">
              {snapshot.ximatarImage && (
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-[hsl(var(--xs-page))]">
                  <OptimizedImage src={snapshot.ximatarImage} alt={snapshot.ximatarName || 'XIMAtar'} width={56} height={56} className="h-full w-full object-cover" />
                </span>
              )}
              <span className="min-w-0">
                <b className="block truncate text-[15px] font-semibold text-foreground">{snapshot.name || '—'}</b>
                <span className="block truncate text-[13px] text-muted-foreground">{snapshot.ximatarName || '—'}</span>
              </span>
            </div>

            <h3 className="mt-5 text-[14px] font-semibold text-foreground">{t('dashboard.five_pillars', 'Your five pillars')}</h3>
            <p className="mb-3 text-[12px] text-muted-foreground">{t('developmentPlan.pillars_hint', 'Assessment results · scale 0–10')}</p>
            <PillarBars scores={snapshot.pillarScores} focus={targetPillar} compact />

            {(snapshot.strongest || snapshot.weakest) && (
              <p className="mt-4 border-t border-[hsl(var(--xs-line))] pt-4 text-[13px] leading-relaxed text-muted-foreground">
                {snapshot.strongest && (
                  <><b className="text-foreground">{t('developmentPlan.strength_line', { pillar: pillarName(t, snapshot.strongest), defaultValue: '{{pillar}} is your strength.' })}</b>{' '}</>
                )}
                {snapshot.weakest && t('developmentPlan.weakness_line', { pillar: pillarName(t, snapshot.weakest), defaultValue: '{{pillar}} is the area to develop.' })}
                {targetPillar && (
                  <><br />{t('developmentPlan.path_focus_line', { pillar: pillarName(t, targetPillar), defaultValue: 'This path focuses on {{pillar}}.' })}</>
                )}
              </p>
            )}
          </Panel>
        </aside>

        {/* Right: objective + library */}
        <div className="min-w-0 space-y-6">
          {!activePath ? (
            <Panel className="py-12 text-center">
              <Eyebrow>{t('developmentPlan.empty_eyebrow', 'A path that starts from you')}</Eyebrow>
              <h2 className="xs-title mx-auto mt-3 max-w-xl !text-[26px]">{t('developmentPlan.empty_title', 'From your results to practice.')}</h2>
              <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                {t('developmentPlan.empty_body', 'The path considers your XIMAtar, the five pillars and, when available, your CV analysis. You will find courses, books and podcasts to practise with, and tests to check what you have learnt.')}
              </p>
              <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <span className="rounded-md border border-[hsl(var(--xs-line))] px-2.5 py-1">{t('developmentPlan.step_1', '01 · Read and listen')}</span>
                <span className="rounded-md border border-[hsl(var(--xs-line))] px-2.5 py-1">{t('developmentPlan.step_2', '02 · Put into practice')}</span>
                <span className="rounded-md border border-[hsl(var(--xs-line))] px-2.5 py-1">{t('developmentPlan.step_3', '03 · Verify')}</span>
              </div>
              <Button size="lg" className="mt-7" onClick={generatePath} disabled={generating}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {generating ? t('developmentPlan.generating', 'Generating your path...') : t('developmentPlan.generate', 'Generate my path')}
              </Button>
            </Panel>
          ) : (
            <>
              {/* Objective */}
              <section className="rounded-xl bg-[hsl(var(--xs-rail))] p-6 text-white sm:p-8">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_200px]">
                  <div className="min-w-0">
                    <p className="xs-eyebrow !text-white/60">
                      {t('developmentPlan.path_eyebrow', 'Your path')}{targetPillar ? ` · ${pillarName(t, targetPillar)}` : ''}
                    </p>
                    <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.5px] sm:text-[28px]">{activePath.path_title}</h2>
                    {activePath.path_objective && (
                      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/75">{activePath.path_objective}</p>
                    )}
                    {(activePath.growth_insight || activePath.next_milestone) && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setWhyOpen(o => !o)}
                          aria-expanded={whyOpen}
                          className="flex items-center gap-1.5 text-[14px] font-semibold text-white hover:underline"
                        >
                          {t('developmentPlan.why_this_path', 'Why this path')}
                          <ChevronDown size={16} className={cn('transition-transform', whyOpen && 'rotate-180')} aria-hidden="true" />
                        </button>
                        {whyOpen && (
                          <div className="mt-2 max-w-xl space-y-2 text-[14px] leading-relaxed text-white/75">
                            {activePath.growth_insight && <p>{activePath.growth_insight}</p>}
                            {activePath.next_milestone && <p>{activePath.next_milestone}</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="lg:text-right">
                    <strong className="xs-num block font-mono text-[40px] font-medium leading-none">{Math.round(overallProgress)}%</strong>
                    <span className="mt-1.5 block text-[13px] text-white/70">
                      {t('developmentPlan.tests_passed', { passed: completedCount, total: totalCount, defaultValue: '{{passed}} of {{total}} tests passed' })}
                    </span>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-white/20" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(overallProgress)}>
                      <div className="h-full bg-white transition-[width] duration-500" style={{ width: `${overallProgress}%` }} />
                    </div>
                    <span className="mt-2 block text-[12px] text-white/60">
                      {t('developmentPlan.remaining', { count: Math.max(0, totalCount - completedCount), defaultValue: '{{count}} to complete' })}
                    </span>
                  </div>
                </div>
              </section>

              {/* Library */}
              <Panel className="!p-0">
                <div className="flex items-center justify-between gap-3 px-6 py-4">
                  <h2 className="text-[19px] font-semibold tracking-[-0.3px] text-foreground">{t('developmentPlan.resources_title', 'Your resources')}</h2>
                  <button type="button" onClick={generatePath} disabled={generating} className="text-[13px] font-semibold text-primary hover:underline disabled:opacity-60">
                    {generating ? <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 inline h-3.5 w-3.5" />}
                    {t('developmentPlan.regenerate', 'Regenerate path')}
                  </button>
                </div>

                <div role="tablist" aria-label={t('developmentPlan.resource_type', 'Resource type')} className="grid grid-cols-3 border-y border-[hsl(var(--xs-line))]">
                  {tabs.map(({ id, label, count }) => {
                    const Icon = id === 'courses' ? Play : id === 'books' ? BookOpen : Headphones;
                    const active = tab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setTab(id)}
                        className={cn(
                          'flex items-center justify-center gap-2 border-b-2 px-3 py-3 text-[14px] transition-colors',
                          active ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <Icon size={16} aria-hidden="true" />
                        {label}
                        <span className="xs-num font-mono text-[11px]">{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div role="tabpanel" className="grid gap-4 p-6 md:grid-cols-2">
                  {(activePath.resources[tab] || []).length === 0 ? (
                    <p className="py-6 text-[14px] text-muted-foreground md:col-span-2">{t('developmentPlan.no_resources', 'No resources in this section yet.')}</p>
                  ) : (
                    (activePath.resources[tab] || []).map((resource: GrowthResource, i: number) => (
                      <ResourceEntry
                        key={resource.id}
                        index={i}
                        resource={resource}
                        type={tab === 'courses' ? 'course' : tab === 'books' ? 'book' : 'podcast'}
                        progress={getProgressForResource(resource.id)}
                        onMarkComplete={markResourceCompleted}
                        onTakeTest={generateTest}
                        testLoading={testingResourceId === getProgressForResource(resource.id)?.id}
                      />
                    ))
                  )}
                </div>
              </Panel>

              {snapshot.weakest && (
                <p className="text-[13px] text-muted-foreground">
                  {t('developmentPlan.tests_note', 'Tests check what you have learnt: they do not change your assessment scores.')}
                  {' '}
                  {t('developmentPlan.weakest_reminder', {
                    pillar: pillarName(t, snapshot.weakest),
                    score: formatScore(readPillar(snapshot.pillarScores, snapshot.weakest), i18n.language),
                    defaultValue: 'Your development area is {{pillar}} ({{score}}/10).',
                  })}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Test Modal */}
      {activeTest && (
        <GrowthTestModal
          test={activeTest}
          onSubmit={(answers) => submitTest(activeTest.progress_id, answers)}
          onClose={() => setActiveTest(null)}
          evaluating={evaluating}
        />
      )}

      {/* Result Modal */}
      {lastTestResult && (
        <GrowthTestResultModal
          result={lastTestResult}
          onClose={dismissTestResult}
        />
      )}
    </CandidateLayout>
  );
};

export default DevelopmentPlan;
