
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
      <h2 className="text-3xl font-bold text-center mb-8">{t('pillars.title')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pillars.map((pillar, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              {pillar.icon}
              <h3 className="text-lg font-semibold">{pillar.name}</h3>
            </div>
            <p className="text-gray-600 text-sm">{pillar.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default XimaPillars;
