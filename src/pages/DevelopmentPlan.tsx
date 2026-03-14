import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  CheckCircle, 
  Clock, 
  Target, 
  BookOpen, 
  Award, 
  Brain, 
  MessageCircle, 
  Lightbulb,
  ArrowLeft,
  Sparkles,
  Calendar,
  Users,
  TrendingUp,
  Play,
  HelpCircle
} from 'lucide-react';

interface DevelopmentTest {
  id: number;
  titleKey: string;
  descriptionKey: string;
  questions: number;
  timeLimit: number;
  skillAreaKey: string;
  route: string;
}

interface DevelopmentArea {
  id: number;
  key: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  icon: React.ElementType;
  tests: DevelopmentTest[];
}

const DevelopmentPlan = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [completedTests, setCompletedTests] = useState<number[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<string[]>(['area-1']);

  const developmentAreas: DevelopmentArea[] = [
    {
      id: 1,
      key: 'analytical',
      priority: 'high',
      estimatedTime: '2-3',
      icon: Brain,
      tests: [
        {
          id: 1,
          titleKey: 'development.tests.data_analysis.title',
          descriptionKey: 'development.tests.data_analysis.description',
          questions: 10,
          timeLimit: 30,
          skillAreaKey: 'computational',
          route: '/test/data-analysis'
        },
        {
          id: 2,
          titleKey: 'development.tests.logical_problem_solving.title',
          descriptionKey: 'development.tests.logical_problem_solving.description',
          questions: 15,
          timeLimit: 45,
          skillAreaKey: 'computational',
          route: '/test/logical-problem-solving'
        }
      ]
    },
    {
      id: 2,
      key: 'communication',
      priority: 'medium',
      estimatedTime: '3-4',
      icon: MessageCircle,
      tests: [
        {
          id: 3,
          titleKey: 'development.tests.presentation_skills.title',
          descriptionKey: 'development.tests.presentation_skills.description',
          questions: 12,
          timeLimit: 40,
          skillAreaKey: 'communication',
          route: '/test/presentation-skills'
        }
      ]
    },
    {
      id: 3,
      key: 'creative',
      priority: 'low',
      estimatedTime: '1-2',
      icon: Lightbulb,
      tests: [
        {
          id: 4,
          titleKey: 'development.tests.creative_thinking.title',
          descriptionKey: 'development.tests.creative_thinking.description',
          questions: 8,
          timeLimit: 35,
          skillAreaKey: 'creativity',
          route: '/test/creative-thinking'
        }
      ]
    }
  ];

  const handleStartTest = (route: string) => {
    navigate(route);
  };

  const getPriorityVariant = (priority: string): 'destructive' | 'default' | 'secondary' => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getSkillAreaIcon = (skillKey: string) => {
    switch (skillKey) {
      case 'computational': return <Brain className="h-3 w-3" />;
      case 'communication': return <MessageCircle className="h-3 w-3" />;
      case 'creativity': return <Lightbulb className="h-3 w-3" />;
      default: return <HelpCircle className="h-3 w-3" />;
    }
  };

  const completedCount = completedTests.length;
  const totalTests = developmentAreas.reduce((sum, area) => sum + area.tests.length, 0);
  const overallProgress = totalTests > 0 ? (completedCount / totalTests) * 100 : 0;

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto pt-6 pb-12 px-4 md:px-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 animate-fade-in">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t('development.title')}
            </h1>
            <p className="text-muted-foreground max-w-xl">
              {t('development.subtitle')}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/profile')}
            className="gap-2 hover-scale"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('development.back_to_dashboard')}
          </Button>
        </div>

        {/* Overall Progress Card */}
        <Card className="overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              {t('development.overall_progress')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-muted-foreground">{t('development.tests_completed')}</span>
                  <span className="text-foreground">{completedCount} / {totalTests}</span>
                </div>
                <div className="relative">
                  <Progress value={overallProgress} className="h-3" />
                  <div 
                    className="absolute top-0 left-0 h-3 bg-gradient-to-r from-primary/20 to-primary/40 rounded-full transition-all duration-500"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="p-3 rounded-full bg-green-500/20">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                    <div className="text-sm text-muted-foreground">{t('development.tests_completed')}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <div className="p-3 rounded-full bg-orange-500/20">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{totalTests - completedCount}</div>
                    <div className="text-sm text-muted-foreground">{t('development.tests_remaining')}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="p-3 rounded-full bg-primary/20">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{Math.round(overallProgress)}%</div>
                    <div className="text-sm text-muted-foreground">{t('development.progress')}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Areas Accordion */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Accordion 
            type="multiple" 
            value={expandedAreas}
            onValueChange={setExpandedAreas}
            className="space-y-4"
          >
            {developmentAreas.map((area, index) => {
              const AreaIcon = area.icon;
              const areaTestsCompleted = area.tests.filter(test => completedTests.includes(test.id)).length;
              const areaProgress = (areaTestsCompleted / area.tests.length) * 100;
              
              return (
                <AccordionItem 
                  key={area.id} 
                  value={`area-${area.id}`}
                  className="border rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow duration-300"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          area.priority === 'high' ? 'bg-destructive/10' :
                          area.priority === 'medium' ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          <AreaIcon className={`h-5 w-5 ${
                            area.priority === 'high' ? 'text-destructive' :
                            area.priority === 'medium' ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-lg">
                            {t(`development.areas.${area.key}.title`)}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {t(`development.areas.${area.key}.description`)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getPriorityVariant(area.priority)}>
                          {t(`development.priority.${area.priority}`)}
                        </Badge>
                        <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{area.estimatedTime} {t('development.minutes')}</span>
                        </div>
                        <div className="hidden md:block w-24">
                          <div className="flex items-center gap-2">
                            <Progress value={areaProgress} className="h-2" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {areaTestsCompleted}/{area.tests.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-6 pb-6 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {area.tests.map((test) => {
                        const isCompleted = completedTests.includes(test.id);
                        return (
                          <Card 
                            key={test.id} 
                            className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                              isCompleted 
                                ? 'border-green-300 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10' 
                                : 'hover:border-primary/40'
                            }`}
                          >
                            {isCompleted && (
                              <div className="absolute top-3 right-3">
                                <div className="p-1.5 rounded-full bg-green-500">
                                  <CheckCircle className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}
                            
                            <CardHeader className="pb-3">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${
                                  isCompleted ? 'bg-green-500/20' : 'bg-primary/10 group-hover:bg-primary/20'
                                } transition-colors`}>
                                  {getSkillAreaIcon(test.skillAreaKey)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm leading-tight">
                                    {t(test.titleKey)}
                                  </h4>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {t(test.descriptionKey)}
                                  </p>
                                </div>
                              </div>
                            </CardHeader>
                            
                            <CardContent className="pt-0 space-y-4">
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <BookOpen className="h-3 w-3" />
                                  {test.questions} {t('development.questions')}
                                </Badge>
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <Clock className="h-3 w-3" />
                                  {test.timeLimit} {t('development.minutes')}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  {getSkillAreaIcon(test.skillAreaKey)}
                                  <span>{t(`development.skill_areas.${test.skillAreaKey}`)}</span>
                                </div>
                              </div>
                              
                              <Button
                                size="sm"
                                className={`w-full gap-2 transition-all ${
                                  isCompleted 
                                    ? 'bg-green-600 hover:bg-green-700' 
                                    : 'group-hover:shadow-md'
                                }`}
                                disabled={isCompleted}
                                onClick={() => handleStartTest(test.route)}
                              >
                                {isCompleted ? (
                                  <>
                                    <Award className="h-4 w-4" />
                                    {t('development.completed')}
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-4 w-4" />
                                    {t('development.start_test')}
                                  </>
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {/* Recommendations Section */}
        <Card className="overflow-hidden animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              {t('development.next_steps')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="group p-5 rounded-[16px] bg-card border border-border hover:shadow-md transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Target className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t('development.recommendations.focus_priority.title')}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {t('development.recommendations.focus_priority.description')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="group p-5 rounded-[16px] bg-card border border-border hover:shadow-md transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Calendar className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t('development.recommendations.schedule_practice.title')}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {t('development.recommendations.schedule_practice.description')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="group p-5 rounded-[16px] bg-card border border-border hover:shadow-md transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Users className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t('development.recommendations.connect_mentor.title')}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {t('development.recommendations.connect_mentor.description')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DevelopmentPlan;