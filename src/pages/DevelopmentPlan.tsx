import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Sparkles, Target, TrendingUp, CheckCircle, Clock,
  BookOpen, Headphones, Play, ExternalLink, Loader2, Brain,
  Award, RefreshCw, GraduationCap
} from 'lucide-react';
import { useGrowthHub, GrowthResource, GrowthProgress } from '@/hooks/useGrowthHub';
import GrowthTestModal from '@/components/growth/GrowthTestModal';
import GrowthTestResultModal from '@/components/growth/GrowthTestResultModal';

const PILLAR_COLORS: Record<string, string> = {
  drive: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
  computational_power: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
  communication: 'text-green-600 bg-green-500/10 border-green-500/20',
  creativity: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
  knowledge: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/20',
};

const PILLAR_LABELS: Record<string, string> = {
  drive: 'Drive',
  computational_power: 'Computational Power',
  communication: 'Communication',
  creativity: 'Creativity',
  knowledge: 'Knowledge',
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'test_passed':
      return <Badge className="bg-green-600 text-white gap-1"><CheckCircle className="h-3 w-3" /> Passed</Badge>;
    case 'test_failed':
      return <Badge variant="destructive" className="gap-1"><RefreshCw className="h-3 w-3" /> Retry</Badge>;
    case 'test_ready':
      return <Badge className="bg-primary text-primary-foreground gap-1"><GraduationCap className="h-3 w-3" /> Test Ready</Badge>;
    case 'completed':
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Take Test</Badge>;
    case 'in_progress':
      return <Badge variant="outline" className="gap-1"><Play className="h-3 w-3" /> In Progress</Badge>;
    default:
      return <Badge variant="outline" className="gap-1 text-muted-foreground">Not Started</Badge>;
  }
};

