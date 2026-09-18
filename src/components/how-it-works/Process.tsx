import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Upload, ClipboardCheck, Sparkles, Calendar } from 'lucide-react';

const Process = () => {
  const { t } = useTranslation();
  
  const steps = [
    {
      icon: Upload,
      title: t('process.step1.title'),
      description: t('process.step1.description')
    },
    {
      icon: ClipboardCheck,
      title: t('process.step2.title'),
      description: t('process.step2.description')
    },
    {
      icon: Sparkles,
      title: t('process.step3.title'),
      description: t('process.step3.description')
    },
    {
      icon: Calendar,
      title: t('process.step4.title'),
      description: t('process.step4.description')
    }
  ];

  return (
    <div className="mb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow group premium-card">
              <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 group-hover:border-primary/40 transition-colors">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Process;
