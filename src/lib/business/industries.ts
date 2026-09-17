/**
 * Single list of company industries, shared by business registration and
 * business settings. Registration used to offer 15 values and settings 9
 * different ones, so a company that registered as "automotive" opened settings
 * to an empty industry field — and saving wrote the blank back.
 *
 * Values are stored as-is in business_profiles.manual_industry. Labels live
 * under businessRegistration.industries.<value> in the locale files.
 */

export const INDUSTRIES = [
  'technology',
  'engineering',
  'finance',
  'consulting',
  'manufacturing',
  'automotive',
  'energy',
  'healthcare',
  'education',
  'media',
  'retail',
  'food',
  'real_estate',
  'nonprofit',
  'government',
  'other',
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export function isKnownIndustry(value: string | null | undefined): value is Industry {
  return !!value && (INDUSTRIES as readonly string[]).includes(value);
}

/**
 * Map a stored value onto the shared list when it is only a casing/spacing
 * variant ("Automotive", "real estate"). Anything else is returned unchanged
 * so the caller can still show it instead of blanking it.
 */
export function normalizeIndustry(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  const key = trimmed.toLowerCase().replace(/[\s-]+/g, '_');
  return isKnownIndustry(key) ? key : trimmed;
}

export const industryLabelKey = (value: Industry) => `businessRegistration.industries.${value}`;
