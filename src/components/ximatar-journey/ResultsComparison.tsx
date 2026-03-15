import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { OpenAnswerScore } from './OpenAnswerScore';
import FeaturedProfessionals from '../FeaturedProfessionals';
import { XimatarProfileCard } from '../results/XimatarProfileCard';
import { ArrowRight, CheckCircle, Sparkles, AlertCircle } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useXimatarsCatalog } from '@/hooks/useXimatarsCatalog';
import type { Rubric } from '@/lib/scoring/openResponse';
import { normalizeXimatarImageUrl } from '@/utils/normalizeXimatarImage';
import { useToast } from '@/hooks/use-toast';

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
    core_traits?: string;
    behavior?: string;
    weaknesses?: string;
    ideal_roles?: string;
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
  const { toast } = useToast();
  const { catalogMap, loading: catalogLoading } = useXimatarsCatalog();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [ximatarData, setXimatarData] = useState<XimatarData | null>(null);
  const [pillarScores, setPillarScores] = useState<PillarScore[]>([]);
  const [totalScore, setTotalScore] = useState<number | null>(null);
  const [openResponses, setOpenResponses] = useState<Array<{
    open_key: 'open1' | 'open2';
    answer: string;
    score: number;
    rubric: Rubric;
  }>>([]);
  const [topPillars, setTopPillars] = useState<Array<{ name: string; score: number }>>([]);
  const [hasNoAssessment, setHasNoAssessment] = useState(false);
  const [fieldKey, setFieldKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchComputedResults = async () => {
      if (catalogLoading) return;

      const currentLang = (i18n.language || 'it').split('-')[0] as 'it' | 'en' | 'es';
      
      // Check for guest data first (use sessionStorage for security)
      const guestPillarScores = sessionStorage.getItem('guest_pillar_scores');
      const guestXimatar = sessionStorage.getItem('guest_ximatar');
      
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
        
        const total = scores.reduce((sum, s) => sum + s.score, 0);
        setTotalScore(total);
        
        // Identify top 2 pillars
        const sortedScores = [...scores].sort((a, b) => b.score - a.score);
        setTopPillars(sortedScores.slice(0, 2).map(s => ({ name: s.pillar, score: s.score })));
        
        // Use catalog for XIMAtar data
        if (guestXimatar && catalogMap.has(guestXimatar.toLowerCase())) {
          const catalogItem = catalogMap.get(guestXimatar.toLowerCase());
          if (catalogItem) {
            setXimatarData({
              id: catalogItem.id,
              label: catalogItem.label,
              image_url: normalizeXimatarImageUrl(catalogItem.image_url),
              translations: catalogItem.translation || {
                title: '',
                core_traits: '',
                behavior: '',
                weaknesses: '',
                ideal_roles: ''
              }
            });
          }
        }
        
        setTimeout(() => {
          setIsAnalyzing(false);
          setShowResults(true);
        }, 1500);
        return;
      }
      
      if (!user?.id) {
        setHasNoAssessment(true);
        setIsAnalyzing(false);
        return;
      }

      // Authenticated user - fetch latest assessment
      const resultId = localStorage.getItem('current_result_id');
      
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = 2000;

      const pollResults = async (): Promise<boolean> => {
        // Fetch the latest completed assessment
        const { data: result, error } = await supabase
          .from('assessment_results')
          .select('id, ximatar_id, total_score, computed_at')
          .eq('user_id', user.id)
          .eq('completed', true)
          .order('computed_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching assessment:', error);
          return false;
        }

        if (!result || !result.ximatar_id) {
          return false;
        }

        // Fetch XIMAtar info with translations
        const { data: ximatarInfo, error: ximatarError } = await supabase
          .from('ximatars')
          .select(`
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
          `)
          .eq('id', result.ximatar_id)
          .eq('ximatar_translations.lang', currentLang)
          .maybeSingle();

        if (ximatarError) {
          console.error('Error fetching XIMAtar:', ximatarError);
          return false;
        }

        if (ximatarInfo) {
          const translations = Array.isArray(ximatarInfo.ximatar_translations) 
            ? ximatarInfo.ximatar_translations[0] 
            : ximatarInfo.ximatar_translations;

          setXimatarData({
            id: ximatarInfo.id,
            label: ximatarInfo.label,
            image_url: normalizeXimatarImageUrl(ximatarInfo.image_url),
            translations: translations || {
              title: '',
              core_traits: '',
              behavior: '',
              weaknesses: '',
              ideal_roles: ''
            }
          });
        }

        // Fetch pillar scores
        const { data: scores, error: scoresError } = await supabase
          .from('pillar_scores')
          .select('pillar, score')
          .eq('assessment_result_id', result.id)
          .order('score', { ascending: false });

        if (scoresError) {
          console.error('Error fetching pillar scores:', scoresError);
        }

        if (scores && scores.length > 0) {
          setPillarScores(scores);
          setTopPillars(scores.slice(0, 2).map(s => ({ name: s.pillar, score: s.score })));
        }

        setTotalScore(result.total_score);
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
          console.warn('Max polling attempts reached - no assessment found');
          setHasNoAssessment(true);
          setIsAnalyzing(false);
          setShowResults(true);
        }
      };

      poll();
    };

    fetchComputedResults();
  }, [user, i18n.language, catalogLoading, catalogMap]);

  // Fetch open responses
  useEffect(() => {
    const fetchOpenResponses = async () => {
      const guestData = sessionStorage.getItem('guest_assessment_data');
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
        .select('open_key, answer, score, rubric, field_key')
        .eq('user_id', user.id)
        .eq('attempt_id', attemptId)
        .order('open_key', { ascending: true });

      if (!error && data && data.length > 0) {
        setOpenResponses(data as any);
        // Set fieldKey from the first response
        setFieldKey(data[0].field_key);
      }
    };

    if (showResults) {
      fetchOpenResponses();
    }
  }, [showResults, user]);

  const handleMentorSelect = async (mentor: any) => {
    console.log('[ResultsComparison] Mentor selected:', mentor);
    console.log('[ResultsComparison] isAuthenticated:', isAuthenticated, 'user?.id:', user?.id);
    
    setSelectedProfessional(mentor.id);
    localStorage.setItem('selected_professional_data', JSON.stringify(mentor));
    
    // Call assign-mentor edge function to create the mentor match
    if (isAuthenticated && user?.id) {
      console.log('[ResultsComparison] Calling assign-mentor edge function...');
      try {
        const { data, error } = await supabase.functions.invoke('assign-mentor', {
          body: { professional_id: mentor.id },
        });
        
        console.log('[ResultsComparison] Edge function response:', { data, error });
        
        if (error) {
          console.error('[ResultsComparison] Error assigning mentor:', error);
          toast({
            title: "Error",
            description: "Failed to assign mentor. Please try again.",
            variant: "destructive"
          });
        } else if (data?.success) {
          console.log('[ResultsComparison] Mentor assigned successfully:', data.mentor);
          toast({
            title: "Success",
            description: "Mentor assigned successfully!",
          });
        }
      } catch (error) {
        console.error('[ResultsComparison] Failed to assign mentor:', error);
        toast({
          title: "Error", 
          description: "Failed to assign mentor. Please try again.",
          variant: "destructive"
        });
      }
    } else {
      console.log('[ResultsComparison] Not calling edge function - user not authenticated or no user ID');
    }
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
          <h2 className="text-2xl font-bold mb-2 font-heading">{t('results.analyzing')}</h2>
          <p className="text-muted-foreground">{t('results.analyzing_subtitle')}</p>
        </div>
      </div>
    );
  }

  if (hasNoAssessment) {
    return (
      <div className="text-center space-y-6 py-12">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2 font-heading">{t('results.no_assessment')}</h2>
          <p className="text-muted-foreground mb-6">{t('results.no_assessment_subtitle')}</p>
          <Button onClick={() => navigate('/ximatar-journey')} size="lg">
            {t('results.start_assessment')}
          </Button>
        </div>
      </div>
    );
  }

  // Calculate Drive level
  const driveScore = pillarScores.find(p => p.pillar === 'drive')?.score || 0;
  const getDriveLevel = (score: number): 'high' | 'medium' | 'low' => {
    if (score >= 7.5) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  };
  const driveLevel = getDriveLevel(driveScore);

  // Get strongest and weakest pillars (excluding Drive)
  const nonDrivePillars = pillarScores.filter(p => p.pillar !== 'drive');
  const sortedPillars = [...nonDrivePillars].sort((a, b) => b.score - a.score);
  const strongestPillar = sortedPillars[0];
  const weakestPillar = sortedPillars[sortedPillars.length - 1];

  return (
    <div className="space-y-8">
      {/* Storytelling Introduction */}
      <Card className="p-8 bg-gradient-to-br from-primary/5 via-background to-primary/5 border-primary/10 animate-fade-in">
        <div className="text-center space-y-4">
          <Sparkles className="h-12 w-12 text-primary mx-auto mb-4 animate-scale-in" />
          <h2 className="text-3xl font-bold font-heading animate-fade-in" style={{ animationDelay: '100ms' }}>
            {t('ximatarJourney.results_title')}
          </h2>
          <div className="prose prose-lg mx-auto text-muted-foreground max-w-2xl space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <p className="italic text-lg">{t('ximatarJourney.results_tagline')}</p>
            <p>{t('ximatarJourney.results_archetype_body')}</p>
          </div>
        </div>
      </Card>

      {/* XIMAtar Profile */}
      {ximatarData && (
        <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <XimatarProfileCard ximatar={ximatarData} />
        </div>
      )}

      {/* How Your XIMAtar Was Determined */}
      {strongestPillar && weakestPillar && (
        <Card className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <h3 className="text-xl font-bold mb-4 text-center font-heading">{t('ximatarJourney.assignment_logic')}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 flex-wrap animate-scale-in" style={{ animationDelay: '500ms' }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 animate-scale-in" />
                <span className="font-semibold">{t('ximatarJourney.your_edge_label')}</span>
              </div>
              <Badge variant="default" className="px-4 py-2 text-base capitalize hover-scale">
                {t(`pillars.${strongestPillar.pillar === 'computational_power' ? 'computational' : strongestPillar.pillar}.name`)} ({strongestPillar.score.toFixed(1)})
              </Badge>
            </div>
            
            <div className="flex items-center justify-center gap-3 flex-wrap animate-scale-in" style={{ animationDelay: '600ms' }}>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500 animate-scale-in" />
                <span className="font-semibold">{t('ximatarJourney.your_friction_label')}</span>
              </div>
              <Badge variant="outline" className="px-4 py-2 text-base capitalize hover-scale">
                {t(`pillars.${weakestPillar.pillar === 'computational_power' ? 'computational' : weakestPillar.pillar}.name`)} ({weakestPillar.score.toFixed(1)})
              </Badge>
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap animate-scale-in" style={{ animationDelay: '700ms' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary animate-scale-in" />
                <span className="font-semibold">{t('ximatarJourney.your_trajectory_label')}</span>
              </div>
              <Badge 
                variant="secondary" 
                className={`
                  px-4 py-2 text-base capitalize hover-scale
                  transition-all duration-300
                  ${driveLevel === 'high' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                    driveLevel === 'medium' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                    'bg-orange-500/10 text-orange-700 dark:text-orange-400'
                  }
                `}
              >
                {t(`ximatarJourney.drive_${driveLevel}_label`)} ({driveScore.toFixed(1)})
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Drive Path Explanation */}
      <Card className="p-6 overflow-hidden">
        <h3 className="text-xl font-bold mb-4 font-heading">{t('ximatarJourney.drive_section_title')}</h3>
        <p className="text-muted-foreground mb-4">{t('ximatarJourney.drive_section_body')}</p>
        <div className="space-y-3">
          {/* High Drive */}
          <div 
            className={`
              p-4 rounded-lg border-2 
              transition-all duration-500 ease-out
              ${driveLevel === 'high' 
                ? 'bg-green-500/5 border-green-500/20 shadow-lg shadow-green-500/10 scale-[1.02] animate-fade-in' 
                : 'border-border/50 hover:border-green-500/10 hover:bg-green-500/[0.02]'
              }
            `}
            style={{
              animation: driveLevel === 'high' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) 1' : 'none'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`
                font-semibold text-green-600 dark:text-green-400
                transition-all duration-300
                ${driveLevel === 'high' ? 'scale-105' : ''}
              `}>
                {t('ximatarJourney.drive_high_label')}
              </span>
              {driveLevel === 'high' && (
                <Badge 
                  variant="default" 
                  className="text-xs animate-scale-in bg-green-600 hover:bg-green-700"
                >
                  {t('ximatarJourney.drive_you_badge')}
                </Badge>
              )}
            </div>
            <p className={`
              text-sm text-muted-foreground
              transition-opacity duration-300
              ${driveLevel === 'high' ? 'opacity-100' : 'opacity-75'}
            `}>
              {t('ximatarJourney.drive_high_body')}
            </p>
          </div>
          
          {/* Medium Drive */}
          <div 
            className={`
              p-4 rounded-lg border-2 
              transition-all duration-500 ease-out
              ${driveLevel === 'medium' 
                ? 'bg-blue-500/5 border-blue-500/20 shadow-lg shadow-blue-500/10 scale-[1.02] animate-fade-in' 
                : 'border-border/50 hover:border-blue-500/10 hover:bg-blue-500/[0.02]'
              }
            `}
            style={{
              animation: driveLevel === 'medium' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) 1' : 'none'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`
                font-semibold text-blue-600 dark:text-blue-400
                transition-all duration-300
                ${driveLevel === 'medium' ? 'scale-105' : ''}
              `}>
                {t('ximatarJourney.drive_medium_label')}
              </span>
              {driveLevel === 'medium' && (
                <Badge 
                  variant="default" 
                  className="text-xs animate-scale-in bg-blue-600 hover:bg-blue-700"
                >
                  {t('common.you', 'You')}
                </Badge>
              )}
            </div>
            <p className={`
              text-sm text-muted-foreground
              transition-opacity duration-300
              ${driveLevel === 'medium' ? 'opacity-100' : 'opacity-75'}
            `}>
              {t('ximatar_intro.drive_paths.medium_desc')}
            </p>
          </div>
          
          {/* Low Drive */}
          <div 
            className={`
              p-4 rounded-lg border-2 
              transition-all duration-500 ease-out
              ${driveLevel === 'low' 
                ? 'bg-orange-500/5 border-orange-500/20 shadow-lg shadow-orange-500/10 scale-[1.02] animate-fade-in' 
                : 'border-border/50 hover:border-orange-500/10 hover:bg-orange-500/[0.02]'
              }
            `}
            style={{
              animation: driveLevel === 'low' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) 1' : 'none'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`
                font-semibold text-orange-600 dark:text-orange-400
                transition-all duration-300
                ${driveLevel === 'low' ? 'scale-105' : ''}
              `}>
                {t('ximatar_intro.drive_paths.low')}
              </span>
              {driveLevel === 'low' && (
                <Badge 
                  variant="default" 
                  className="text-xs animate-scale-in bg-orange-600 hover:bg-orange-700"
                >
                  {t('common.you', 'You')}
                </Badge>
              )}
            </div>
            <p className={`
              text-sm text-muted-foreground
              transition-opacity duration-300
              ${driveLevel === 'low' ? 'opacity-100' : 'opacity-75'}
            `}>
              {t('ximatar_intro.drive_paths.low_desc')}
            </p>
          </div>
        </div>
      </Card>

      {pillarScores.length > 0 && (
        <Card className="animate-fade-in" style={{ animationDelay: '800ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <Sparkles className="text-primary animate-scale-in" />
              {t('results.assessment_scores')}
            </CardTitle>
            {totalScore !== null && (
              <p className="text-sm text-muted-foreground">
                {t('results.total_score')}: <span className="font-bold text-primary">{totalScore.toFixed(1)}/50</span>
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {pillarScores.map((pillar, index) => {
              // Map database pillar names to translation keys
              const pillarKeyMap: Record<string, string> = {
                'computational_power': 'computational',
                'communication': 'communication',
                'knowledge': 'knowledge',
                'creativity': 'creativity',
                'drive': 'drive'
              };
              const translationKey = pillarKeyMap[pillar.pillar] || pillar.pillar;
              
              return (
                <div 
                  key={pillar.pillar} 
                  className="space-y-2 animate-fade-in"
                  style={{ animationDelay: `${900 + (index * 100)}ms` }}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium capitalize">
                      {t(`pillars.${translationKey}.name`)}
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {pillar.score.toFixed(1)}/10
                    </span>
                  </div>
                  <Progress 
                    value={pillar.score * 10} 
                    className="h-2 transition-all duration-500" 
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="p-8">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold mb-2 font-heading">{t('professionals.title')}</h3>
          <p className="text-muted-foreground mb-2">{t('professionals.subtitle')}</p>
          <p className="text-sm font-medium text-primary">{t('mentors.choose_to_continue')}</p>
        </div>
        
        <FeaturedProfessionals 
          onSelect={handleMentorSelect}
          selectedId={selectedProfessional || undefined}
          pillarScores={pillarScores}
          ximatar={ximatarData?.label}
        />

        {selectedProfessional && (
          <div className="text-center mt-8 animate-scale-in">
            <Button 
              size="lg"
              onClick={handleProceedWithSelection}
              className="px-8 py-4 hover-scale"
            >
              {isAuthenticated ? t('results.proceed_to_dashboard') : t('results.register_to_continue')}
              <ArrowRight size={20} className="ml-2" />
            </Button>
          </div>
        )}
      </Card>

      {!hasCv && openResponses.length > 0 && (
        <div className="space-y-6 animate-fade-in" style={{ animationDelay: '1000ms' }}>
          <Card className="p-8">
            <h3 className="text-2xl font-bold mb-6 text-center font-heading">{t('open_scoring.title')}</h3>
            <div className="space-y-6">
              {openResponses.map((response, index) => (
                <div 
                  key={response.open_key}
                  className="animate-fade-in"
                  style={{ animationDelay: `${1100 + (index * 100)}ms` }}
                >
                  <OpenAnswerScore
                    openKey={response.open_key}
                    answer={response.answer}
                    rubric={response.rubric}
                    fieldKey={fieldKey || undefined}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Closing Message - The Compass */}
      <Card className="p-8 bg-gradient-to-br from-primary/5 via-background to-primary/5 border-primary/10 animate-fade-in" style={{ animationDelay: '1200ms' }}>
        <div className="text-center space-y-4">
          <p className="text-lg italic text-muted-foreground max-w-2xl mx-auto animate-scale-in" style={{ animationDelay: '1300ms' }}>
            {t('ximatar_intro.compass')}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ResultsComparison;
