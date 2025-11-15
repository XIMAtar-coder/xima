
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import XimaScoreCard from '../XimaScoreCard';
import XimaAvatar from '../XimaAvatar';
import { OpenAnswerScore } from './OpenAnswerScore';
import FeaturedProfessionals, { type FieldKey } from '../FeaturedProfessionals';
import { ArrowRight, CheckCircle, UserPlus } from 'lucide-react';
import { XimaPillars } from '../../types';
import { useUser } from '../../context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import type { Rubric } from '@/lib/scoring/openResponse';

interface ResultsComparisonProps {
  onComplete: (step: number) => void;
  hasCv: boolean;
}

const ResultsComparison: React.FC<ResultsComparisonProps> = ({ onComplete, hasCv }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useUser();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [openResponses, setOpenResponses] = useState<Array<{
    open_key: 'open1' | 'open2';
    answer: string;
    score: number;
    rubric: Rubric;
  }>>([]);
  const [topPillars, setTopPillars] = useState<Array<{ name: string; score: number }>>([]);
  const [selectedField] = useState<FieldKey>(() => {
    return (localStorage.getItem('preferred_field') as FieldKey) || 'business_leadership';
  });

  // Mock data for demonstration
  const baselinePillars: XimaPillars = {
    computational: 6,
    communication: 5,
    knowledge: 8,
    creativity: 4,
    drive: 7
  };

  const finalPillars: XimaPillars = {
    computational: 7,
    communication: 8,
    knowledge: 8,
    creativity: 9,
    drive: 8
  };

  const userAvatar = {
    animal: t('results.fox_animal'),
    image: '/ximatars/fox.png',
    features: [
      { name: t('results.adaptability'), description: t('results.adaptability_desc'), strength: 8 },
      { name: t('results.focus'), description: t('results.focus_desc'), strength: 6 },
      { name: t('results.creativity_trait'), description: t('results.creativity_desc'), strength: 7 }
    ]
  };

  useEffect(() => {
    const fetchComputedResults = async () => {
      // Check for guest data first
      const guestPillarScores = localStorage.getItem('guest_pillar_scores');
      const guestXimatar = localStorage.getItem('guest_ximatar');
      if (guestPillarScores && !user?.id) {
        const guestScores = JSON.parse(guestPillarScores);
        const computedPillars: XimaPillars = {
          computational: Math.round(guestScores.computational_power * 10) / 10,
          communication: Math.round(guestScores.communication * 10) / 10,
          knowledge: Math.round(guestScores.knowledge * 10) / 10,
          creativity: Math.round(guestScores.creativity * 10) / 10,
          drive: Math.round(guestScores.drive * 10) / 10
        };
        Object.assign(finalPillars, computedPillars);
        
        // Identify top 2 pillars
        const pillarArray = Object.entries(computedPillars).map(([name, score]) => ({ name, score }));
        pillarArray.sort((a, b) => b.score - a.score);
        setTopPillars(pillarArray.slice(0, 2));
        
        // Update XIMAtar based on guest assignment
        if (guestXimatar) {
          userAvatar.animal = guestXimatar;
          userAvatar.image = `/ximatars/${guestXimatar}.png`;
        }
        
        setTimeout(() => {
          setIsAnalyzing(false);
          setShowResults(true);
        }, 2000);
        return;
      }
      
      const resultId = localStorage.getItem('current_result_id');
      
      if (!resultId || !user?.id) {
        // Fallback to mock data after timeout
        const timer = setTimeout(() => {
          setIsAnalyzing(false);
          setShowResults(true);
        }, 3000);
        return () => clearTimeout(timer);
      }

      // Poll for computed results
      let attempts = 0;
      const maxAttempts = 15;
      
      while (attempts < maxAttempts) {
        const { data: result, error } = await supabase
          .from('assessment_results')
          .select(`
            *,
            ximatars (id, label, image_url)
          `)
          .eq('id', resultId)
          .single();

        if (!error && result && result.ximatars && result.ximatar_id) {
          console.log('Got computed results:', result);
          
          // Fetch pillar scores
          const { data: pillarData } = await supabase
            .from('pillar_scores')
            .select('pillar, score')
            .eq('assessment_result_id', resultId);

          if (pillarData && pillarData.length > 0) {
            // Update final pillars with computed values
            const computedPillars: XimaPillars = {
              computational: 0,
              communication: 0,
              knowledge: 0,
              creativity: 0,
              drive: 0
            };

            pillarData.forEach(p => {
              const key = p.pillar === 'computational_power' ? 'computational' : p.pillar;
              computedPillars[key as keyof XimaPillars] = p.score as number;
            });

            // Identify top 2 pillars
            const pillarArray = pillarData
              .map(p => ({
                name: p.pillar === 'computational_power' ? 'computational' : p.pillar,
                score: p.score as number
              }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 2);
            setTopPillars(pillarArray);

            // Update user avatar with computed XIMAtar
            if (result.ximatars) {
              userAvatar.animal = (result.ximatars as any).label;
              const rawImageUrl = (result.ximatars as any).image_url;
              userAvatar.image = rawImageUrl?.replace(/^public\//, '/') || '/ximatars/fox.png';
            }

            Object.assign(finalPillars, computedPillars);
            console.log('Updated pillars:', finalPillars);
            
            setIsAnalyzing(false);
            setShowResults(true);
            return;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      // Timeout - show results anyway with fallback
      console.warn('Computation timeout - showing fallback results');
      setIsAnalyzing(false);
      setShowResults(true);
    };

    fetchComputedResults();
  }, [user]);

  // Fetch open responses
  useEffect(() => {
    const fetchOpenResponses = async () => {
      // For guest users, retrieve from localStorage
      const guestData = localStorage.getItem('guest_assessment_data');
      if (guestData && !user?.id) {
        const data = JSON.parse(guestData);
        // Create mock rubric for guest users
        const guestResponses = Object.entries(data.openAnswers || {}).map(([key, answer]) => ({
          open_key: key as 'open1' | 'open2',
          answer: answer as string,
          score: Math.floor(Math.random() * 30) + 70, // Random score 70-100 for demo
          rubric: {
            length: Math.floor(Math.random() * 5) + 15,
            relevance: Math.floor(Math.random() * 5) + 20,
            structure: Math.floor(Math.random() * 5) + 15,
            specificity: Math.floor(Math.random() * 5) + 15,
            action: Math.floor(Math.random() * 5) + 10,
            total: Math.floor(Math.random() * 30) + 70
          } as Rubric
        }));
        setOpenResponses(guestResponses);
        return;
      }
      
      if (!user?.id) return;
      
      const attemptId = localStorage.getItem('current_attempt_id');
      if (!attemptId) return;

      const { data, error } = await supabase
        .from('assessment_open_responses')
        .select('open_key, answer, score, rubric')
        .eq('user_id', user.id)
        .eq('attempt_id', attemptId)
        .order('open_key', { ascending: true });

      if (!error && data) {
        setOpenResponses(data as any);
      }
    };

    if (showResults) {
      fetchOpenResponses();
    }
  }, [showResults, user]);

  const handleProfessionalSelect = (professional: any) => {
    setSelectedProfessional(professional.id);
    // Store the full professional data for later use
    localStorage.setItem('selected_professional_data', JSON.stringify(professional));
  };

  const handleProceedWithSelection = () => {
    if (!selectedProfessional) return;
    
    const professionalData = JSON.parse(localStorage.getItem('selected_professional_data') || '{}');
    
    if (isAuthenticated) {
      // User is already authenticated, go to dashboard
      navigate('/profile', { 
        state: { 
          selectedProfessional: professionalData,
          assessmentResults: finalPillars,
          userAvatar: userAvatar
        }
      });
    } else {
      // User needs to register, store selection and redirect
      localStorage.setItem('selectedProfessional', JSON.stringify({
        professional: professionalData,
        assessmentResults: finalPillars,
        userAvatar: userAvatar
      }));
      navigate('/register');
    }
  };

  if (isAnalyzing) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#4171d6]"></div>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">{t('results.analyzing')}</h2>
          <p className="text-gray-600">{t('results.analyzing_subtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">{t('results.title')}</h2>
        <p className="text-gray-600">
          {hasCv ? t('results.subtitle_with_cv') : t('results.subtitle_without_cv')}
        </p>
      </div>

      {/* User Avatar Section */}
      <Card className="p-8 text-center">
        <h3 className="text-2xl font-bold mb-4">
          {t('results.your_animal', { animal: userAvatar.animal })}
        </h3>
        <div className="flex justify-center mb-6">
          <XimaAvatar avatar={userAvatar} size="lg" showDetails />
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t('results.animal_description')}
        </p>
      </Card>

      {/* Top Pillars Banner */}
      {topPillars.length === 2 && (
        <Card className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">
                {t('results.determined_by')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-4 py-2 text-base capitalize">
                {t(`pillars.${topPillars[0].name}`)} ({topPillars[0].score.toFixed(1)})
              </Badge>
              <span className="text-muted-foreground">+</span>
              <Badge variant="secondary" className="px-4 py-2 text-base capitalize">
                {t(`pillars.${topPillars[1].name}`)} ({topPillars[1].score.toFixed(1)})
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Professional Selection Section */}
      <Card className="p-8">
        <h3 className="text-2xl font-bold mb-6 text-center">{t('professionals.title')}</h3>
        <p className="text-center text-muted-foreground mb-8">{t('professionals.subtitle')}</p>
        
        <FeaturedProfessionals 
          onSelect={handleProfessionalSelect}
          fieldKey={selectedField}
        />

        {selectedProfessional && (
          <div className="text-center mt-8">
            <Button 
              size="lg"
              onClick={handleProceedWithSelection}
              className="bg-[#4171d6] hover:bg-[#2950a3] px-8 py-4"
            >
              {isAuthenticated ? t('results.proceed_to_dashboard') : t('results.register_to_continue')}
              <ArrowRight size={20} className="ml-2" />
            </Button>
          </div>
        )}
      </Card>

      {/* Comparison Section */}
      {hasCv && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="text-center mb-4">
              <Badge variant="outline" className="mb-2">
                {t('results.baseline_assessment')}
              </Badge>
              <h3 className="text-lg font-semibold">{t('results.baseline_description')}</h3>
            </div>
            <XimaScoreCard pillars={baselinePillars} compact />
          </Card>

          <Card className="p-6">
            <div className="text-center mb-4">
              <Badge className="mb-2 bg-[#4171d6]">
                {t('results.full_assessment')}
              </Badge>
              <h3 className="text-lg font-semibold">{t('results.full_description')}</h3>
            </div>
            <XimaScoreCard pillars={finalPillars} compact />
          </Card>
        </div>
      )}

      {/* Single Assessment Results */}
      {!hasCv && (
        <div className="space-y-6">
          <Card className="p-8">
            <XimaScoreCard pillars={finalPillars} showTooltip />
          </Card>

          {/* Open Answer Scores */}
          {openResponses.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-center">{t('open_scoring.title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {openResponses.map((response) => (
                  <OpenAnswerScore
                    key={response.open_key}
                    openKey={response.open_key}
                    rubric={response.rubric}
                    answer={response.answer}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!selectedProfessional && (
        <div className="text-center">
          <p className="text-gray-500">{t('results.select_professional_prompt')}</p>
        </div>
      )}
    </div>
  );
};

export default ResultsComparison;
