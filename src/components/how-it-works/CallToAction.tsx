
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

const CallToAction = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Card className="p-8 text-center glass-surface-static border-2 border-primary/20">
      <h2 className="text-3xl font-bold mb-4 text-foreground">{t('cta_section.title')}</h2>
      <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
        {t('cta_section.subtitle')}
      </p>
      <Button 
        onClick={() => navigate('/ximatar-journey')}
        size="lg"
        className="bg-primary hover:bg-primary/90 px-8 py-4"
      >
        {t('cta_section.button')}
        <ArrowRight size={20} className="ml-2" />
      </Button>
    </Card>
  );
};

export default CallToAction;