const ResourceCard: React.FC<{
  resource: GrowthResource;
  type: 'course' | 'book' | 'podcast';
  progress?: GrowthProgress;
  onMarkComplete: (id: string) => void;
  onTakeTest: (id: string) => void;
  testLoading: boolean;
}> = ({ resource, type, progress, onMarkComplete, onTakeTest, testLoading }) => {
  const url = resource.url || resource.read_url || '';
  const isPassed = progress?.status === 'test_passed';
  const canMarkComplete = progress && ['not_started', 'in_progress'].includes(progress.status);
  const canTakeTest = progress && ['completed', 'test_ready', 'test_failed'].includes(progress.status);
  const isTestLoading = testLoading;

  const typeIcon = type === 'course' ? <Play className="h-4 w-4" /> :
    type === 'book' ? <BookOpen className="h-4 w-4" /> :
    <Headphones className="h-4 w-4" />;

  return (
    <Card className={`group transition-all duration-300 hover:shadow-lg ${isPassed ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10' : ''}`}>
      {isPassed && (
        <div className="absolute top-3 right-3 z-10">
          <div className="p-1.5 rounded-full bg-green-500"><CheckCircle className="h-4 w-4 text-white" /></div>
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${PILLAR_COLORS[resource.primary_pillar] || 'bg-muted'}`}>
            {typeIcon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm leading-tight line-clamp-2">{resource.title}</h4>
            {resource.author && <p className="text-xs text-muted-foreground mt-0.5">by {resource.author}</p>}
            {resource.host && <p className="text-xs text-muted-foreground mt-0.5">Host: {resource.host}</p>}
            <p className="text-xs text-muted-foreground mt-1">{resource.platform}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2">{resource.why_for_you}</p>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs gap-1">
            {PILLAR_LABELS[resource.primary_pillar] || resource.primary_pillar}
          </Badge>
          {resource.estimated_hours && (
            <Badge variant="outline" className="text-xs gap-1"><Clock className="h-3 w-3" />{resource.estimated_hours}h</Badge>
          )}
          {resource.episode_length_minutes && (
            <Badge variant="outline" className="text-xs gap-1"><Clock className="h-3 w-3" />{resource.episode_length_minutes}min</Badge>
          )}
          <Badge variant="outline" className="text-xs uppercase">{resource.language}</Badge>
        </div>

        {progress && <div className="pt-1">{getStatusBadge(progress.status)}</div>}

        <div className="flex gap-2 pt-1">
          {url && (
            <Button size="sm" variant="outline" className="gap-1.5 flex-1" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                {type === 'course' ? 'Open Course' : type === 'book' ? 'Read' : 'Listen'}
              </a>
            </Button>
          )}

          {canMarkComplete && (
            <Button size="sm" className="gap-1.5 flex-1" onClick={() => onMarkComplete(progress!.id)}>
              <CheckCircle className="h-3.5 w-3.5" /> Done
            </Button>
          )}

          {canTakeTest && (
            <Button size="sm" className="gap-1.5 flex-1" disabled={isTestLoading}
              onClick={() => onTakeTest(progress!.id)}>
              {isTestLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GraduationCap className="h-3.5 w-3.5" />}
              Take Test
            </Button>
          )}

          {isPassed && progress?.test_score != null && (
            <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
              <Award className="h-4 w-4" /> {progress.test_score}/100
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const DevelopmentPlan = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    activePath, progress, loading, generating, testingResourceId,
    activeTest, evaluating, lastTestResult,
    generatePath, markResourceCompleted, generateTest, submitTest,
    dismissTestResult, getProgressForResource, completedCount, totalCount, overallProgress,
    setActiveTest,
  } = useGrowthHub();

  if (loading) {
    return (
      <MainLayout>
        <div className="container max-w-6xl mx-auto pt-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto pt-6 pb-12 px-4 md:px-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 animate-fade-in">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-widest text-primary">// Growth Hub</p>
            <h1 className="text-[28px] md:text-[34px] xl:text-[40px] font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Growth Hub
            </h1>
            <p className="text-[14px] md:text-[15px] text-muted-foreground max-w-xl">
              AI-curated courses, books, and podcasts targeting your weakest pillars. Prove your growth with personalized tests.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/profile')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> {t('developmentPlan.back_button', 'Back to Profile')}
          </Button>
        </div>

        {/* No path yet — generate one */}
        {!activePath && (
          <Card className="overflow-hidden animate-fade-in border-dashed border-2">
            <CardContent className="p-8 md:p-12 text-center space-y-6">
              <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                <Brain className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2 max-w-lg mx-auto">
                <h2 className="text-xl font-bold">Generate Your Growth Path</h2>
                <p className="text-sm text-muted-foreground">
                  XIMA's AI will analyze your XIMAtar profile, pillar scores, and CV tensions to recommend
                  personalized courses, books, and podcasts that strengthen your growth edges.
                </p>
              </div>
              <Button size="lg" className="gap-2" onClick={generatePath} disabled={generating}>
                {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {generating ? 'Generating your path...' : 'Generate Growth Path'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Active path */}
        {activePath && (
          <>
            {/* Progress overview */}
            <Card className="overflow-hidden animate-fade-in">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><Target className="h-5 w-5 text-primary" /></div>
                  {activePath.path_title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                {activePath.path_objective && (
                  <p className="text-sm text-muted-foreground">{activePath.path_objective}</p>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tests passed</span>
                    <span className="font-medium">{completedCount} / {totalCount}</span>
                  </div>
                  <Progress value={overallProgress} className="h-3" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-xl font-bold text-green-600">{completedCount}</div>
                      <div className="text-xs text-muted-foreground">Passed</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <div>
                      <div className="text-xl font-bold text-orange-600">{totalCount - completedCount}</div>
                      <div className="text-xs text-muted-foreground">Remaining</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xl font-bold text-primary">{Math.round(overallProgress)}%</div>
                      <div className="text-xs text-muted-foreground">Progress</div>
                    </div>
                  </div>
                </div>

                {activePath.growth_insight && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground">{activePath.growth_insight}</p>
                    </div>
                  </div>
                )}

                {activePath.next_milestone && (
                  <p className="text-xs text-muted-foreground italic">🎯 {activePath.next_milestone}</p>
                )}

                <div className="flex justify-end">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={generatePath} disabled={generating}>
                    {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Regenerate Path
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Resources tabs */}
            <Tabs defaultValue="courses" className="animate-fade-in">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="courses" className="gap-1.5">
                  <Play className="h-4 w-4" /> Courses ({activePath.resources.courses?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="books" className="gap-1.5">
                  <BookOpen className="h-4 w-4" /> Books ({activePath.resources.books?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="podcasts" className="gap-1.5">
                  <Headphones className="h-4 w-4" /> Podcasts ({activePath.resources.podcasts?.length || 0})
                </TabsTrigger>
              </TabsList>

              {(['courses', 'books', 'podcasts'] as const).map(tab => (
                <TabsContent key={tab} value={tab}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(activePath.resources[tab] || []).map((resource: GrowthResource) => (
                      <ResourceCard
                        key={resource.id}
                        resource={resource}
                        type={tab === 'courses' ? 'course' : tab === 'books' ? 'book' : 'podcast'}
                        progress={getProgressForResource(resource.id)}
                        onMarkComplete={markResourceCompleted}
                        onTakeTest={generateTest}
                        testLoading={testingResourceId === getProgressForResource(resource.id)?.id}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
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
    </MainLayout>
  );
};

export default DevelopmentPlan;
