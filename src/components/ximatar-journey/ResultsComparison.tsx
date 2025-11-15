import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { OpenAnswerScore } from './OpenAnswerScore';
import FeaturedProfessionals, { type FieldKey } from '../FeaturedProfessionals';
import { XimatarProfileCard } from '../results/XimatarProfileCard';
import { ArrowRight, CheckCircle, Sparkles } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import type { Rubric } from '@/lib/scoring/openResponse';

interface ResultsComparisonProps {
  onComplete: (step: number) => void;
  hasCv: boolean;
}

interface XimatarData {
  id: string;
  label: string;
  image_url: string;
  translations: {
    title: string;
    core_traits: string;
    behavior: string;
    weaknesses: string;
    ideal_roles: string;
  };
}

interface PillarScore {
  pillar: string;
  score: number;
}

const ResultsComparison: React.FC<ResultsComparisonProps> = ({ onComplete, hasCv }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user } = useUser();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [ximatarData, setXimatarData] = useState<XimatarData | null>(null);
  const [pillarScores, setPillarScores] = useState<PillarScore[]>([]);
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

  useEffect(() => {
    const fetchComputedResults = async () => {
      const currentLang = (i18n.language || 'it') as 'it' | 'en' | 'es';
      
      // Check for guest data first
      const guestPillarScores = localStorage.getItem('guest_pillar_scores');
      const guestXimatar = localStorage.getItem('guest_ximatar');
      if (guestPillarScores && !user?.id) {
        const guestScores = JSON.parse(guestPillarScores);
        const scores: PillarScore[] = [
          { pillar: 'computational_power', score: guestScores.computational_power },
          { pillar: 'communication', score: guestScores.communication },
          { pillar: 'knowledge', score: guestScores.knowledge },
          { pillar: 'creativity', score: guestScores.creativity },
          { pillar: 'drive', score: guestScores.drive }
        ];
        setPillarScores(scores);
        
        // Identify top 2 pillars
        const sortedScores = [...scores].sort((a, b) => b.score - a.score);
        setTopPillars(sortedScores.slice(0, 2).map(s => ({ name: s.pillar, score: s.score })));
        
        // Fetch XIMAtar data from database even for guests
        if (guestXimatar) {
          const { data: ximatarInfo } = await supabase
            .from('ximatars')
            .select(`
              id,
              label,
              image_url,
              ximatar_translations!inner(title, core_traits, behavior, weaknesses, ideal_roles)
            `)
            .eq('label', guestXimatar.toLowerCase())
            .eq('ximatar_translations.lang', currentLang)
            .single();

          if (ximatarInfo && Array.isArray(ximatarInfo.ximatar_translations) && ximatarInfo.ximatar_translations.length > 0) {
            setXimatarData({
              id: ximatarInfo.id,
              label: ximatarInfo.label,
              image_url: ximatarInfo.image_url,
              translations: ximatarInfo.ximatar_translations[0]
            });
          }
        }
        
        setTimeout(() => {
          setIsAnalyzing(false);
          setShowResults(true);
        }, 2000);
        return;
      }
      
      const resultId = localStorage.getItem('current_result_id');
      
      if (!resultId || !user?.id) {
        setTimeout(() => {
          setIsAnalyzing(false);
          setShowResults(true);
        }, 2000);
        return;
      }

      // Authenticated user - fetch real data
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = 2000;

      const pollResults = async (): Promise<boolean> => {
        const { data: result, error } = await supabase
          .from('assessment_results')
          .select(`
            id,
            ximatar_id,
            total_score,
            computed_at,
            ximatars!inner(
              id,
              label,
              image_url,
              ximatar_translations!inner(
                title,
                core_traits,
                behavior,
                weaknesses,
                ideal_roles
              )
            )
          `)
          .eq('id', resultId)
          .eq('ximatars.ximatar_translations.lang', currentLang)
          .single();

        if (error || !result || !result.ximatar_id) {
          return false;
        }

        // Get pillar scores
        const { data: scores } = await supabase
          .from('pillar_scores')
          .select('pillar, score')
          .eq('assessment_result_id', resultId)
          .order('score', { ascending: false });

        if (scores && scores.length > 0) {
          setPillarScores(scores);
          setTopPillars(scores.slice(0, 2).map(s => ({ name: s.pillar, score: s.score })));
        }

        // Set XIMAtar data
        const ximatars: any = result.ximatars;
        if (ximatars && Array.isArray(ximatars.ximatar_translations) && ximatars.ximatar_translations.length > 0) {
          setXimatarData({
            id: ximatars.id,
            label: ximatars.label,
            image_url: ximatars.image_url,
            translations: ximatars.ximatar_translations[0]
          });
        }

        return true;
      };

      // Poll for results
      const poll = async () => {
        attempts++;
        const success = await pollResults();
        
        if (success) {
          setIsAnalyzing(false);
          setShowResults(true);
        } else if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
        } else {
          console.warn('Max polling attempts reached');
          setIsAnalyzing(false);
          setShowResults(true);
        }
      };

      poll();
    };

    fetchComputedResults();
  }, [user, i18n.language]);

  // Fetch open responses
  useEffect(() => {
    const fetchOpenResponses = async () => {
      const guestData = localStorage.getItem('guest_assessment_data');
      if (guestData && !user?.id) {
        const data = JSON.parse(guestData);
        const guestResponses = Object.entries(data.openAnswers || {}).map(([key, answer]) => ({
          open_key: key as 'open1' | 'open2',
          answer: answer as string,
          score: Math.floor(Math.random() * 30) + 70,
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
    localStorage.setItem('selected_professional_data', JSON.stringify(professional));
  };

  const handleProceedWithSelection = () => {
    if (!selectedProfessional) return;
    
    const professionalData = JSON.parse(localStorage.getItem('selected_professional_data') || '{}');
    
    if (isAuthenticated) {
      navigate('/profile', { 
        state: { 
          selectedProfessional: professionalData,
          ximatarData: ximatarData,
          pillarScores: pillarScores
        }
      });
    } else {
      localStorage.setItem('selectedProfessional', JSON.stringify({
        professional: professionalData,
        ximatarData: ximatarData,
        pillarScores: pillarScores
      }));
      navigate('/register');
    }
  };

  if (isAnalyzing) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">{t('results.analyzing')}</h2>
          <p className="text-muted-foreground">{t('results.analyzing_subtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold font-heading">{t('results.title')}</h2>
        <p className="text-muted-foreground">
          {hasCv ? t('results.subtitle_with_cv') : t('results.subtitle_without_cv')}
        </p>
      </div>

      {ximatarData && (
        <XimatarProfileCard ximatar={ximatarData} />
      )}

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
                {t(`pillars.${topPillars[0].name.replace('_', '')}`)} ({topPillars[0].score.toFixed(1)})
              </Badge>
              <span className="text-muted-foreground">+</span>
              <Badge variant="secondary" className="px-4 py-2 text-base capitalize">
                {t(`pillars.${topPillars[1].name.replace('_', '')}`)} ({topPillars[1].score.toFixed(1)})
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {pillarScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <Sparkles className="text-primary" />
              {t('results.assessment_scores')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pillarScores.map((pillar) => (
              <div key={pillar.pillar} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium capitalize">
                    {t(`pillars.${pillar.pillar.replace('_', '')}`)}
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {pillar.score.toFixed(1)}/10
                  </span>
                </div>
                <Progress value={pillar.score * 10} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="p-8">
        <h3 className="text-2xl font-bold mb-6 text-center font-heading">{t('professionals.title')}</h3>
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
              className="px-8 py-4"
            >
              {isAuthenticated ? t('results.proceed_to_dashboard') : t('results.register_to_continue')}
              <ArrowRight size={20} className="ml-2" />
            </Button>
          </div>
        )}
      </Card>

      {!hasCv && openResponses.length > 0 && (
        <div className="space-y-6">
          <Card className="p-8">
            <h3 className="text-2xl font-bold mb-6 text-center font-heading">{t('open_scoring.title')}</h3>
            <div className="space-y-6">
              {openResponses.map((response) => (
                <OpenAnswerScore
                  key={response.open_key}
                  openKey={response.open_key}
                  answer={response.answer}
                  rubric={response.rubric}
                />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ResultsComparison;
