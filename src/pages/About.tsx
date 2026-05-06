import React from 'react';
import { useTranslation } from 'react-i18next';
import LandingLayout from '@/components/landing/LandingLayout';
import { Button } from '@/components/ui/button';
import { ChevronRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const pillars = [
    { key: '1', color: 'from-rose-500 to-rose-600' },
    { key: '2', color: 'from-purple-500 to-purple-600' },
    { key: '3', color: 'from-blue-500 to-blue-600' },
    { key: '4', color: 'from-emerald-500 to-emerald-600' },
    { key: '5', color: 'from-amber-500 to-amber-600' },
  ];

  const problemItems = [
    t('about.problem_item_1'),
    t('about.problem_item_2'),
    t('about.problem_item_3'),
    t('about.problem_item_4'),
    t('about.problem_item_5'),
  ];

  const candidateBenefits = [
    t('about.candidate_1'),
    t('about.candidate_2'),
    t('about.candidate_3'),
    t('about.candidate_4'),
    t('about.candidate_5'),
  ];

  const employerBenefits = [
    t('about.employer_1'),
    t('about.employer_2'),
    t('about.employer_3'),
    t('about.employer_4'),
    t('about.employer_5'),
  ];

  const stats = [
    { value: t('about.stat_1_value'), label: t('about.stat_1_label') },
    { value: t('about.stat_2_value'), label: t('about.stat_2_label') },
    { value: t('about.stat_3_value'), label: t('about.stat_3_label') },
    { value: t('about.stat_4_value'), label: t('about.stat_4_label') },
  ];

  return (
    <LandingLayout>
      <div className="container max-w-4xl mx-auto px-4 py-12 md:py-20">
        {/* Hero Section */}
        <div className="text-center mb-16 md:mb-20 animate-fade-in">
          <div 
            className="h-0.5 w-16 mx-auto rounded-full mb-8"
            style={{
              background: 'linear-gradient(90deg, hsl(var(--xima-blue)), hsl(var(--xima-teal)))'
            }}
          />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
            {t('about.eyebrow')}
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground leading-tight whitespace-pre-line">
            {t('about.hero_headline')}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            {t('about.hero_subheadline')}
          </p>
          <p className="text-lg italic text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('about.hero_pullquote')}
          </p>
        </div>

        {/* Origin Section */}
        <section className="mb-16 md:mb-20 animate-fade-in">
          <div className="premium-card rounded-2xl p-6 md:p-8 border-l-4 border-l-primary">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
              {t('about.origin_label')}
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4 whitespace-pre-line">
              {t('about.origin_headline')}
            </h2>
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                {t('about.origin_body_1')}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {t('about.origin_body_2')}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {t('about.origin_body_3')}
              </p>
            </div>
          </div>
        </section>
        
        {/* Problem Section */}
        <section className="mb-16 md:mb-20">
          <div className="premium-card rounded-2xl overflow-hidden">
            <div className="accent-gradient py-8 md:py-10 px-6 md:px-8">
              <p className="text-xs font-mono uppercase tracking-widest text-white/70 mb-3">
                {t('about.problem_label')}
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 whitespace-pre-line">
                {t('about.problem_headline')}
              </h2>
              <p className="text-lg text-white/90 leading-relaxed">
                {t('about.problem_subheadline')}
              </p>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <p className="text-foreground leading-relaxed text-base md:text-lg">
                {t('about.problem_body')}
              </p>
              
              <p className="text-muted-foreground leading-relaxed">
                {t('about.problem_list_intro')}
              </p>
              
              <ul className="space-y-3 pl-1">
                {problemItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-muted-foreground leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              
              <div className="pt-2 border-t border-border">
                <p className="text-foreground leading-relaxed font-medium">
                  {t('about.problem_solution')}
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Model Section */}
        <section className="mb-16 md:mb-20">
          <div className="text-center mb-10">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
              {t('about.model_label')}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 whitespace-pre-line">
              {t('about.model_headline')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t('about.model_body')}
            </p>
          </div>
          
          <div className="space-y-4 mb-8">
            {pillars.map((pillar) => (
              <div 
                key={pillar.key}
                className="premium-card p-5 rounded-xl"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-2 h-full min-h-[2rem] rounded-full bg-gradient-to-b ${pillar.color} flex-shrink-0 mt-1`} />
                  <div>
                    <h3 className="font-bold text-foreground mb-1">
                      {t(`about.pillar_${pillar.key}_name`)}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(`about.pillar_${pillar.key}_body`)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-lg italic text-muted-foreground text-center leading-relaxed max-w-2xl mx-auto">
            {t('about.model_pullquote')}
          </p>
        </section>

        {/* XIMAtar Section */}
        <section className="mb-16 md:mb-20">
          <div className="premium-card rounded-2xl p-6 md:p-8 border-l-4 border-l-primary">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
              {t('about.ximatar_label')}
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4 whitespace-pre-line">
              {t('about.ximatar_headline')}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('about.ximatar_body')}
            </p>
          </div>
        </section>

        {/* Value Section */}
        <section className="mb-16 md:mb-20">
          <div className="premium-card rounded-2xl p-6 md:p-10">
            <div className="text-center mb-10">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
                {t('about.value_label')}
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 whitespace-pre-line">
                {t('about.value_headline')}
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
                {t('about.value_subheadline')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12">
              {/* Candidates */}
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
                  {t('about.candidates_label')}
                </p>
                <h3 className="text-lg font-bold text-foreground mb-6 whitespace-pre-line">
                  {t('about.candidates_headline')}
                </h3>
                <ul className="space-y-4">
                  {candidateBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-muted-foreground leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Employers */}
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
                  {t('about.employers_label')}
                </p>
                <h3 className="text-lg font-bold text-foreground mb-6 whitespace-pre-line">
                  {t('about.employers_headline')}
                </h3>
                <ul className="space-y-4">
                  {employerBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-muted-foreground leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Numbers Section */}
        <section className="mb-16 md:mb-20">
          <div className="text-center mb-10">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
              {t('about.numbers_label')}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 whitespace-pre-line">
              {t('about.numbers_headline')}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              {t('about.numbers_subheadline')}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="premium-card rounded-xl p-6 text-center">
                <p className="text-4xl font-bold text-primary mb-2">{stat.value}</p>
                <p className="text-sm text-muted-foreground text-center leading-relaxed">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-16 md:mb-20">
          <div className="text-center mb-10">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
              {t('about.team_label')}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {t('about.team_headline')}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              {t('about.team_subheadline')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pietro Card */}
            <div className="premium-card border border-border rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-5">
                <img 
                  src="/avatars/pietro-cozzi.jpg" 
                  alt="Pietro Cozzi" 
                   className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
                />
                <div>
                  <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-1">
                    {t('about.founder_label')}
                  </span>
                  <h3 className="text-xl font-bold text-foreground">
                    {t('about.founder_name')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('about.founder_role')}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  {t('about.founder_bio_1')}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {t('about.founder_bio_2')}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {t('about.founder_bio_3')}
                </p>
              </div>
            </div>

            {/* Daniel Card */}
            <div className="premium-card border border-border rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-5">
                <img 
                  src="/avatars/daniel-cracau.jpg" 
                  alt="Dr. Daniel Cracau" 
                  className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                />
                <div>
                  <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-1">
                    {t('about.advisor_label')}
                  </span>
                  <h3 className="text-xl font-bold text-foreground">
                    {t('about.advisor_name')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('about.advisor_role')}
                  </p>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                <p className="text-muted-foreground leading-relaxed">
                  {t('about.advisor_bio_1')}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {t('about.advisor_bio_2')}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {t('about.advisor_bio_3')}
                </p>
              </div>
              <div className="border-t border-border pt-5">
                <p className="text-sm italic text-muted-foreground leading-relaxed">
                  {t('about.advisor_pullquote')}
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="text-center py-12 md:py-16">
          <div 
            className="h-0.5 w-16 mx-auto rounded-full mb-8"
            style={{
              background: 'linear-gradient(90deg, hsl(var(--xima-blue)), hsl(var(--xima-teal)))'
            }}
          />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 whitespace-pre-line">
            {t('about.cta_headline')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            {t('about.cta_body')}
          </p>
          
          <Button 
            size="lg"
            className="accent-gradient text-white hover:opacity-90 transition-opacity shadow-lg text-base md:text-lg px-8 py-6 rounded-xl"
            onClick={() => navigate('/register')}
          >
            {t('about.cta_button')}
            <ChevronRight size={20} className="ml-2" />
          </Button>
        </section>
      </div>
    </LandingLayout>
  );
};

export default About;
