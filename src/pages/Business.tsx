import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, Users, Target, BarChart3, Award } from 'lucide-react';

const Business = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: t('business.feature_1_title'),
      description: t('business.feature_1_desc')
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: t('business.feature_2_title'),
      description: t('business.feature_2_desc')
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: t('business.feature_3_title'),
      description: t('business.feature_3_desc')
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: t('business.feature_4_title'),
      description: t('business.feature_4_desc')
    }
  ];

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto px-4 md:px-8 xl:px-12">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center py-16 md:py-24 space-y-8">
          <div className="w-full max-w-4xl space-y-6">
            <div 
              className="h-0.5 w-24 mx-auto rounded-full gradient-accent"
              style={{
                background: 'linear-gradient(90deg, hsl(var(--xima-blue)), hsl(var(--xima-teal)))'
              }}
            />
            
            <h1 className="text-[28px] md:text-[40px] xl:text-[48px] font-bold leading-tight text-foreground">
              {t('business.hero_title')}
            </h1>
            
            <p className="text-[14px] md:text-[17px] text-muted-foreground max-w-2xl mx-auto">
              {t('business.hero_subtitle')}
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 pt-6">
              <Button 
                size="lg"
                className="accent-gradient text-white hover:opacity-90 transition-opacity shadow-lg text-base md:text-lg px-8 py-6 rounded-xl"
                onClick={() => navigate('/business/register')}
              >
                {t('business.get_started')}
                <ChevronRight size={20} className="ml-2" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/business/login')}
                className="text-base md:text-lg px-8 py-6 rounded-xl"
              >
                {t('business.sign_in')}
              </Button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="py-16">
          <h2 className="text-[20px] md:text-[24px] xl:text-[28px] font-bold text-center mb-8 md:mb-12 text-foreground">
            {t('business.features_title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 xl:gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-[hsl(var(--xima-accent))] transition-colors dark:bg-[rgba(255,255,255,0.06)] dark:border-[rgba(255,255,255,0.08)]">
                <CardContent className="p-4 md:p-5 xl:p-6 space-y-4">
                  <div className="text-[hsl(var(--xima-accent))] dark:text-[rgba(255,255,255,0.60)]">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 text-center">
          <Card className="p-8 bg-gradient-to-r from-[hsl(var(--xima-blue))]/10 to-[hsl(var(--xima-teal))]/10 dark:bg-[rgba(99,102,241,0.12)] dark:bg-none border-2 border-[hsl(var(--xima-accent))] dark:border-[rgba(99,102,241,0.20)]">
            <h2 className="text-3xl font-bold mb-4 text-foreground">{t('business.cta_title')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              {t('business.cta_subtitle')}
            </p>
            
            <Button 
              size="lg"
              className="accent-gradient text-white hover:opacity-90 transition-opacity shadow-lg text-base md:text-lg px-8 py-6 rounded-xl"
              onClick={() => navigate('/business/register')}
            >
              {t('business.start_free_trial')}
              <ChevronRight size={20} className="ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Business;
