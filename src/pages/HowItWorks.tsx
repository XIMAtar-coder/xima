
import React from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import Process from '../components/how-it-works/Process';
import XimaPillars from '../components/how-it-works/XimaPillars';
import AvatarExplanation from '../components/how-it-works/AvatarExplanation';
import CallToAction from '../components/how-it-works/CallToAction';

const HowItWorks = () => {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('how_it_works.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            {t('how_it_works.subtitle')}
          </p>
          <div className="max-w-3xl mx-auto space-y-4 text-lg text-muted-foreground">
            <p className="italic">{t('pillars.storytelling')}</p>
            <p>{t('pillars.ximatar_intro')}</p>
            <p className="font-semibold">{t('pillars.dimensions_intro')}</p>
          </div>
        </div>
        
        <div className="mb-12">
          <Process />
          <XimaPillars />
          <AvatarExplanation />
        </div>
        
        <CallToAction />
      </div>
    </MainLayout>
  );
};

export default HowItWorks;
