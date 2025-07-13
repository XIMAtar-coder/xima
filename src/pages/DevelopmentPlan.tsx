import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Target, BookOpen, Award } from 'lucide-react';

const DevelopmentPlan = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [completedTests, setCompletedTests] = useState<number[]>([]);

  // Mock development plan based on user's weakest areas
  const developmentPlan = [
    {
      id: 1,
      title: 'Enhance Analytical Skills',
      description: 'Strengthen your computational thinking and data analysis capabilities',
      priority: 'high',
      estimatedTime: '2-3 weeks',
      tests: [
        {
          id: 1,
          title: 'Data Analysis Fundamentals',
          description: 'Test your ability to interpret complex datasets',
          questions: 10,
          timeLimit: 30,
          skillArea: 'computational'
        },
        {
          id: 2,
          title: 'Logical Problem Solving',
          description: 'Evaluate systematic approach to complex problems',
          questions: 15,
          timeLimit: 45,
          skillArea: 'computational'
        }
      ]
    },
    {
      id: 2,
      title: 'Communication Workshop',
      description: 'Improve your presentation and interpersonal communication skills',
      priority: 'medium',
      estimatedTime: '3-4 weeks',
      tests: [
        {
          id: 3,
          title: 'Presentation Skills Assessment',
          description: 'Evaluate your ability to present complex ideas clearly',
          questions: 12,
          timeLimit: 40,
          skillArea: 'communication'
        }
      ]
    },
    {
      id: 3,
      title: 'Creative Innovation Training',
      description: 'Develop your creative problem-solving and innovation mindset',
      priority: 'low',
      estimatedTime: '1-2 weeks',
      tests: [
        {
          id: 4,
          title: 'Creative Thinking Challenge',
          description: 'Test your ability to generate innovative solutions',
          questions: 8,
          timeLimit: 35,
          skillArea: 'creativity'
        }
      ]
    }
  ];

  const handleStartTest = (testId: number) => {
    // In a real app, this would navigate to the test
    console.log('Starting test:', testId);
    // Simulate test completion
    setTimeout(() => {
      setCompletedTests(prev => [...prev, testId]);
      // Update user's skill scores based on test results
    }, 2000);
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
            <h1 className="text-3xl font-bold">Development Plan</h1>
            <p className="text-muted-foreground">
              Personalized growth path based on your assessment results
            </p>
          </div>
          <Button variant="outline" onClick={() => window.history.back()}>
            ← Back to Dashboard
          </Button>
        </div>

        {/* Overall Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Tests Completed</span>
                <span>{completedCount} of {totalTests}</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{completedCount}</div>
                  <div className="text-sm text-muted-foreground">Tests Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{totalTests - completedCount}</div>
                  <div className="text-sm text-muted-foreground">Tests Remaining</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{Math.round(overallProgress)}%</div>
                  <div className="text-sm text-muted-foreground">Progress</div>
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
                              <span>Questions:</span>
                              <span>{test.questions}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Time Limit:</span>
                              <span>{test.timeLimit} minutes</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Skill Area:</span>
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
                                Completed
                              </>
                            ) : (
                              'Start Test'
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
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-900">Focus on High Priority Areas</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Start with analytical skills tests to maximize your computational power score.
                </p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-900">Schedule Regular Practice</h3>
                <p className="text-sm text-green-700 mt-1">
                  Complete 1-2 tests per week for optimal skill development and retention.
                </p>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-medium text-purple-900">Connect with Your Mentor</h3>
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