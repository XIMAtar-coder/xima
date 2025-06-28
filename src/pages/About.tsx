
import React from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('about.title')}</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('about.subtitle')}
          </p>
        </div>
        
        <Card className="shadow-lg border-0 overflow-hidden mb-12">
          <div className="bg-gradient-to-r from-[#4171d6] to-[#2950a3] py-10 px-6 text-white">
            <h2 className="text-3xl font-bold mb-4">{t('about.match_problem_title')}</h2>
            <p className="text-lg">
              {t('about.match_problem_subtitle')}
            </p>
          </div>
          <CardContent className="p-6">
            <div className="space-y-6">
              <p>
                {t('about.match_problem_description')}
              </p>
              
              <p>
                {t('about.match_leads_to')}
              </p>
              
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('about.mismatch_1')}</li>
                <li>{t('about.mismatch_2')}</li>
                <li>{t('about.mismatch_3')}</li>
                <li>{t('about.mismatch_4')}</li>
                <li>{t('about.mismatch_5')}</li>
              </ul>
              
              <p>
                {t('about.solution_description')}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">{t('about.approach_title')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold">{t('about.five_pillars_title')}</h3>
              <p>
                {t('about.five_pillars_description')}
              </p>
              
              <ul className="space-y-4 mt-6">
                <li className="p-3 bg-blue-50 rounded-lg">
                  <span className="font-bold text-blue-700">{t('about.experience_pillar')}</span>
                </li>
                <li className="p-3 bg-purple-50 rounded-lg">
                  <span className="font-bold text-purple-700">{t('about.intelligence_pillar')}</span>
                </li>
                <li className="p-3 bg-red-50 rounded-lg">
                  <span className="font-bold text-red-700">{t('about.motivation_pillar')}</span>
                </li>
                <li className="p-3 bg-green-50 rounded-lg">
                  <span className="font-bold text-green-700">{t('about.attitude_pillar')}</span>
                </li>
                <li className="p-3 bg-amber-50 rounded-lg">
                  <span className="font-bold text-amber-700">{t('about.analysis_pillar')}</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-bold">{t('about.ximatar_title')}</h3>
              <p>
                {t('about.ximatar_description')}
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg mt-4">
                <h4 className="font-medium mb-2">{t('about.why_animals_title')}</h4>
                <p className="text-sm">
                  {t('about.why_animals_description')}
                </p>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">{t('about.features_title')}</h4>
                <p>
                  {t('about.features_description')}
                </p>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">{t('about.mentor_matching_title')}</h4>
                <p>
                  {t('about.mentor_matching_description')}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-12 bg-gray-50 p-8 rounded-lg">
          <h2 className="text-3xl font-bold mb-6 text-center">{t('about.benefits_title')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold">{t('about.job_seekers_title')}</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#4171d6] text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>{t('about.job_seekers_1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#4171d6] text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>{t('about.job_seekers_2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#4171d6] text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>{t('about.job_seekers_3')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#4171d6] text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>{t('about.job_seekers_4')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#4171d6] text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>{t('about.job_seekers_5')}</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-bold">{t('about.employers_title')}</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#4171d6] text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>{t('about.employers_1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#4171d6] text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>{t('about.employers_2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#4171d6] text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>{t('about.employers_3')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#4171d6] text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>{t('about.employers_4')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#4171d6] text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                  <span>{t('about.employers_5')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-6">{t('about.ready_title')}</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            {t('about.ready_subtitle')}
          </p>
          
          <Button 
            size="lg"
            className="bg-[#4171d6] hover:bg-[#2950a3]"
            onClick={() => navigate('/register')}
          >
            {t('about.get_started')}
            <ChevronRight size={18} className="ml-2" />
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default About;
