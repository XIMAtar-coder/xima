import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PersonalizedChallengeProps {
  userId: string;
  ximatarType?: string;
  pillarScores?: Array<{ pillar: string; score: number }>;
}

export const PersonalizedChallenge: React.FC<PersonalizedChallengeProps> = ({
  userId,
  ximatarType,
  pillarScores,
}) => {
  const { t, i18n } = useTranslation();
  const [challenge, setChallenge] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateChallenge = async () => {
      try {
        // Find weakest pillar
        const sortedPillars = pillarScores
          ? [...pillarScores].sort((a, b) => a.score - b.score)
          : [];
        const weakestPillar = sortedPillars[0]?.pillar || 'drive';

        // Check if CV analysis exists
        const { data: cvAnalysis } = await supabase
          .from('assessment_cv_analysis')
          .select('summary, pillar_vector')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Generate challenge based on context
        const lang = i18n.language.split('-')[0];
        const challengeContext = {
          ximatar: ximatarType || 'unknown',
          weakestPillar,
          hasCv: !!cvAnalysis,
          lang,
        };

        // Generate context-aware challenge
        const challenges: Record<string, Record<string, string>> = {
          en: {
            computational_power: `Tackle a complex problem this week: Break down a challenging task at work into smaller logical steps. Document your process and identify one way to automate or optimize it.`,
            communication: `Practice active listening: In your next three conversations, focus entirely on understanding before responding. Ask clarifying questions and summarize what you heard.`,
            knowledge: `Deep dive learning: Choose one skill relevant to your ${ximatarType} profile and spend 3 hours this week learning it thoroughly. Share what you learned with someone.`,
            creativity: `Innovation challenge: Take a routine task and brainstorm 5 completely different ways to approach it. Try implementing the most promising idea.`,
            drive: `Goal sprint: Set one ambitious but achievable goal for this week. Break it into daily actions and track your progress. Celebrate when you achieve it.`,
          },
          it: {
            computational_power: `Affronta un problema complesso questa settimana: Scomponi un compito impegnativo al lavoro in passaggi logici più piccoli. Documenta il tuo processo e identifica un modo per automatizzarlo od ottimizzarlo.`,
            communication: `Pratica l'ascolto attivo: Nelle tue prossime tre conversazioni, concentrati completamente sulla comprensione prima di rispondere. Fai domande di chiarimento e riassumi ciò che hai sentito.`,
            knowledge: `Apprendimento approfondito: Scegli una competenza rilevante per il tuo profilo ${ximatarType} e dedica 3 ore questa settimana ad apprenderla a fondo. Condividi ciò che hai imparato con qualcuno.`,
            creativity: `Sfida all'innovazione: Prendi un compito di routine e fai brainstorming di 5 modi completamente diversi per affrontarlo. Prova ad implementare l'idea più promettente.`,
            drive: `Sprint dell'obiettivo: Stabilisci un obiettivo ambizioso ma raggiungibile per questa settimana. Suddividilo in azioni quotidiane e traccia i tuoi progressi. Celebra quando lo raggiungi.`,
          },
          es: {
            computational_power: `Aborda un problema complejo esta semana: Descompón una tarea desafiante en el trabajo en pasos lógicos más pequeños. Documenta tu proceso e identifica una forma de automatizarlo u optimizarlo.`,
            communication: `Practica la escucha activa: En tus próximas tres conversaciones, concéntrate completamente en comprender antes de responder. Haz preguntas aclaratorias y resume lo que escuchaste.`,
            knowledge: `Aprendizaje profundo: Elige una habilidad relevante para tu perfil ${ximatarType} y dedica 3 horas esta semana a aprenderla a fondo. Comparte lo que aprendiste con alguien.`,
            creativity: `Desafío de innovación: Toma una tarea rutinaria y haz una lluvia de ideas de 5 formas completamente diferentes de abordarla. Intenta implementar la idea más prometedora.`,
            drive: `Sprint de objetivos: Establece un objetivo ambicioso pero alcanzable para esta semana. Divídelo en acciones diarias y rastrea tu progreso. Celebra cuando lo logres.`,
          },
        };

        const langChallenges = challenges[lang as keyof typeof challenges] || challenges.en;
        const generatedChallenge =
          langChallenges[weakestPillar as keyof typeof langChallenges] ||
          langChallenges.drive;

        setChallenge(generatedChallenge);
      } catch (error) {
        console.error('Error generating challenge:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      generateChallenge();
    }
  }, [userId, ximatarType, pillarScores, i18n.language]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('profile.challenge_for_you', 'Challenge for You')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t('profile.challenge_for_you', 'Challenge for You')}
          <Badge variant="secondary" className="ml-auto">
            {t('profile.this_week', 'This Week')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">{challenge}</p>
      </CardContent>
    </Card>
  );
};