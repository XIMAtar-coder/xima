import React, { useEffect, useState } from 'react';
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
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [animatedScores, setAnimatedScores] = useState<number[]>([0, 0, 0, 0, 0]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const sections = document.querySelectorAll('[data-animate]');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  // Animate progress bars when scoring section is visible
  useEffect(() => {
    if (visibleSections.has('scoring-section')) {
      const targetScores = [82, 75, 68, 91, 79];
      const duration = 1500;
      const steps = 30;
      const stepDuration = duration / steps;

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        setAnimatedScores(targetScores.map(score => Math.round(score * easeOut)));
        
        if (currentStep >= steps) {
          clearInterval(interval);
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }
  }, [visibleSections]);

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
      hoverBorder: 'hover:border-blue-500',
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
      hoverBorder: 'hover:border-emerald-500',
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
      hoverBorder: 'hover:border-amber-500',
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
      hoverBorder: 'hover:border-purple-500',
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
      hoverBorder: 'hover:border-rose-500',
      weight: '20%'
    }
  ];

  const ximatars = [
    { name: 'Lion', image: '/ximatars/lion.png', strength: 'Drive', style: t('guide.ximatars.lion', 'Executive Leader') },
    { name: 'Fox', image: '/ximatars/fox.png', strength: 'Creativity', style: t('guide.ximatars.fox', 'Strategic Opportunist') },
    { name: 'Owl', image: '/ximatars/owl.png', strength: 'Knowledge', style: t('guide.ximatars.owl', 'Wise Analyst') },
    { name: 'Dolphin', image: '/ximatars/dolphin.png', strength: 'Communication', style: t('guide.ximatars.dolphin', 'Team Facilitator') },
    { name: 'Cat', image: '/ximatars/cat.png', strength: 'Computational', style: t('guide.ximatars.cat', 'Independent Specialist') },
    { name: 'Bear', image: '/ximatars/bear.png', strength: 'Knowledge', style: t('guide.ximatars.bear', 'Reliable Guardian') },
    { name: 'Bee', image: '/ximatars/bee.png', strength: 'Drive', style: t('guide.ximatars.bee', 'Productive Worker') },
    { name: 'Wolf', image: '/ximatars/wolf.png', strength: 'Drive', style: t('guide.ximatars.wolf', 'Tactical Team Player') },
    { name: 'Parrot', image: '/ximatars/parrot.png', strength: 'Communication', style: t('guide.ximatars.parrot', 'Expressive Communicator') },
    { name: 'Elephant', image: '/ximatars/elephant.png', strength: 'Knowledge', style: t('guide.ximatars.elephant', 'Long-Term Strategist') },
    { name: 'Horse', image: '/ximatars/horse.png', strength: 'Drive', style: t('guide.ximatars.horse', 'Reliable Driver') },
    { name: 'Chameleon', image: '/ximatars/chameleon.png', strength: 'Balanced', style: t('guide.ximatars.chameleon', 'Adaptive Operator') }
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
      <div className="container max-w-6xl mx-auto py-8 px-4 md:px-8">
        {/* Hero Section */}
        <div 
          id="hero-section"
          data-animate
          className={`text-center mb-16 transition-all duration-700 ${
            visibleSections.has('hero-section') || visibleSections.size === 0 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <Badge 
            variant="outline" 
            className="mb-4 px-4 py-1 animate-[fade-in_0.5s_ease-out] hover:scale-105 transition-transform cursor-default"
          >
            <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
            {t('guide.badge', 'Assessment Guide')}
          </Badge>
          <h1 className="text-[28px] md:text-[40px] xl:text-[48px] font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent animate-[fade-in_0.6s_ease-out]">
            {t('guide.title', 'How XIMAtar Assessment Works')}
          </h1>
          <p className="text-[14px] md:text-[17px] xl:text-xl text-muted-foreground max-w-3xl mx-auto animate-[fade-in_0.7s_ease-out]">
            {t('guide.subtitle', 'Discover your unique professional archetype through our comprehensive assessment system based on 5 core pillars.')}
          </p>
        </div>

        {/* Journey Flow */}
        <section 
          id="journey-section"
          data-animate
          className={`mb-20 transition-all duration-700 delay-100 ${
            visibleSections.has('journey-section') 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-[20px] md:text-[24px] xl:text-[28px] font-bold text-center mb-10">
            {t('guide.journey_title', 'Your Assessment Journey')}
          </h2>
          
          <div className="relative">
            {/* Animated Connection Line */}
            <div 
              className={`hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transform -translate-y-1/2 z-0 transition-all duration-1000 ${
                visibleSections.has('journey-section') ? 'scale-x-100' : 'scale-x-0'
              }`}
              style={{ transformOrigin: 'left' }}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
              {journeySteps.map((step, index) => (
                <Card 
                  key={index} 
                  className={`p-6 text-center bg-background transition-all duration-500 hover:shadow-xl hover:-translate-y-2 group ${
                    visibleSections.has('journey-section') 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <div className={`w-16 h-16 ${step.color} rounded-full flex items-center justify-center mx-auto mb-4 text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
                    <step.icon className="w-8 h-8 transition-transform group-hover:scale-110" />
                  </div>
                  <Badge variant="secondary" className="mb-3 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    {t('guide.step', 'Step')} {step.step}
                  </Badge>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {index < journeySteps.length - 1 && (
                    <ChevronRight className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground animate-pulse" />
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* The 5 Pillars */}
        <section 
          id="pillars-section"
          data-animate
          className={`mb-20 transition-all duration-700 ${
            visibleSections.has('pillars-section') 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
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
                className={`p-6 border-2 ${pillar.borderColor} ${pillar.bgColor} ${pillar.hoverBorder} transition-all duration-500 hover:shadow-xl hover:-translate-y-1 group cursor-default ${
                  visibleSections.has('pillars-section') 
                    ? 'opacity-100 translate-y-0 scale-100' 
                    : 'opacity-0 translate-y-8 scale-95'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-full ${pillar.bgColor} transition-all duration-300 group-hover:scale-110 group-hover:rotate-6`}>
                    <pillar.icon className={`w-6 h-6 ${pillar.color} transition-transform`} />
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
        <section 
          id="scoring-section"
          data-animate
          className={`mb-20 transition-all duration-700 ${
            visibleSections.has('scoring-section') 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <Card className="p-8 bg-gradient-to-br from-muted/30 to-muted/10 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-8 h-8 text-primary animate-pulse" />
              <h2 className="text-2xl font-bold">
                {t('guide.scoring_title', 'Example Pillar Scores')}
              </h2>
            </div>
            
            <p className="text-muted-foreground mb-8">
              {t('guide.scoring_description', 'Each pillar is scored from 0-10 based on your assessment responses. Here\'s an example profile:')}
            </p>

            <div className="space-y-6">
              {scoringExample.map((item, index) => (
                <div key={index} className="space-y-2 group">
                  <div className="flex justify-between items-center">
                    <span className="font-medium group-hover:text-primary transition-colors">{item.pillar}</span>
                    <span className="text-lg font-bold text-primary transition-all group-hover:scale-110">
                      {(animatedScores[index] / 10).toFixed(1)}/{item.max}
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${animatedScores[index]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div 
              className={`mt-8 p-4 bg-primary/10 rounded-lg border border-primary/20 transition-all duration-500 ${
                visibleSections.has('scoring-section') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
              style={{ transitionDelay: '800ms' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary animate-bounce" />
                <span className="font-semibold inline-flex items-center gap-2">{t('guide.result', 'Result')}: Fox <img src="/ximatars/fox.png" alt="XIMAtar Fox" className="h-6 w-6 rounded-full object-cover bg-muted/40 ring-1 ring-border/40 inline-block" /></span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('guide.result_explanation', 'With highest Creativity (9.1) and strong Computational Power (8.2), this profile matches the Fox archetype - a Strategic Opportunist who excels at innovative problem-solving.')}
              </p>
            </div>
          </Card>
        </section>

        {/* XIMAtar Grid */}
        <section 
          id="ximatars-section"
          data-animate
          className={`mb-20 transition-all duration-700 ${
            visibleSections.has('ximatars-section') 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
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
              <Card 
                key={index} 
                className={`p-4 text-center transition-all duration-500 hover:shadow-xl cursor-default group ${
                  visibleSections.has('ximatars-section') 
                    ? 'opacity-100 translate-y-0 scale-100' 
                    : 'opacity-0 translate-y-8 scale-90'
                }`}
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                  <img 
                    src={ximatar.image} 
                    alt={`XIMAtar ${ximatar.name}`}
                    className="h-10 w-10 rounded-full object-cover bg-muted/40 ring-1 ring-border/40 p-0.5 transition-transform duration-300 group-hover:scale-125"
                  />
                </div>
                <h4 className="font-semibold group-hover:text-primary transition-colors">{ximatar.name}</h4>
                <p className="text-xs text-muted-foreground mb-2">{ximatar.style}</p>
                <Badge variant="outline" className="text-xs transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                  {ximatar.strength}
                </Badge>
              </Card>
            ))}
          </div>
        </section>

        {/* Assignment Logic */}
        <section 
          id="logic-section"
          data-animate
          className={`mb-20 transition-all duration-700 ${
            visibleSections.has('logic-section') 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-bold">
                {t('guide.logic_title', 'How XIMAtar Assignment Works')}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                {[
                  { num: 1, title: t('guide.logic_step1', 'Pillar Score Calculation'), desc: t('guide.logic_step1_desc', 'Your responses to 21 multiple-choice questions and 2 open-ended questions are analyzed to calculate scores for each of the 5 pillars.') },
                  { num: 2, title: t('guide.logic_step2', 'Pattern Matching'), desc: t('guide.logic_step2_desc', 'Your pillar profile is compared against the ideal vectors for each of the 12 XIMatars using distance algorithms and weighted matching.') }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`mb-6 transition-all duration-500 ${
                      visibleSections.has('logic-section') ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                    }`}
                    style={{ transitionDelay: `${idx * 200}ms` }}
                  >
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110">
                        {item.num}
                      </span>
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div>
                {[
                  { num: 3, title: t('guide.logic_step3', 'Dominant Pillar Bonus'), desc: t('guide.logic_step3_desc', 'A 25% matching bonus is applied when your strongest pillar aligns with a XIMAtar\'s primary characteristic, ensuring authentic matches.') },
                  { num: 4, title: t('guide.logic_step4', 'Final Assignment'), desc: t('guide.logic_step4_desc', 'The XIMAtar with the closest match to your unique profile becomes your archetype, along with personalized insights about your strengths and growth areas.') }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`mb-6 transition-all duration-500 ${
                      visibleSections.has('logic-section') ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                    }`}
                    style={{ transitionDelay: `${(idx + 2) * 200}ms` }}
                  >
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110">
                        {item.num}
                      </span>
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* CTA */}
        <section 
          id="cta-section"
          data-animate
          className={`text-center transition-all duration-700 ${
            visibleSections.has('cta-section') 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-8 scale-95'
          }`}
        >
          <Card className="p-10 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
            <Users className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
            <h2 className="text-2xl font-bold mb-4">
              {t('guide.cta_title', 'Ready to Discover Your XIMAtar?')}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              {t('guide.cta_description', 'Start your assessment journey now and unlock personalized insights about your professional potential.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="group transition-all hover:scale-105 hover:shadow-lg">
                <Link to="/ximatar-journey">
                  {t('guide.cta_button', 'Start Assessment')}
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="hover:scale-105 transition-transform">
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
