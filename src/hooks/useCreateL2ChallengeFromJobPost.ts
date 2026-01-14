import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUser } from '@/context/UserContext';

interface JobPost {
  id: string;
  title: string;
  description?: string | null;
  responsibilities?: string | null;
  requirements_must?: string | null;
  requirements_nice?: string | null;
  locale?: string | null;
}

interface CreateL2ChallengeResult {
  success: boolean;
  challengeId?: string;
  status?: 'ready' | 'needs_review' | 'failed';
  error?: string;
}

export function useCreateL2ChallengeFromJobPost() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  const createL2Challenge = useCallback(async (jobPost: JobPost): Promise<CreateL2ChallengeResult> => {
    if (!user?.id) {
      toast.error(t('common.error'));
      return { success: false, error: 'Not authenticated' };
    }

    setCreatingFor(jobPost.id);

    try {
      // Step 1: Create challenge draft with generation_status='generating'
      const { data: newChallenge, error: createError } = await supabase
        .from('business_challenges')
        .insert({
          business_id: user.id,
          title: jobPost.title,
          description: jobPost.description?.substring(0, 2000) || null,
          status: 'draft',
          job_post_id: jobPost.id,
          created_from_job_post: true,
          level: 2,
          generation_status: 'generating',
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating challenge draft:', createError);
        throw new Error(createError.message);
      }

      const challengeId = newChallenge.id;
      console.log('[useCreateL2Challenge] Challenge draft created:', challengeId);

      // Step 2: Call edge function to generate L2 config
      const locale = jobPost.locale || i18n.language || 'en';
      
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;

      if (!accessToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-l2-challenge-from-job-post`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            challenge_id: challengeId,
            job_post_id: jobPost.id,
            locale,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[useCreateL2Challenge] Edge function error:', response.status, errorData);
        
        // Update challenge to needs_review status
        await supabase
          .from('business_challenges')
          .update({
            generation_status: 'needs_review',
            generation_error: errorData.error || `HTTP ${response.status}`,
          })
          .eq('id', challengeId);

        if (response.status === 429) {
          toast.error(t('business.challenges.rate_limit', 'Rate limit exceeded. Please try again.'));
        } else if (response.status === 402) {
          toast.error(t('business.challenges.credits_exhausted', 'AI credits exhausted.'));
        } else {
          toast.warning(t('business.challenges.created_needs_review', 'Challenge created but needs manual configuration.'));
        }

        navigate(`/business/challenges/${challengeId}`);
        return { success: true, challengeId, status: 'needs_review' };
      }

      const result = await response.json();
      console.log('[useCreateL2Challenge] Generation result:', result);

      if (result.status === 'needs_review') {
        toast.warning(t('business.challenges.created_needs_review', 'Challenge created but needs manual configuration.'));
      } else {
        toast.success(t('business.challenges.l2_created', 'Level 2 challenge created from job post!'));
      }

      // Navigate to challenge editor
      navigate(`/business/challenges/${challengeId}`);

      return {
        success: true,
        challengeId,
        status: result.status,
        error: result.error,
      };

    } catch (err: any) {
      console.error('[useCreateL2Challenge] Error:', err);
      toast.error(err.message || t('common.error'));
      return { success: false, error: err.message };
    } finally {
      setCreatingFor(null);
    }
  }, [user?.id, navigate, t, i18n.language]);

  return {
    createL2Challenge,
    creatingFor,
    isCreating: creatingFor !== null,
  };
}
