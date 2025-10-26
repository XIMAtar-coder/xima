import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FeaturedProfessionals, { type FieldKey } from '@/components/FeaturedProfessionals';
import XimaScoreCard from '@/components/XimaScoreCard';
import { OpenAnswerScore } from '@/components/ximatar-journey/OpenAnswerScore';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import { getXimatarImageUrl } from '@/lib/ximatar/image';
import type { Rubric } from '@/lib/scoring/openResponse';
import { useNavigate } from 'react-router-dom';

const RisultatiXimatar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useUser();
  const { resolvedTheme } = useTheme();
  const [selectedField] = useState<FieldKey>(() => (localStorage.getItem('preferred_field') as FieldKey) || 'business_leadership');

  const [assignedXimatar, setAssignedXimatar] = useState<any>(null);
  const [assessmentPillars, setAssessmentPillars] = useState<any>(null);
  const [top3Matches, setTop3Matches] = useState<any[]>([]);
  const [openResponses, setOpenResponses] = useState<Array<{ open_key: 'open1' | 'open2'; answer: string; score: number; rubric: Rubric }>>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // latest assessment result with joined ximatar
      const { data: latestResult } = await supabase
        .from('assessment_results')
        .select(`
          pillars,
          top3,
          ximatar_id,
          ximatars (
            id,
            label,
            image_url,
            updated_at,
            vector,
            ximatar_translations (
              lang,
              title,
              core_traits
            )
          )
        `)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestResult?.ximatars) {
        const ximatarData = latestResult.ximatars as any;
        const lang = localStorage.getItem('i18nextLng') || 'it';
        const translation = ximatarData.ximatar_translations?.find((t: any) => t.lang === lang) || ximatarData.ximatar_translations?.[0];
        setAssignedXimatar({
          ...ximatarData,
          name: translation?.title || ximatarData.label,
          traits: translation?.core_traits ? translation.core_traits.split(' – ') : []
        });
      }

      if (latestResult?.pillars) {
        const p: any = latestResult.pillars;
        setAssessmentPillars({
          computational: p.comp_power || 0,
          communication: p.communication || 0,
          knowledge: p.knowledge || 0,
          creativity: p.creativity || 0,
          drive: p.drive || 0
        });
      }

      if (latestResult?.top3 && Array.isArray(latestResult.top3)) setTop3Matches(latestResult.top3);

      // open answers by attempt
      const attemptId = localStorage.getItem('current_attempt_id');
      if (attemptId && user?.id) {
        const { data: openData } = await supabase
          .from('assessment_open_responses')
          .select('open_key, answer, score, rubric')
          .eq('user_id', user.id)
          .eq('attempt_id', attemptId)
          .order('open_key', { ascending: true });
        if (openData) setOpenResponses(openData as any);
      }
    };
    fetchData();
  }, [user?.id]);

  const handleProfessionalSelect = (professional: any) => {
    setSelectedProfessional(professional.id);
    localStorage.setItem('selected_professional_data', JSON.stringify(professional));
  };

  const proceed = () => {
    if (!selectedProfessional) return;
    const professionalData = JSON.parse(localStorage.getItem('selected_professional_data') || '{}');
    localStorage.setItem('ximatar_journey_data', JSON.stringify({
      ximatar: assignedXimatar,
      professional: professionalData,
      pillars: assessmentPillars
    }));
    navigate(isAuthenticated ? '/profile' : '/register');
  };

  const logoSrc = (resolvedTheme === 'dark') ? '/assets/logo_dark.png' : '/assets/logo_light.png';

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto py-8">
        <div className="text-center mb-8">
          <img src={logoSrc} alt="XIMA Logo" className="h-14 w-auto mx-auto mb-3" />
          <h1 className="text-4xl font-bold mb-2">Il Tuo Viaggio Ximatar</h1>
          <p className="text-muted-foreground">Scopri i tuoi punti di forza professionali attraverso la nostra valutazione completa</p>
        </div>

        {/* XIMAtar Reveal */}
        {assignedXimatar && (
          <Card className="p-8 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">I Tuoi Risultati Ximatar</h2>
              <p className="text-muted-foreground">La tua valutazione completa Ximatar è terminata</p>
            </div>
            <div className="flex flex-col items-center gap-6">
              <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-primary/20 bg-muted">
                {assignedXimatar.image_url ? (
                  <img
                    src={getXimatarImageUrl(assignedXimatar.image_url, assignedXimatar.updated_at) || ''}
                    alt={assignedXimatar.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">?</div>
                )}
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">{assignedXimatar.name}</h3>
                {assignedXimatar.traits?.length > 0 && (
                  <div className="text-sm text-muted-foreground">{assignedXimatar.traits.join(' • ')}</div>
                )}
              </div>
              {top3Matches.length > 0 && (
                <div className="mt-2">
                  <div className="text-sm text-muted-foreground text-center mb-2">Altri profili compatibili</div>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {top3Matches.map((m: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{m.label || m.key} ({(m.score * 100).toFixed(0)}%)</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Professionals */}
        <Card className="p-8 mb-8">
          <h3 className="text-2xl font-bold mb-6 text-center">Scegli il tuo professionista</h3>
          <p className="text-center text-muted-foreground mb-8">Seleziona il professionista più adatto ai tuoi obiettivi</p>
          <FeaturedProfessionals onSelect={handleProfessionalSelect} fieldKey={selectedField} />
          {selectedProfessional && (
            <div className="text-center mt-8">
              <Button size="lg" onClick={proceed}>
                {isAuthenticated ? 'Vai al Profilo' : 'Registrati'}
              </Button>
            </div>
          )}
        </Card>

        {/* Pillars */}
        {assessmentPillars && (
          <Card className="p-8 mb-8">
            <h3 className="text-xl font-semibold text-center mb-6">I tuoi punteggi XIMA</h3>
            <XimaScoreCard pillars={assessmentPillars} showTooltip />
          </Card>
        )}

        {/* Open answers */}
        {openResponses.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-center">Valutazione risposte aperte</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openResponses.map((response) => (
                <OpenAnswerScore key={response.open_key} openKey={response.open_key} rubric={response.rubric} answer={response.answer} />
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default RisultatiXimatar;
