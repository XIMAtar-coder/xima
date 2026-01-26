import { supabase } from '@/integrations/supabase/client';
import { getConsentRecords } from '@/lib/legal/consentVersions';

export interface RecordConsentResult {
  success: boolean;
  error?: string;
}

/**
 * Records user consent to privacy policy and terms of service.
 * Must be called immediately after successful signup.
 */
export const recordUserConsents = async (
  userId: string,
  locale: string
): Promise<RecordConsentResult> => {
  try {
    const consents = getConsentRecords(locale);
    
    const insertData = consents.map((consent) => ({
      user_id: userId,
      consent_type: consent.consent_type,
      consent_version: consent.consent_version,
      locale: consent.locale,
      user_agent: consent.user_agent,
    }));

    const { error } = await supabase
      .from('user_consents')
      .insert(insertData);

    if (error) {
      console.error('[Consent] Failed to record consents:', error);
      return { success: false, error: error.message };
    }

    console.log('[Consent] Successfully recorded consents for user:', userId);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Consent] Exception recording consents:', message);
    return { success: false, error: message };
  }
};

/**
 * Hook for consent recording operations
 */
export const useConsentRecording = () => {
  return { recordUserConsents };
};
