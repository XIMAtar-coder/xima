// Consent version identifiers - update these when legal documents change
export const PRIVACY_VERSION = "2026-01-27-v1";
export const TERMS_VERSION = "2026-01-27-v1";

export type ConsentType = 'privacy' | 'terms';

export interface ConsentRecord {
  consent_type: ConsentType;
  consent_version: string;
  locale?: string;
  user_agent?: string;
}

export const getConsentRecords = (locale: string): ConsentRecord[] => [
  {
    consent_type: 'privacy',
    consent_version: PRIVACY_VERSION,
    locale,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  },
  {
    consent_type: 'terms',
    consent_version: TERMS_VERSION,
    locale,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  },
];
