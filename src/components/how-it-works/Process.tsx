import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';

const Process = () => {
  const { t } = useTranslation();
  
  const steps = [
    {
      image: '/ximatars/elephant.png',
      title: t('process.step1.title'),
      description: t('process.step1.description')
    },
    {
      image: '/ximatars/owl.png',
      title: t('process.step2.title'),
      description: t('process.step2.description')
    },
    {
      image: '/ximatars/dolphin.png',
      title: t('process.step3.title'),
      description: t('process.step3.description')
    },
    {
      image: '/ximatars/fox.png',
      title: t('process.step4.title'),
      description: t('process.step4.description')
    }
  ];

  return (
    <div className="mb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, index) => (
          <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow group">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <img 
                src={step.image} 
                alt={step.title}
                className="h-10 w-10 rounded-full object-cover bg-muted/40 ring-1 ring-border/40 p-0.5 transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <h3 className="text-lg font-semibold mb-3">{step.title}</h3>
            <p className="text-muted-foreground text-sm">{step.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};
export default Process;