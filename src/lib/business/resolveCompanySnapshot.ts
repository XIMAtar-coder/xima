/**
 * Resolves company snapshot data from business profile with priority:
 * 1. Manual overrides (if snapshot_manual_override is true)
 * 2. Auto-extracted snapshot fields
 * 3. Fallback values from existing profile data
 */

export interface CompanySnapshot {
  hq_city: string | null;
  hq_country: string | null;
  hq_location: string | null; // Combined city + country
  industry: string | null;
  employees_count: number | null;
  revenue_range: string | null;
  founded_year: number | null;
  website: string | null;
  website_domain: string | null;
}

export interface BusinessProfileWithSnapshot {
  company_name?: string;
  website?: string;
  // Auto snapshot fields
  snapshot_hq_city?: string | null;
  snapshot_hq_country?: string | null;
  snapshot_industry?: string | null;
  snapshot_employees_count?: number | null;
  snapshot_revenue_range?: string | null;
  snapshot_founded_year?: number | null;
  snapshot_last_enriched_at?: string | null;
  // Manual override fields
  manual_hq_city?: string | null;
  manual_hq_country?: string | null;
  manual_industry?: string | null;
  manual_employees_count?: number | null;
  manual_revenue_range?: string | null;
  manual_founded_year?: number | null;
  manual_website?: string | null;
  snapshot_manual_override?: boolean;
}

export interface CompanyProfileData {
  operating_style?: string;
  values?: string[];
  website?: string;
}

/**
 * Extract domain from a URL
 */
function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

/**
 * Combine city and country into a location string
 */
function combineLocation(city: string | null, country: string | null): string | null {
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return null;
}

/**
 * Resolve snapshot field with priority: manual -> auto -> fallback
 */
function resolveField<T>(
  useManualOverride: boolean,
  manualValue: T | null | undefined,
  autoValue: T | null | undefined,
  fallbackValue?: T | null
): T | null {
  if (useManualOverride && manualValue != null) {
    return manualValue;
  }
  if (autoValue != null) {
    return autoValue;
  }
  return fallbackValue ?? null;
}

/**
 * Main resolution function for company snapshot
 */
export function resolveCompanySnapshot(
  businessProfile: BusinessProfileWithSnapshot | null,
  companyProfile?: CompanyProfileData | null
): CompanySnapshot {
  if (!businessProfile) {
    return {
      hq_city: null,
      hq_country: null,
      hq_location: null,
      industry: null,
      employees_count: null,
      revenue_range: null,
      founded_year: null,
      website: null,
      website_domain: null,
    };
  }

  const useManualOverride = businessProfile.snapshot_manual_override === true;

  // Resolve each field with priority
  const hq_city = resolveField(
    useManualOverride,
    businessProfile.manual_hq_city,
    businessProfile.snapshot_hq_city
  );

  const hq_country = resolveField(
    useManualOverride,
    businessProfile.manual_hq_country,
    businessProfile.snapshot_hq_country
  );

  const industry = resolveField(
    useManualOverride,
    businessProfile.manual_industry,
    businessProfile.snapshot_industry,
    // Fallback: try to derive from company profile operating style or first value
    companyProfile?.operating_style || (companyProfile?.values?.[0] ?? null)
  );

  const employees_count = resolveField(
    useManualOverride,
    businessProfile.manual_employees_count,
    businessProfile.snapshot_employees_count
  );

  const revenue_range = resolveField(
    useManualOverride,
    businessProfile.manual_revenue_range,
    businessProfile.snapshot_revenue_range
  );

  const founded_year = resolveField(
    useManualOverride,
    businessProfile.manual_founded_year,
    businessProfile.snapshot_founded_year
  );

  // Website: manual override first, then existing profile website
  const website = resolveField(
    useManualOverride,
    businessProfile.manual_website,
    businessProfile.website,
    companyProfile?.website
  );

  return {
    hq_city,
    hq_country,
    hq_location: combineLocation(hq_city, hq_country),
    industry,
    employees_count,
    revenue_range,
    founded_year,
    website,
    website_domain: extractDomain(website),
  };
}

/**
 * Check if snapshot has any missing critical fields
 * Used to determine if we should show "Edit snapshot" CTA
 */
export function hasIncompletSnapshot(snapshot: CompanySnapshot): boolean {
  return (
    !snapshot.hq_location &&
    !snapshot.industry &&
    !snapshot.employees_count &&
    !snapshot.website
  );
}

/**
 * Check if specific fields are missing (for targeted CTAs)
 */
export function getMissingSnapshotFields(snapshot: CompanySnapshot): string[] {
  const missing: string[] = [];
  if (!snapshot.hq_location) missing.push('location');
  if (!snapshot.industry) missing.push('industry');
  if (!snapshot.employees_count) missing.push('employees');
  if (!snapshot.website) missing.push('website');
  return missing;
}
