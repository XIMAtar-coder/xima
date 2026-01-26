import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface CompanyLegal {
  id: string;
  business_id: string;
  legal_name: string | null;
  street_address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  vat_number: string | null;
  registration_number: string | null;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
}

export type CompanyLegalInput = Omit<CompanyLegal, 'id' | 'business_id' | 'created_at' | 'updated_at'>;

const COMPANY_LEGAL_KEY = 'companyLegal';

export function useCompanyLegal() {
  const { businessProfile } = useBusinessProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: [COMPANY_LEGAL_KEY, businessProfile?.id],
    queryFn: async (): Promise<CompanyLegal | null> => {
      if (!businessProfile?.id) return null;

      const { data, error } = await supabase
        .from('company_legal')
        .select('*')
        .eq('business_id', businessProfile.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[useCompanyLegal] Error:', error);
        throw error;
      }

      return data as CompanyLegal | null;
    },
    enabled: !!businessProfile?.id,
    staleTime: 30_000,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: CompanyLegalInput) => {
      if (!businessProfile?.id) {
        throw new Error('Business profile not found');
      }

      const payload = {
        business_id: businessProfile.id,
        ...input,
      };

      // Check if record exists
      const { data: existing } = await supabase
        .from('company_legal')
        .select('id')
        .eq('business_id', businessProfile.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('company_legal')
          .update(input)
          .eq('business_id', businessProfile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_legal')
          .insert(payload);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPANY_LEGAL_KEY, businessProfile?.id] });
      toast({
        title: t('business.legal.save_success'),
        description: t('business.legal.save_success_description'),
      });
    },
    onError: (error: Error) => {
      console.error('[useCompanyLegal] Upsert error:', error);
      toast({
        title: t('business.legal.save_error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    companyLegal: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    upsert: upsertMutation.mutate,
    isUpserting: upsertMutation.isPending,
  };
}
