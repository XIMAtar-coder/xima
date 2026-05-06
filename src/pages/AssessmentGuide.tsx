import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import LandingLayout from '@/components/landing/LandingLayout';
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
  BarChart3,
  Shield
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
      badge: t('assessmentGuide.step1_badge'),
      title: t('assessmentGuide.step1_title'),
      description: t('assessmentGuide.step1_body'),
      color: 'bg-blue-500'
    },
    {
      icon: ClipboardCheck,
      badge: t('assessmentGuide.step2_badge'),
      title: t('assessmentGuide.step2_title'),
      description: t('assessmentGuide.step2_body'),
      color: 'bg-purple-500'
    },
    {
      icon: Brain,
      badge: t('assessmentGuide.step3_badge'),
      title: t('assessmentGuide.step3_title'),
      description: t('assessmentGuide.step3_body'),
      color: 'bg-indigo-500'
    },
    {
      icon: Award,
      badge: t('assessmentGuide.step4_badge'),
      title: t('assessmentGuide.step4_title'),
      description: t('assessmentGuide.step4_body'),
      color: 'bg-emerald-500'
    }
  ];

  const pillars = [
    {
      icon: Brain,
      name: t('assessmentGuide.pillar1_name'),
      description: t('assessmentGuide.pillar1_body'),
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      hoverBorder: 'hover:border-blue-500'
    },
    {
      icon: MessageCircle,
      name: t('assessmentGuide.pillar2_name'),
      description: t('assessmentGuide.pillar2_body'),
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      hoverBorder: 'hover:border-emerald-500'
    },
    {
      icon: BookOpen,
      name: t('assessmentGuide.pillar3_name'),
      description: t('assessmentGuide.pillar3_body'),
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      hoverBorder: 'hover:border-amber-500'
    },
    {
      icon: Lightbulb,
      name: t('assessmentGuide.pillar4_name'),
      description: t('assessmentGuide.pillar4_body'),
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      hoverBorder: 'hover:border-purple-500'
    },
    {
      icon: Zap,
      name: t('assessmentGuide.pillar5_name'),
      description: t('assessmentGuide.pillar5_body'),
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      hoverBorder: 'hover:border-rose-500'
    }
  ];

  const ximatars = [
    { name: t('assessmentGuide.archetype_lion_name'), image: '/ximatars/lion.png', strength: t('assessmentGuide.archetype_lion_pillar'), style: t('assessmentGuide.archetype_lion_role') },
    { name: t('assessmentGuide.archetype_fox_name'), image: '/ximatars/fox.png', strength: t('assessmentGuide.archetype_fox_pillar'), style: t('assessmentGuide.archetype_fox_role') },
    { name: t('assessmentGuide.archetype_owl_name'), image: '/ximatars/owl.png', strength: t('assessmentGuide.archetype_owl_pillar'), style: t('assessmentGuide.archetype_owl_role') },
    { name: t('assessmentGuide.archetype_dolphin_name'), image: '/ximatars/dolphin.png', strength: t('assessmentGuide.archetype_dolphin_pillar'), style: t('assessmentGuide.archetype_dolphin_role') },
    { name: t('assessmentGuide.archetype_cat_name'), image: '/ximatars/cat.png', strength: t('assessmentGuide.archetype_cat_pillar'), style: t('assessmentGuide.archetype_cat_role') },
    { name: t('assessmentGuide.archetype_bear_name'), image: '/ximatars/bear.png', strength: t('assessmentGuide.archetype_bear_pillar'), style: t('assessmentGuide.archetype_bear_role') },
    { name: t('assessmentGuide.archetype_bee_name'), image: '/ximatars/bee.png', strength: t('assessmentGuide.archetype_bee_pillar'), style: t('assessmentGuide.archetype_bee_role') },
    { name: t('assessmentGuide.archetype_wolf_name'), image: '/ximatars/wolf.png', strength: t('assessmentGuide.archetype_wolf_pillar'), style: t('assessmentGuide.archetype_wolf_role') },
    { name: t('assessmentGuide.archetype_parrot_name'), image: '/ximatars/parrot.png', strength: t('assessmentGuide.archetype_parrot_pillar'), style: t('assessmentGuide.archetype_parrot_role') },
    { name: t('assessmentGuide.archetype_elephant_name'), image: '/ximatars/elephant.png', strength: t('assessmentGuide.archetype_elephant_pillar'), style: t('assessmentGuide.archetype_elephant_role') },
    { name: t('assessmentGuide.archetype_horse_name'), image: '/ximatars/horse.png', strength: t('assessmentGuide.archetype_horse_pillar'), style: t('assessmentGuide.archetype_horse_role') },
    { name: t('assessmentGuide.archetype_chameleon_name'), image: '/ximatars/chameleon.png', strength: t('assessmentGuide.archetype_chameleon_pillar'), style: t('assessmentGuide.archetype_chameleon_role') }
  ];

  const scoringExample = [
    { pillar: t('assessmentGuide.pillar1_name'), score: 8.2, max: 10 },
    { pillar: t('assessmentGuide.pillar2_name'), score: 7.5, max: 10 },
    { pillar: t('assessmentGuide.pillar3_name'), score: 6.8, max: 10 },
    { pillar: t('assessmentGuide.pillar4_name'), score: 9.1, max: 10 },
    { pillar: t('assessmentGuide.pillar5_name'), score: 7.9, max: 10 }
  ];

  const governanceItems = [
    { title: t('assessmentGuide.governance_1_title'), body: t('assessmentGuide.governance_1_body') },
    { title: t('assessmentGuide.governance_2_title'), body: t('assessmentGuide.governance_2_body') },
    { title: t('assessmentGuide.governance_3_title'), body: t('assessmentGuide.governance_3_body') },
    { title: t('assessmentGuide.governance_4_title'), body: t('assessmentGuide.governance_4_body') }
  ];

  return (
    <LandingLayout>
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
            {t('assessmentGuide.eyebrow')}
          </Badge>
          <h1 className="text-[28px] md:text-[40px] xl:text-[48px] font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent animate-[fade-in_0.6s_ease-out] whitespace-pre-line">
            {t('assessmentGuide.hero_headline')}
          </h1>
          <p className="text-[14px] md:text-[17px] xl:text-xl text-muted-foreground max-w-3xl mx-auto animate-[fade-in_0.7s_ease-out]">
            {t('assessmentGuide.hero_subheadline')}
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
          <p className="text-xs font-mono tracking-widest text-primary uppercase text-center mb-2">
            {t('assessmentGuide.journey_label')}
          </p>
          <h2 className="text-[20px] md:text-[24px] xl:text-[28px] font-bold text-center mb-2">
            {t('assessmentGuide.journey_headline')}
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            {t('assessmentGuide.journey_subheadline')}
          </p>
          
          <div className="relative">
            {/* Animated Connection Line */}
            <div 
              className={`hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transform -translate-y-1/2 z-0 transition-all duration-1000 ${
                visibleSections.has('journey-section') ? 'scale-x-100' : 'scale-x-0'
              }`}
              style={{ transformOrigin: 'left' }}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 relative z-10">
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
                    {step.badge}
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
            <p className="text-xs font-mono tracking-widest text-primary uppercase mb-2">
              {t('assessmentGuide.pillars_label')}
            </p>
            <h2 className="text-[20px] md:text-[24px] xl:text-[28px] font-bold mb-4">
              {t('assessmentGuide.pillars_headline')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('assessmentGuide.pillars_subheadline')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                  <h3 className="font-semibold">{pillar.name}</h3>
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
            <p className="text-xs font-mono tracking-widest text-primary uppercase mb-2">
              {t('assessmentGuide.example_label')}
            </p>
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-8 h-8 text-primary animate-pulse" />
              <h2 className="text-2xl font-bold">
                {t('assessmentGuide.example_headline')}
              </h2>
            </div>
            
            <p className="text-muted-foreground mb-8">
              {t('assessmentGuide.example_body')}
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
                <span className="font-semibold inline-flex items-center gap-2">{t('assessmentGuide.example_result_label')} <img src="/ximatars/fox.png" alt="XIMAtar Fox" className="h-6 w-6 rounded-full object-cover bg-muted/40 ring-1 ring-border/40 inline-block" /></span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('assessmentGuide.example_result_body')}
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
            <p className="text-xs font-mono tracking-widest text-primary uppercase mb-2">
              {t('assessmentGuide.archetypes_label')}
            </p>
            <h2 className="text-3xl font-bold mb-4">
              {t('assessmentGuide.archetypes_headline')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('assessmentGuide.archetypes_subheadline')}
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

        {/* Governance Section */}
        <section 
          id="governance-section"
          data-animate
          className={`mb-20 transition-all duration-700 ${
            visibleSections.has('governance-section') 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12">
            <p className="text-xs font-mono tracking-widest text-primary uppercase mb-2">
              {t('assessmentGuide.governance_label')}
            </p>
            <h2 className="text-[20px] md:text-[24px] xl:text-[28px] font-bold mb-2">
              {t('assessmentGuide.governance_headline')}
            </h2>
            <p className="text-muted-foreground mb-8">
              {t('assessmentGuide.governance_subheadline')}
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {governanceItems.map((item, index) => (
                <div 
                  key={index}
                  className={`space-y-2 transition-all duration-500 ${
                    visibleSections.has('governance-section') 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                    <h3 className="font-semibold">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>

            <blockquote className="text-center italic text-muted-foreground mt-8 pt-6 border-t border-border/50 text-[15px] md:text-[17px]">
              {t('assessmentGuide.governance_pullquote')}
            </blockquote>
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
            <p className="text-xs font-mono tracking-widest text-primary uppercase mb-2">
              {t('assessmentGuide.assignment_label')}
            </p>
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-bold">
                {t('assessmentGuide.assignment_headline')}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                {[
                  { num: 1, title: t('assessmentGuide.assignment_step1_title'), desc: t('assessmentGuide.assignment_step1_body') },
                  { num: 2, title: t('assessmentGuide.assignment_step2_title'), desc: t('assessmentGuide.assignment_step2_body') }
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
                  { num: 3, title: t('assessmentGuide.assignment_step3_title'), desc: t('assessmentGuide.assignment_step3_body') },
                  { num: 4, title: t('assessmentGuide.assignment_step4_title'), desc: t('assessmentGuide.assignment_step4_body') }
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
              {t('assessmentGuide.cta_headline')}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              {t('assessmentGuide.cta_body')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="group transition-all hover:scale-105 hover:shadow-lg">
                <Link to="/ximatar-journey">
                  {t('assessmentGuide.cta_primary')}
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="hover:scale-105 transition-transform">
                <Link to="/how-it-works">
                  {t('assessmentGuide.cta_secondary')}
                </Link>
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </LandingLayout>
  );
};

export default AssessmentGuide;
