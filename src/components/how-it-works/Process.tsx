import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { FileText, Brain, Users, Target } from 'lucide-react';
const Process = () => {
  const {
    t
  } = useTranslation();
  const steps = [{
    icon: <FileText size={32} className="text-[#4171d6]" />,
    title: t('process.step1.title'),
    description: t('process.step1.description')
  }, {
    icon: <Brain size={32} className="text-[#4171d6]" />,
    title: t('process.step2.title'),
    description: t('process.step2.description')
  }, {
    icon: <Users size={32} className="text-[#4171d6]" />,
    title: t('process.step3.title'),
    description: t('process.step3.description')
  }, {
    icon: <Target size={32} className="text-[#4171d6]" />,
    title: t('process.step4.title'),
    description: t('process.step4.description')
  }];
  return <div className="mb-12">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, index) => <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-4">
              {step.icon}
            </div>
            <h3 className="text-lg font-semibold mb-3">{step.title}</h3>
            <p className="text-gray-600 text-sm">{step.description}</p>
          </Card>)}
      </div>
    </div>;
};
export default Process;