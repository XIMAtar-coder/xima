import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Brain, 
  ClipboardCheck, 
  Award,
  ArrowRight,
  MessageCircle,
  BookOpen,
  Lightbulb,
  Zap,
  Target,
  Users,
  Sparkles,
  ChevronRight,
  TrendingUp,
  BarChart3
} from 'lucide-react';

const AssessmentGuide = () => {
  const { t } = useTranslation();

  const journeySteps = [
    {
      icon: FileText,
      step: 1,
      title: t('guide.step1.title', 'CV Upload'),
      description: t('guide.step1.description', 'Upload your CV for AI-powered analysis of your professional experience and skills.'),
      color: 'bg-blue-500'
    },
    {
      icon: ClipboardCheck,
      step: 2,
      title: t('guide.step2.title', 'Baseline Assessment'),
      description: t('guide.step2.description', 'Select your field and complete the initial evaluation with multiple-choice questions.'),
      color: 'bg-purple-500'
    },
    {
      icon: Brain,
      step: 3,
      title: t('guide.step3.title', 'Deep Assessment'),
      description: t('guide.step3.description', 'Answer 21 questions plus open responses to reveal your unique profile.'),
      color: 'bg-indigo-500'
    },
    {
      icon: Award,
      step: 4,
      title: t('guide.step4.title', 'XIMAtar Assignment'),
      description: t('guide.step4.description', 'Receive your personalized XIMAtar archetype based on your pillar scores.'),
      color: 'bg-emerald-500'
    }
  ];

  const pillars = [
    {
      icon: Brain,
      key: 'computational_power',
      name: t('pillars.computational.name', 'Computational Power'),
      description: t('guide.pillars.computational', 'Analytical thinking, problem-solving, and data-driven decision making.'),
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      weight: '20%'
    },
    {
      icon: MessageCircle,
      key: 'communication',
      name: t('pillars.communication.name', 'Communication'),
      description: t('guide.pillars.communication', 'Clarity of expression, active listening, and collaborative dialogue.'),
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      weight: '20%'
    },
    {
      icon: BookOpen,
      key: 'knowledge',
      name: t('pillars.knowledge.name', 'Knowledge'),
      description: t('guide.pillars.knowledge', 'Domain expertise, continuous learning, and wisdom application.'),
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      weight: '20%'
    },
    {
      icon: Lightbulb,
      key: 'creativity',
      name: t('pillars.creativity.name', 'Creativity'),
      description: t('guide.pillars.creativity', 'Innovation, lateral thinking, and novel solution generation.'),
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      weight: '20%'
    },
    {
      icon: Zap,
      key: 'drive',
      name: t('pillars.drive.name', 'Drive'),
      description: t('guide.pillars.drive', 'Motivation, resilience, and goal-oriented determination.'),
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      weight: '20%'
    }
  ];

  const ximatars = [
    { name: 'Lion', emoji: '🦁', strength: 'Drive', style: t('guide.ximatars.lion', 'Executive Leader') },
    { name: 'Fox', emoji: '🦊', strength: 'Creativity', style: t('guide.ximatars.fox', 'Strategic Opportunist') },
    { name: 'Owl', emoji: '🦉', strength: 'Knowledge', style: t('guide.ximatars.owl', 'Wise Analyst') },
    { name: 'Dolphin', emoji: '🐬', strength: 'Communication', style: t('guide.ximatars.dolphin', 'Team Facilitator') },
    { name: 'Cat', emoji: '🐱', strength: 'Computational', style: t('guide.ximatars.cat', 'Independent Specialist') },
    { name: 'Bear', emoji: '🐻', strength: 'Knowledge', style: t('guide.ximatars.bear', 'Reliable Guardian') },
    { name: 'Bee', emoji: '🐝', strength: 'Drive', style: t('guide.ximatars.bee', 'Productive Worker') },
    { name: 'Wolf', emoji: '🐺', strength: 'Drive', style: t('guide.ximatars.wolf', 'Tactical Team Player') },
    { name: 'Parrot', emoji: '🦜', strength: 'Communication', style: t('guide.ximatars.parrot', 'Expressive Communicator') },
    { name: 'Elephant', emoji: '🐘', strength: 'Knowledge', style: t('guide.ximatars.elephant', 'Long-Term Strategist') },
    { name: 'Horse', emoji: '🐴', strength: 'Drive', style: t('guide.ximatars.horse', 'Reliable Driver') },
    { name: 'Chameleon', emoji: '🦎', strength: 'Balanced', style: t('guide.ximatars.chameleon', 'Adaptive Operator') }
  ];

  const scoringExample = [
    { pillar: 'Computational Power', score: 8.2, max: 10 },
    { pillar: 'Communication', score: 7.5, max: 10 },
    { pillar: 'Knowledge', score: 6.8, max: 10 },
    { pillar: 'Creativity', score: 9.1, max: 10 },
    { pillar: 'Drive', score: 7.9, max: 10 }
  ];

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 px-4 py-1">
            <Sparkles className="w-4 h-4 mr-2" />
            {t('guide.badge', 'Assessment Guide')}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t('guide.title', 'How XIMAtar Assessment Works')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('guide.subtitle', 'Discover your unique professional archetype through our comprehensive assessment system based on 5 core pillars.')}
          </p>
        </div>

        {/* Journey Flow */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-10">
            {t('guide.journey_title', 'Your Assessment Journey')}
          </h2>
          
          <div className="relative">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transform -translate-y-1/2 z-0" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
              {journeySteps.map((step, index) => (
                <Card key={index} className="p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1 bg-background">
                  <div className={`w-16 h-16 ${step.color} rounded-full flex items-center justify-center mx-auto mb-4 text-white`}>
                    <step.icon className="w-8 h-8" />
                  </div>
                  <Badge variant="secondary" className="mb-3">
                    {t('guide.step', 'Step')} {step.step}
                  </Badge>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {index < journeySteps.length - 1 && (
                    <ChevronRight className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* The 5 Pillars */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">
              {t('guide.pillars_title', 'The 5 XIMA Pillars')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('guide.pillars_description', 'Each pillar represents a core dimension of professional capability. Your unique combination determines your XIMAtar.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pillars.map((pillar, index) => (
              <Card 
                key={index} 
                className={`p-6 border-2 ${pillar.borderColor} ${pillar.bgColor} hover:shadow-lg transition-all`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-full ${pillar.bgColor}`}>
                    <pillar.icon className={`w-6 h-6 ${pillar.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{pillar.name}</h3>
                    <Badge variant="outline" className="text-xs">{pillar.weight}</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{pillar.description}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Scoring Example */}
        <section className="mb-20">
          <Card className="p-8 bg-gradient-to-br from-muted/30 to-muted/10">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-bold">
                {t('guide.scoring_title', 'Example Pillar Scores')}
              </h2>
            </div>
            
            <p className="text-muted-foreground mb-8">
              {t('guide.scoring_description', 'Each pillar is scored from 0-10 based on your assessment responses. Here\'s an example profile:')}
            </p>

            <div className="space-y-6">
              {scoringExample.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.pillar}</span>
                    <span className="text-lg font-bold text-primary">{item.score}/{item.max}</span>
                  </div>
                  <Progress value={(item.score / item.max) * 100} className="h-3" />
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="font-semibold">{t('guide.result', 'Result')}: Fox 🦊</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('guide.result_explanation', 'With highest Creativity (9.1) and strong Computational Power (8.2), this profile matches the Fox archetype - a Strategic Opportunist who excels at innovative problem-solving.')}
              </p>
            </div>
          </Card>
        </section>

        {/* XIMAtar Grid */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">
              {t('guide.ximatars_title', 'The 12 XIMAtar Archetypes')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('guide.ximatars_description', 'Each XIMAtar represents a unique combination of strengths and work style. Discover which archetype matches your profile.')}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {ximatars.map((ximatar, index) => (
              <Card key={index} className="p-4 text-center hover:shadow-md transition-all hover:scale-105 cursor-default">
                <span className="text-4xl mb-2 block">{ximatar.emoji}</span>
                <h4 className="font-semibold">{ximatar.name}</h4>
                <p className="text-xs text-muted-foreground mb-2">{ximatar.style}</p>
                <Badge variant="outline" className="text-xs">
                  {ximatar.strength}
                </Badge>
              </Card>
            ))}
          </div>
        </section>

        {/* Assignment Logic */}
        <section className="mb-20">
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-bold">
                {t('guide.logic_title', 'How XIMAtar Assignment Works')}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">1</span>
                  {t('guide.logic_step1', 'Pillar Score Calculation')}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {t('guide.logic_step1_desc', 'Your responses to 21 multiple-choice questions and 2 open-ended questions are analyzed to calculate scores for each of the 5 pillars.')}
                </p>

                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">2</span>
                  {t('guide.logic_step2', 'Pattern Matching')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('guide.logic_step2_desc', 'Your pillar profile is compared against the ideal vectors for each of the 12 XIMatars using distance algorithms and weighted matching.')}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">3</span>
                  {t('guide.logic_step3', 'Dominant Pillar Bonus')}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {t('guide.logic_step3_desc', 'A 25% matching bonus is applied when your strongest pillar aligns with a XIMAtar\'s primary characteristic, ensuring authentic matches.')}
                </p>

                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">4</span>
                  {t('guide.logic_step4', 'Final Assignment')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('guide.logic_step4_desc', 'The XIMAtar with the closest match to your unique profile becomes your archetype, along with personalized insights about your strengths and growth areas.')}
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center">
          <Card className="p-10 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <Users className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-4">
              {t('guide.cta_title', 'Ready to Discover Your XIMAtar?')}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              {t('guide.cta_description', 'Start your assessment journey now and unlock personalized insights about your professional potential.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/ximatar-journey">
                  {t('guide.cta_button', 'Start Assessment')}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/how-it-works">
                  {t('guide.learn_more', 'Learn More')}
                </Link>
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
};

export default AssessmentGuide;
