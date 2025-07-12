
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useUser } from '../context/UserContext';
import { ChevronRight, BarChart3, MessageSquare, BookOpen, Sparkles, Zap } from 'lucide-react';

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
        
        <div className="py-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">{t('pillars.title')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              {
                name: t('pillars.computational.name'),
                description: t('pillars.computational.description'),
                icon: <BarChart3 className="text-blue-500" size={32} />,
                color: 'bg-blue-50 border-blue-200'
              },
              {
                name: t('pillars.communication.name'),
                description: t('pillars.communication.description'),
                icon: <MessageSquare className="text-indigo-500" size={32} />,
                color: 'bg-indigo-50 border-indigo-200'
              },
              {
                name: t('pillars.knowledge.name'),
                description: t('pillars.knowledge.description'),
                icon: <BookOpen className="text-red-500" size={32} />,
                color: 'bg-red-50 border-red-200'
              },
              {
                name: t('pillars.creativity.name'),
                description: t('pillars.creativity.description'),
                icon: <Sparkles className="text-green-500" size={32} />,
                color: 'bg-green-50 border-green-200'
              },
              {
                name: t('pillars.drive.name'),
                description: t('pillars.drive.description'),
                icon: <Zap className="text-amber-500" size={32} />,
                color: 'bg-amber-50 border-amber-200'
              }
            ].map((pillar, index) => (
              <div 
                key={index}
                className={`p-6 border rounded-lg ${pillar.color} hover:shadow-md transition-shadow`}
              >
                <div className="mb-4">{pillar.icon}</div>
                <h3 className="text-xl font-medium mb-2 text-gray-800">{pillar.name}</h3>
                <p className="text-gray-600 text-sm">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="py-16 text-center">
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
