
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Brain, MessageCircle, BookOpen, Lightbulb, Zap } from 'lucide-react';

const XimaPillars = () => {
  const { t } = useTranslation();

  const pillars = [
    {
      icon: <Brain size={24} className="text-[#4171d6]" />,
      name: t('pillars.computational.name'),
      description: t('pillars.computational.description')
    },
    {
      icon: <MessageCircle size={24} className="text-[#4171d6]" />,
      name: t('pillars.communication.name'),
      description: t('pillars.communication.description')
    },
    {
      icon: <BookOpen size={24} className="text-[#4171d6]" />,
      name: t('pillars.knowledge.name'),
      description: t('pillars.knowledge.description')
    },
    {
      icon: <Lightbulb size={24} className="text-[#4171d6]" />,
      name: t('pillars.creativity.name'),
      description: t('pillars.creativity.description')
    },
    {
      icon: <Zap size={24} className="text-[#4171d6]" />,
      name: t('pillars.drive.name'),
      description: t('pillars.drive.description')
    }
  ];

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold text-center mb-4">{t('pillars.title')}</h2>
      
      <div className="max-w-3xl mx-auto space-y-4 text-center text-muted-foreground mb-8">
        <p>{t('pillars.assignment_logic')}</p>
        <p>{t('pillars.drive_paths')}</p>
        <p className="italic font-medium">{t('pillars.compass')}</p>
        <p className="text-sm mt-6">{t('pillars.explanation')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pillars.map((pillar, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              {pillar.icon}
              <h3 className="text-lg font-semibold">{pillar.name}</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-3">{pillar.description}</p>
            {t(`pillars.${pillar.name.toLowerCase().replace(' ', '_')}.as_strength`) && (
              <div className="space-y-2 text-xs">
                <p className="text-green-600 dark:text-green-400">
                  <strong>As Strength:</strong> {t(`pillars.${pillar.name.toLowerCase().replace(' ', '_')}.as_strength`)}
                </p>
                <p className="text-orange-600 dark:text-orange-400">
                  <strong>As Weakness:</strong> {t(`pillars.${pillar.name.toLowerCase().replace(' ', '_')}.as_weakness`)}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default XimaPillars;
