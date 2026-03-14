
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Process from '../components/how-it-works/Process';
import XimaPillars from '../components/how-it-works/XimaPillars';
import AvatarExplanation from '../components/how-it-works/AvatarExplanation';
import CallToAction from '../components/how-it-works/CallToAction';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

const HowItWorks = () => {
  const { t } = useTranslation();

  return (
    <MainLayout>
       <div className="container max-w-4xl mx-auto px-4 md:px-8">
         <div className="text-center mb-8 md:mb-12">
           <h1 className="text-[28px] md:text-[34px] xl:text-[40px] font-bold mb-4">{t('how_it_works.title')}</h1>
           <p className="text-[14px] md:text-[17px] xl:text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            {t('how_it_works.subtitle')}
          </p>
          <div className="max-w-3xl mx-auto space-y-4 text-lg text-muted-foreground">
            <p className="italic">{t('pillars.storytelling')}</p>
            <p>{t('pillars.ximatar_intro')}</p>
            <p className="font-semibold">{t('pillars.dimensions_intro')}</p>
          </div>
          
          <Button variant="outline" asChild className="mt-6">
            <Link to="/assessment-guide">
              <BookOpen className="w-4 h-4 mr-2" />
              {t('guide.badge', 'Assessment Guide')}
            </Link>
          </Button>
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
