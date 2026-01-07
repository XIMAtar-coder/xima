import React from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { ChevronRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const pillars = [
    { key: 'experience', color: 'from-blue-500 to-blue-600' },
    { key: 'intelligence', color: 'from-purple-500 to-purple-600' },
    { key: 'motivation', color: 'from-rose-500 to-rose-600' },
    { key: 'attitude', color: 'from-emerald-500 to-emerald-600' },
    { key: 'analysis', color: 'from-amber-500 to-amber-600' },
  ];

  const mismatches = [
    t('about.mismatch_1'),
    t('about.mismatch_2'),
    t('about.mismatch_3'),
    t('about.mismatch_4'),
    t('about.mismatch_5'),
  ];

  const jobSeekerBenefits = [
    t('about.job_seekers_1'),
    t('about.job_seekers_2'),
    t('about.job_seekers_3'),
    t('about.job_seekers_4'),
    t('about.job_seekers_5'),
  ];

  const employerBenefits = [
    t('about.employers_1'),
    t('about.employers_2'),
    t('about.employers_3'),
    t('about.employers_4'),
    t('about.employers_5'),
  ];

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto px-4 py-12 md:py-20">
        {/* Hero Section */}
        <div className="text-center mb-16 md:mb-20 animate-fade-in">
          <div 
            className="h-0.5 w-16 mx-auto rounded-full mb-8"
            style={{
              background: 'linear-gradient(90deg, hsl(var(--xima-blue)), hsl(var(--xima-teal)))'
            }}
          />
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground leading-tight">
            {t('about.title')}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('about.subtitle')}
          </p>
        </div>
        
        {/* Problem Section */}
        <section className="mb-16 md:mb-20">
          <div className="premium-card rounded-2xl overflow-hidden">
            <div className="accent-gradient py-8 md:py-10 px-6 md:px-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                {t('about.match_problem_title')}
              </h2>
              <p className="text-lg text-white/90 leading-relaxed">
                {t('about.match_problem_subtitle')}
              </p>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <p className="text-foreground leading-relaxed text-base md:text-lg">
                {t('about.match_problem_description')}
              </p>
              
              <p className="text-muted-foreground leading-relaxed">
                {t('about.match_leads_to')}
              </p>
              
              <ul className="space-y-3 pl-1">
                {mismatches.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-muted-foreground leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              
              <div className="pt-2 border-t border-border">
                <p className="text-foreground leading-relaxed font-medium">
                  {t('about.solution_description')}
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Approach Section */}
        <section className="mb-16 md:mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              {t('about.approach_title')}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Five Pillars */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground">
                {t('about.five_pillars_title')}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('about.five_pillars_description')}
              </p>
              
              <div className="space-y-3">
                {pillars.map((pillar) => (
                  <div 
                    key={pillar.key}
                    className="premium-card p-4 rounded-xl flex items-center gap-3"
                  >
                    <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${pillar.color}`} />
                    <span className="font-semibold text-foreground">
                      {t(`about.${pillar.key}_pillar`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Ximatar */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground">
                {t('about.ximatar_title')}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('about.ximatar_description')}
              </p>
              
              <div className="premium-card p-5 rounded-xl border-l-4 border-l-primary">
                <h4 className="font-semibold text-foreground mb-2">
                  {t('about.why_animals_title')}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('about.why_animals_description')}
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">
                    {t('about.features_title')}
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {t('about.features_description')}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-foreground mb-2">
                    {t('about.mentor_matching_title')}
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {t('about.mentor_matching_description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Benefits Section */}
        <section className="mb-16 md:mb-20">
          <div className="premium-card rounded-2xl p-6 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
              {t('about.benefits_title')}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12">
              {/* Job Seekers */}
              <div>
                <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full accent-gradient flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  {t('about.job_seekers_title')}
                </h3>
                <ul className="space-y-4">
                  {jobSeekerBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-muted-foreground leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Employers */}
              <div>
                <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full accent-gradient flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  {t('about.employers_title')}
                </h3>
                <ul className="space-y-4">
                  {employerBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-muted-foreground leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
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
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            {t('about.ready_title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            {t('about.ready_subtitle')}
          </p>
          
          <Button 
            size="lg"
            className="accent-gradient text-white hover:opacity-90 transition-opacity shadow-lg text-base md:text-lg px-8 py-6 rounded-xl"
            onClick={() => navigate('/register')}
          >
            {t('about.get_started')}
            <ChevronRight size={20} className="ml-2" />
          </Button>
        </section>
      </div>
    </MainLayout>
  );
};

export default About;
