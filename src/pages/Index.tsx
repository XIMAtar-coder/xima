
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useUser } from '../context/UserContext';
import { ChevronRight } from 'lucide-react';
import { PillarsShowcase } from '@/components/pillars/PillarsShowcase';
import { RecommendedChallenges } from '@/components/opportunities/RecommendedChallenges';
import { JobMatchesBlock } from '@/components/JobMatchesBlock';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useUser();
  const { t } = useTranslation();

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto px-4">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center py-16 md:py-24 lg:py-32 space-y-8 animate-fade-in">
          <div className="w-full max-w-4xl space-y-6">
            <div className="h-0.5 w-20 md:w-28 mx-auto rounded-[999px] gradient-accent" />
            
            <h1 className="text-[34px] md:text-[48px] lg:text-[56px] font-bold leading-tight text-foreground tracking-[-0.02em]">
              {t('hero.title')}
            </h1>
            
            <p className="text-[17px] md:text-[20px] text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t('hero.subtitle')}
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 pt-6">
              <Button 
                size="lg"
                className="text-[17px] px-8 py-6 rounded-[14px]"
                onClick={() => navigate('/ximatar-journey')}
              >
                {t('hero.cta')}
                <ChevronRight size={20} className="ml-2" />
              </Button>
              
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate('/business')}
                className="text-[17px] px-8 py-6 rounded-[14px]"
              >
                {t('hero.for_business')}
              </Button>
            </div>
          </div>
        </div>
        
        <PillarsShowcase />
        
        {isAuthenticated && (
          <div className="py-16 space-y-12">
            <div>
              <h2 className="text-[28px] font-semibold mb-2 text-foreground">{t('home.recommended_challenges.title')}</h2>
              <p className="text-muted-foreground mb-8">{t('home.recommended_challenges.subtitle')}</p>
              <RecommendedChallenges />
            </div>
            
            <div>
              <h2 className="text-[28px] font-semibold mb-2 text-foreground">{t('home.job_matches.title')}</h2>
              <p className="text-muted-foreground mb-8">{t('home.job_matches.subtitle')}</p>
              <JobMatchesBlock />
            </div>
          </div>
        )}
        
        <div id="cta-section" className="py-16 text-center">
          <h2 className="text-[28px] font-semibold mb-4 text-foreground">{t('cta_section.title')}</h2>
          <p className="text-[17px] text-muted-foreground max-w-2xl mx-auto mb-8">{t('cta_section.subtitle')}</p>
          
          <Button 
            size="lg"
            className="text-[17px] px-8 py-6 rounded-[14px]"
            onClick={() => navigate('/ximatar-journey')}
          >
            {t('cta_section.button')}
            <ChevronRight size={20} className="ml-2" />
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
