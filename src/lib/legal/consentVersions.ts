// Consent version identifiers - update these when legal documents change
export const PRIVACY_VERSION = "2026-01-27-v1";
export const TERMS_VERSION = "2026-01-27-v1";
export const CV_PROCESSING_VERSION = "2026-06-13-v1";

export type ConsentType = 'privacy' | 'terms' | 'cv_processing';

export interface ConsentRecord {
  consent_type: ConsentType;
  consent_version: string;
  locale?: string;
  user_agent_hash?: string;
}

export interface GuestCvConsentRecord {
  version: string;
  locale: string;
  accepted_at: string;
  user_agent_hash?: string;
}

/**
 * SHA-256 hex hash of a string using SubtleCrypto. Used to store
 * one-way fingerprints of PII (user agent) instead of the raw value.
 */
export const sha256Hex = async (input: string): Promise<string> => {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) return '';
    const enc = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return '';
  }
};

const getUserAgentHash = async (): Promise<string | undefined> => {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return undefined;
  const h = await sha256Hex(navigator.userAgent);
  return h || undefined;
};

export const getConsentRecords = async (locale: string): Promise<ConsentRecord[]> => {
  const user_agent_hash = await getUserAgentHash();
  return [
    {
      consent_type: 'privacy',
      consent_version: PRIVACY_VERSION,
      locale,
      user_agent_hash,
    },
    {
      consent_type: 'terms',
      consent_version: TERMS_VERSION,
      locale,
      user_agent_hash,
    },
  ];
};
