/**
 * Custom L1 AI challenge runner (candidate side).
 *
 * Triggers when `business_challenges.config_json.custom_l1_ai === true`.
 *
 * Renders the N AI-generated free-text questions from
 * `config_json.questions: [{ id, title, text }]`. On submit:
 *   1. Persists the answers in `challenge_submissions.submitted_payload`
 *      with `_format: 'custom_l1_ai'`.
 *   2. Marks the invitation as `submitted`.
 *
 * NO AI calls at submit time. Scoring is on-demand from the business panel
 * via `analyze-open-answer` with `format: 'custom_l1'` (single holistic
 * 5-pillar reading + one trajectory nudge per invitation). This mirrors
 * the L2-conversation pattern.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { CharacterCountTextarea } from '@/components/candidate/CharacterCountTextarea';
import { CheckCircle, Loader2, Send, Target } from 'lucide-react';

interface CustomQuestion {
  id: string;
  title: string;
  text: string;
}

interface CustomL1Config {
  custom_l1_ai?: boolean;
  questions?: CustomQuestion[];
  candidate_intro?: string;
  context_tag?: string;
  params?: { locale?: string };
}

interface Props {
  invitationId: string;
  challengeId: string;
  challengeTitle: string;
  scenarioMarkdownDescription: string | null;
  companyName: string;
  config: CustomL1Config;
  locale: string;
  // Authoritative invitation fields (already fetched by parent).
  candidateProfileId: string;
  businessId: string;
  hiringGoalId: string;
}

const MIN_CHARS = 80;

export default function CustomL1Challenge({
  invitationId,
  challengeId,
  challengeTitle,
  scenarioMarkdownDescription,
  companyName,
  config,
  locale,
  candidateProfileId,
  businessId,
  hiringGoalId,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const questions = useMemo<CustomQuestion[]>(
    () => (Array.isArray(config.questions) ? config.questions : []),
    [config.questions]
  );

  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, '']))
  );
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'submitted'>('draft');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load any existing draft / submitted answers for this invitation.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sub } = await supabase
        .from('challenge_submissions')
        .select('id, status, submitted_payload, draft_payload')
        .eq('invitation_id', invitationId)
        .maybeSingle();
      if (cancelled) return;
      if (sub) {
        setSubmissionId(sub.id);
        setStatus((sub.status as 'draft' | 'submitted') || 'draft');
        const payload =
          (sub.status === 'submitted' ? sub.submitted_payload : sub.draft_payload) as
            | Record<string, string>
            | null;
        if (payload && typeof payload === 'object') {
          setAnswers((cur) => ({ ...cur, ...payload }));
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [invitationId]);

  const allFilled = questions.every((q) => (answers[q.id] || '').trim().length >= MIN_CHARS);
  const isReadOnly = status === 'submitted';

  const updateAnswer = (id: string, value: string) => {
    setAnswers((cur) => ({ ...cur, [id]: value }));
  };

  const handleSubmit = async () => {
    if (status === 'submitted') return;
    if (!allFilled) {
      toast({
        title: t('challenge.validation.incomplete', 'Risposte incomplete'),
        description: t('challenge.custom_l1.min_chars_hint', 'Ogni risposta deve avere almeno {{n}} caratteri.', { n: MIN_CHARS }),
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const submittedPayload = { ...answers, _format: 'custom_l1_ai' };

      // 1) Upsert submission row.
      const { data: subRow, error: subErr } = await supabase
        .from('challenge_submissions')
        .upsert(
          {
            invitation_id: invitationId,
            candidate_profile_id: candidateProfileId,
            business_id: businessId,
            hiring_goal_id: hiringGoalId,
            challenge_id: challengeId,
            status: 'submitted',
            submitted_payload: submittedPayload as any,
            draft_payload: submittedPayload as any,
            submitted_at: now,
            signals_version: 'v1',
          },
          { onConflict: 'invitation_id' }
        )
        .select('id')
        .single();

      if (subErr) throw subErr;
      if (subRow) setSubmissionId(subRow.id);

      // 2) Mark invitation submitted.
      await supabase
        .from('challenge_invitations')
        .update({ status: 'submitted', responded_at: now })
        .eq('id', invitationId);

      // NOTE: scoring is on-demand from the business side via
      // analyze-open-answer (format: 'custom_l1'). We do NOT call AI here:
      // per-question nudges would over-credit the pillar trajectory.

      setStatus('submitted');
      toast({ title: t('challenge.submission_success', 'Risposte inviate') });
    } catch (err: any) {
      console.error('[CustomL1Challenge] submit failed:', err);
      toast({
        title: t('common.error', 'Errore'),
        description: err?.message || 'Submission failed',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (status === 'submitted') {
    return (
      <MainLayout>
        <div className="container max-w-3xl py-8 space-y-6">
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <Badge variant="outline" className="mb-4 bg-blue-500/10 text-blue-600 border-blue-500/30">
                {t('candidate.status.awaiting_review', 'In review')}
              </Badge>
              <h2 className="text-xl font-bold mb-2">{t('candidate.challenge.submitted_title', 'Risposte inviate')}</h2>
              <p className="text-muted-foreground">
                {t('candidate.challenge.submitted_helper', 'Stiamo elaborando le tue risposte per {{company}}.', { company: companyName })}
              </p>
            </CardContent>
          </Card>
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => navigate('/profile')}>
              {t('common.back_to_profile', 'Torna al profilo')}
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-3xl py-8 space-y-6">
        {/* Custom L1 Intro */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">
                  {t('candidate.challenge.custom_l1_title', 'Sfida soft-skills L1')}
                </h2>
                <p className="text-muted-foreground mb-2">
                  {config.candidate_intro ||
                    t(
                      'candidate.challenge.custom_l1_desc',
                      'Leggi lo scenario e rispondi alle domande con esempi concreti. Non c\'è una risposta giusta: vogliamo capire come ragioni.'
                    )}
                </p>
                {config.context_tag && (
                  <Badge variant="outline">{config.context_tag}</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scenario + questions block (rendered from the challenge description markdown) */}
        {scenarioMarkdownDescription && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{challengeTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground/90">
                {scenarioMarkdownDescription}
              </div>
            </CardContent>
          </Card>
        )}

        {/* One textarea per question */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t('candidate.challenge.your_answers', 'Le tue risposte')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((q, idx) => (
              <CharacterCountTextarea
                key={q.id}
                id={`q-${q.id}`}
                label={`${idx + 1}. ${q.title}`}
                value={answers[q.id] || ''}
                onChange={(v) => updateAnswer(q.id, v)}
                placeholder={q.text}
                disabled={isReadOnly}
                required
                rows={5}
                minChars={MIN_CHARS}
              />
            ))}
          </CardContent>
        </Card>

        {/* Submit */}
        <Card>
          <CardContent className="py-4 flex items-center justify-end">
            <Button onClick={handleSubmit} disabled={submitting || !allFilled}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {t('challenge.submit_btn', 'Invia risposte')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
