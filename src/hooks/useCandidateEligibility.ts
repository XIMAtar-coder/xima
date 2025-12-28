import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CandidateEligibility {
  id: string;
  candidate_profile_id: string;
  business_id: string;
  hiring_goal_id: string;
  status: 'not_started' | 'pending_review' | 'eligible' | 'rejected';
  education_level: string | null;
  education_field: string | null;
  certificates_list: string[];
  language_level: string | null;
  language_notes: string | null;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EligibilityDocument {
  id: string;
  eligibility_id: string;
  doc_type: 'education' | 'certificate' | 'cv';
  label: string | null;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
}

export const useCandidateEligibility = (hiringGoalId: string | undefined) => {
  const [eligibility, setEligibility] = useState<CandidateEligibility | null>(null);
  const [documents, setDocuments] = useState<EligibilityDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEligibility = useCallback(async () => {
    if (!hiringGoalId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        setError('Profile not found');
        return;
      }

      // Fetch eligibility
      const { data: eligData, error: eligError } = await supabase
        .from('candidate_eligibility')
        .select('*')
        .eq('candidate_profile_id', profile.id)
        .eq('hiring_goal_id', hiringGoalId)
        .maybeSingle();

      if (eligError && eligError.code !== 'PGRST116') {
        console.error('Error fetching eligibility:', eligError);
        setError(eligError.message);
        return;
      }

      setEligibility(eligData as CandidateEligibility | null);

      // Fetch documents if eligibility exists
      if (eligData) {
        const { data: docs } = await supabase
          .from('eligibility_documents')
          .select('*')
          .eq('eligibility_id', eligData.id);
        
        setDocuments((docs || []) as EligibilityDocument[]);
      }

      setError(null);
    } catch (err) {
      console.error('Error in useCandidateEligibility:', err);
      setError('Failed to load eligibility');
    } finally {
      setLoading(false);
    }
  }, [hiringGoalId]);

  const createOrUpdateEligibility = useCallback(async (data: Partial<CandidateEligibility>, businessId: string) => {
    if (!hiringGoalId) throw new Error('No hiring goal ID');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) throw new Error('Profile not found');

    const payload = {
      candidate_profile_id: profile.id,
      business_id: businessId,
      hiring_goal_id: hiringGoalId,
      ...data
    };

    if (eligibility?.id) {
      const { error } = await supabase
        .from('candidate_eligibility')
        .update(payload)
        .eq('id', eligibility.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('candidate_eligibility')
        .insert(payload);
      if (error) throw error;
    }

    await fetchEligibility();
  }, [hiringGoalId, eligibility, fetchEligibility]);

  const uploadDocument = useCallback(async (
    file: File,
    docType: 'education' | 'certificate' | 'cv',
    label?: string
  ) => {
    if (!eligibility?.id) throw new Error('No eligibility record');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${eligibility.id}/${docType}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('eligibility_docs')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Create document record
    const { error: docError } = await supabase
      .from('eligibility_documents')
      .insert({
        eligibility_id: eligibility.id,
        doc_type: docType,
        label: label || file.name,
        storage_path: filePath,
        uploaded_by: user.id
      });

    if (docError) throw docError;

    await fetchEligibility();
  }, [eligibility, fetchEligibility]);

  const submitForReview = useCallback(async () => {
    if (!eligibility?.id) throw new Error('No eligibility record');

    const { error } = await supabase
      .from('candidate_eligibility')
      .update({ status: 'pending_review' })
      .eq('id', eligibility.id);

    if (error) throw error;
    await fetchEligibility();
  }, [eligibility, fetchEligibility]);

  useEffect(() => {
    fetchEligibility();
  }, [fetchEligibility]);

  return {
    eligibility,
    documents,
    loading,
    error,
    createOrUpdateEligibility,
    uploadDocument,
    submitForReview,
    refetch: fetchEligibility
  };
};

// Hook for business to check candidate eligibility
export const useCheckCandidateEligibility = (
  candidateProfileId: string | undefined,
  hiringGoalId: string | undefined
) => {
  const [status, setStatus] = useState<CandidateEligibility['status'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!candidateProfileId || !hiringGoalId) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('candidate_eligibility')
        .select('status')
        .eq('candidate_profile_id', candidateProfileId)
        .eq('hiring_goal_id', hiringGoalId)
        .maybeSingle();

      setStatus((data?.status as CandidateEligibility['status']) || null);
      setLoading(false);
    };

    check();
  }, [candidateProfileId, hiringGoalId]);

  return { status, loading, isEligible: status === 'eligible' };
};
