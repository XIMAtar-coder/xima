
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useUser } from '../context/UserContext';
import { ChevronRight } from 'lucide-react';
import { PillarsShowcase } from '@/components/pillars/PillarsShowcase';

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
            {/* Gradient accent line - wider on desktop */}
            <div 
              className="h-0.5 w-20 md:w-28 mx-auto rounded-full gradient-accent"
              style={{
                background: 'linear-gradient(90deg, hsl(var(--xima-blue)), hsl(var(--xima-teal)))'
              }}
            />
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
              {t('hero.title')}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('hero.subtitle')}
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 pt-6">
              <Button 
                size="lg"
                className="accent-gradient text-white hover:opacity-90 transition-opacity shadow-lg text-base md:text-lg px-8 py-6 rounded-xl dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]"
                onClick={() => navigate('/ximatar-journey')}
              >
                {t('hero.cta')}
                <ChevronRight size={20} className="ml-2" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/about')}
                className="border-2 border-transparent text-base md:text-lg px-8 py-6 rounded-xl relative overflow-hidden group bg-gradient-to-r from-[hsl(var(--xima-blue))] to-[hsl(var(--xima-teal))] bg-clip-padding"
                style={{
                  borderImage: 'linear-gradient(90deg, hsl(var(--xima-blue)), hsl(var(--xima-teal))) 1'
                }}
              >
                <span className="relative z-10">{t('hero.learn_more')}</span>
              </Button>
            </div>
          </div>
        </div>
        
        <PillarsShowcase />
        
        <div id="cta-section" className="py-16 text-center">
          <h2 className="text-3xl font-bold mb-4 text-foreground">{t('cta_section.title')}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {t('cta_section.subtitle')}
          </p>
          
          <Button 
            size="lg"
            className="accent-gradient text-white hover:opacity-90 transition-opacity shadow-lg text-base md:text-lg px-8 py-6 rounded-xl dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]"
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
