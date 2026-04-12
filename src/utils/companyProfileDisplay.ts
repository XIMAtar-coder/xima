/**
 * Returns override value if set, otherwise the AI-generated baseline.
 * Used across dashboard and settings to display company profile fields.
 */
export const getCompanyDisplayField = (profile: any, field: string): any => {
  const overrideKey = `${field}_override`;
  if (profile?.[overrideKey] !== null && profile?.[overrideKey] !== undefined) {
    return profile[overrideKey];
  }
  return profile?.[field];
};
