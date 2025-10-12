
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
      <div className="container max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-8 py-12">
          <div className="md:w-1/2 space-y-6 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-800">
              {t('hero.title')}
            </h1>
            <p className="text-lg text-gray-600">
              {t('hero.subtitle')}
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
              <Button 
                size="lg"
                className="bg-[#4171d6] hover:bg-[#2950a3] shadow-lg text-lg px-8 py-4"
                onClick={() => navigate('/ximatar-journey')}
              >
                {t('hero.cta')}
                <ChevronRight size={20} className="ml-2" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/about')}
                className="border-gray-300 text-gray-700 shadow-sm px-8 py-4"
              >
                {t('hero.learn_more')}
              </Button>
            </div>
          </div>
          
          <div className="md:w-1/2 flex justify-center">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-0 bg-[#4171d6] rounded-full filter blur-3xl opacity-10 animate-pulse-slow"></div>
              <img 
                src="/lovable-uploads/b0df6e4e-eb14-46ad-9f03-6707af82d4c6.png" 
                alt="XIMA Logo" 
                className="relative z-10 w-full h-auto max-w-sm mx-auto"
              />
            </div>
          </div>
        </div>
        
        <PillarsShowcase />
        
        <div id="cta-section" className="py-16 text-center">
          <h2 className="text-3xl font-bold mb-4 text-gray-800">{t('cta_section.title')}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            {t('cta_section.subtitle')}
          </p>
          
          <Button 
            size="lg"
            className="bg-[#4171d6] hover:bg-[#2950a3] shadow-lg text-lg px-8 py-4"
            onClick={() => navigate('/ximatar-journey')}
          >
            {t('cta_section.button')}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
