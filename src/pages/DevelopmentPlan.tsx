import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Target, BookOpen, Award } from 'lucide-react';

const DevelopmentPlan = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [completedTests, setCompletedTests] = useState<number[]>([]);

  // Mock development plan based on user's weakest areas
  const developmentPlan = [
    {
      id: 1,
      title: t('development.enhance_analytical_skills'),
      description: 'Strengthen your computational thinking and data analysis capabilities',
      priority: 'high',
      estimatedTime: '2-3 weeks',
      tests: [
        {
          id: 1,
          title: t('development.data_analysis_fundamentals'),
          description: 'Test your ability to interpret complex datasets',
          questions: 10,
          timeLimit: 30,
          skillArea: 'computational'
        },
        {
          id: 2,
          title: t('development.logical_problem_solving'),
          description: 'Evaluate systematic approach to complex problems',
          questions: 15,
          timeLimit: 45,
          skillArea: 'computational'
        }
      ]
    },
    {
      id: 2,
      title: t('development.communication_workshop'),
      description: 'Improve your presentation and interpersonal communication skills',
      priority: 'medium',
      estimatedTime: '3-4 weeks',
      tests: [
        {
          id: 3,
          title: t('development.presentation_skills_assessment'),
          description: 'Evaluate your ability to present complex ideas clearly',
          questions: 12,
          timeLimit: 40,
          skillArea: 'communication'
        }
      ]
    },
    {
      id: 3,
      title: t('development.creative_innovation_training'),
      description: 'Develop your creative problem-solving and innovation mindset',
      priority: 'low',
      estimatedTime: '1-2 weeks',
      tests: [
        {
          id: 4,
          title: t('development.creative_thinking_challenge'),
          description: 'Test your ability to generate innovative solutions',
          questions: 8,
          timeLimit: 35,
          skillArea: 'creativity'
        }
      ]
    }
  ];

  const handleStartTest = (testId: number) => {
    const testRoutes = {
      1: '/test/data-analysis',
      2: '/test/logical-problem-solving', 
      3: '/test/presentation-skills',
      4: '/test/creative-thinking'
    };
    
    const route = testRoutes[testId as keyof typeof testRoutes];
    if (route) {
      navigate(route);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return t('profile.priority');
      case 'medium': return t('profile.recommended');
      case 'low': return t('profile.optional');
      default: return '';
    }
  };

  const completedCount = completedTests.length;
  const totalTests = developmentPlan.reduce((sum, area) => sum + area.tests.length, 0);
  const overallProgress = (completedCount / totalTests) * 100;

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto pt-6 space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{t('development.title')}</h1>
            <p className="text-muted-foreground">
              {t('development.subtitle')}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            ← {t('common.back')}
          </Button>
        </div>

        {/* Overall Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {t('development.overall_progress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>{t('development.tests_completed')}</span>
                <span>{completedCount} of {totalTests}</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{completedCount}</div>
                  <div className="text-sm text-muted-foreground">{t('development.tests_completed')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{totalTests - completedCount}</div>
                  <div className="text-sm text-muted-foreground">{t('development.tests_remaining')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{Math.round(overallProgress)}%</div>
                  <div className="text-sm text-muted-foreground">{t('development.progress')}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Areas */}
        <div className="space-y-6">
          {developmentPlan.map((area) => (
            <Card key={area.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      {area.title}
                    </CardTitle>
                    <p className="text-muted-foreground mt-2">{area.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityColor(area.priority) as any}>
                      {getPriorityText(area.priority)}
                    </Badge>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {area.estimatedTime}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {area.tests.map((test) => {
                    const isCompleted = completedTests.includes(test.id);
                    return (
                      <Card key={test.id} className={`border-2 ${isCompleted ? 'border-green-200 bg-green-50' : 'border-border'}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-sm">{test.title}</h3>
                              <p className="text-xs text-muted-foreground mt-1">{test.description}</p>
                            </div>
                            {isCompleted && (
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                              <span>{t('development.questions')}:</span>
                              <span>{test.questions}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{t('development.time_limit')}:</span>
                              <span>{test.timeLimit} minutes</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{t('development.skill_area')}:</span>
                              <span className="capitalize">{test.skillArea}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="w-full mt-4"
                            disabled={isCompleted}
                            onClick={() => handleStartTest(test.id)}
                          >
                            {isCompleted ? (
                              <>
                                <Award className="h-4 w-4 mr-1" />
                                {t('development.completed')}
                              </>
                            ) : (
                              t('development.start_test')
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>{t('development.next_steps')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-900">{t('development.focus_high_priority')}</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Start with analytical skills tests to maximize your computational power score.
                </p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-900">{t('development.schedule_practice')}</h3>
                <p className="text-sm text-green-700 mt-1">
                  Complete 1-2 tests per week for optimal skill development and retention.
                </p>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-medium text-purple-900">{t('development.connect_mentor')}</h3>
                <p className="text-sm text-purple-700 mt-1">
                  Discuss your progress and get personalized advice on areas for improvement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DevelopmentPlan;