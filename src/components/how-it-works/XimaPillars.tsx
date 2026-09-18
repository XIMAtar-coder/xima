
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Brain, MessageCircle, BookOpen, Lightbulb, Zap } from 'lucide-react';

const XimaPillars = () => {
  const { t } = useTranslation();

  const pillars = [
    {
      icon: <Brain size={24} className="text-primary" />,
      name: t('pillars.computational.name'),
      description: t('pillars.computational.description')
    },
    {
      icon: <MessageCircle size={24} className="text-primary" />,
      name: t('pillars.communication.name'),
      description: t('pillars.communication.description')
    },
    {
      icon: <BookOpen size={24} className="text-primary" />,
      name: t('pillars.knowledge.name'),
      description: t('pillars.knowledge.description')
    },
    {
      icon: <Lightbulb size={24} className="text-primary" />,
      name: t('pillars.creativity.name'),
      description: t('pillars.creativity.description')
    },
    {
      icon: <Zap size={24} className="text-primary" />,
      name: t('pillars.drive.name'),
      description: t('pillars.drive.description')
    }
  ];

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold text-center mb-4 text-foreground">{t('pillars.title')}</h2>
      
      <div className="max-w-3xl mx-auto space-y-4 text-center text-muted-foreground mb-8">
        <p>{t('pillars.assignment_logic')}</p>
        <p>{t('pillars.drive_paths')}</p>
        <p className="italic font-medium">{t('pillars.compass')}</p>
        <p className="text-sm mt-6">{t('pillars.explanation')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {['computational', 'communication', 'knowledge', 'creativity', 'drive'].map((pillarKey, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow glass-surface-static">
            <div className="flex items-center gap-3 mb-3">
              {pillars[index].icon}
              <h3 className="text-lg font-semibold text-foreground">{t(`pillars.${pillarKey}.name`)}</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-3">{t(`pillars.${pillarKey}.description`)}</p>
            <div className="space-y-2 text-xs">
              <p className="text-green-600 dark:text-[hsl(142,71%,45%)]">
                <strong>{t('common.as_strength', 'As Strength')}:</strong> {t(`pillars.${pillarKey}.as_strength`)}
              </p>
              <p className="text-orange-600 dark:text-[hsl(33,100%,50%)]">
                <strong>{t('common.as_weakness', 'As Weakness')}:</strong> {t(`pillars.${pillarKey}.as_weakness`)}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default XimaPillars;
