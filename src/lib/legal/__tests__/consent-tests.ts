/**
 * Manual Test Steps for Consent Checkboxes
 * 
 * Test 1: Cannot register without ticking both boxes
 * ------------------------------------------------
 * 1. Go to /register (candidate) or /business/register (business)
 * 2. Fill in all form fields (name, email, password, etc.)
 * 3. Leave BOTH consent checkboxes unchecked
 * 4. Click "Create Account" / "Create Business Account"
 * Expected: Error message appears: "You must accept both the Privacy Policy and Terms of Service to continue."
 * Expected: Registration does NOT proceed
 * 
 * 5. Check only Privacy Policy checkbox
 * 6. Click "Create Account"
 * Expected: Same error message appears (Terms still unchecked)
 * 
 * 7. Uncheck Privacy, check only Terms
 * 8. Click "Create Account"
 * Expected: Same error message appears (Privacy still unchecked)
 * 
 * 9. Check BOTH checkboxes
 * 10. Click "Create Account"
 * Expected: Registration proceeds (or shows other validation errors if any)
 * 
 * Test 2: After registration, user_consents has 2 rows with correct versions
 * --------------------------------------------------------------------------
 * Prerequisites: Successfully register a new user with both consents checked
 * 
 * 1. After successful registration, run this SQL query in Supabase:
 * 
 * SELECT 
 *   user_id,
 *   consent_type,
 *   consent_version,
 *   consented_at,
 *   locale,
 *   user_agent
 * FROM user_consents 
 * WHERE user_id = '<newly_registered_user_id>'
 * ORDER BY consent_type;
 * 
 * Expected results:
 * - 2 rows are returned
 * - One row has consent_type = 'privacy', consent_version = '2026-01-27-v1'
 * - One row has consent_type = 'terms', consent_version = '2026-01-27-v1'
 * - Both rows have recent consented_at timestamps
 * - locale matches the user's browser language (en, it, or es)
 * - user_agent contains the browser's user agent string
 * 
 * Test 3: Users can only read their own consents (RLS verification)
 * -----------------------------------------------------------------
 * Prerequisites: Two registered users (User A and User B)
 * 
 * 1. Log in as User A
 * 2. Run this query in a client-side context (or via Supabase dashboard with User A's JWT):
 * 
 * const { data, error } = await supabase
 *   .from('user_consents')
 *   .select('*');
 * 
 * Expected: Only User A's consents are returned (max 2 rows)
 * Expected: User B's consents are NOT visible
 * 
 * 3. Try to insert a consent for User B (from User A's session):
 * 
 * const { error } = await supabase
 *   .from('user_consents')
 *   .insert({
 *     user_id: '<user_b_id>',
 *     consent_type: 'privacy',
 *     consent_version: 'fake-version'
 *   });
 * 
 * Expected: Insert fails with RLS violation error
 * 
 * Test 4: Consent links work correctly
 * ------------------------------------
 * 1. Go to /register
 * 2. Click on "Privacy Policy" link in the checkbox label
 * Expected: Opens /privacy in a new tab
 * 
 * 3. Click on "Terms of Service" link in the checkbox label
 * Expected: Opens /terms in a new tab
 * 
 * Test 5: Checkbox accessibility
 * ------------------------------
 * 1. Go to /register
 * 2. Tab through the form fields
 * Expected: Both checkboxes are keyboard-focusable
 * 
 * 3. When focused on a checkbox, press Space
 * Expected: Checkbox toggles checked state
 * 
 * 4. Click on the label text (not the checkbox itself)
 * Expected: Checkbox toggles (labels are clickable)
 */

import { supabase } from '@/integrations/supabase/client';
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal/consentVersions';

/**
 * Programmatic test to verify consent versions are stored correctly
 * Run this after a successful registration to verify the data
 */
export async function verifyUserConsents(userId: string): Promise<{
  success: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  const { data, error } = await supabase
    .from('user_consents')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    errors.push(`Failed to fetch consents: ${error.message}`);
    return { success: false, errors };
  }
  
  if (!data || data.length !== 2) {
    errors.push(`Expected 2 consent records, found ${data?.length ?? 0}`);
    return { success: false, errors };
  }
  
  const privacyConsent = data.find(c => c.consent_type === 'privacy');
  const termsConsent = data.find(c => c.consent_type === 'terms');
  
  if (!privacyConsent) {
    errors.push('Missing privacy consent record');
  } else if (privacyConsent.consent_version !== PRIVACY_VERSION) {
    errors.push(`Privacy version mismatch: expected ${PRIVACY_VERSION}, got ${privacyConsent.consent_version}`);
  }
  
  if (!termsConsent) {
    errors.push('Missing terms consent record');
  } else if (termsConsent.consent_version !== TERMS_VERSION) {
    errors.push(`Terms version mismatch: expected ${TERMS_VERSION}, got ${termsConsent.consent_version}`);
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Test that RLS prevents reading other users' consents
 */
export async function testRLSIsolation(): Promise<{
  success: boolean;
  message: string;
}> {
  const { data: session } = await supabase.auth.getSession();
  
  if (!session?.session?.user) {
    return { success: false, message: 'Not authenticated' };
  }
  
  const currentUserId = session.session.user.id;
  
  // Fetch all visible consents
  const { data, error } = await supabase
    .from('user_consents')
    .select('user_id');
  
  if (error) {
    return { success: false, message: `Query failed: ${error.message}` };
  }
  
  // All returned rows should belong to the current user
  const otherUserConsents = data?.filter(c => c.user_id !== currentUserId) ?? [];
  
  if (otherUserConsents.length > 0) {
    return { 
      success: false, 
      message: `RLS VIOLATION: Found ${otherUserConsents.length} consents from other users!` 
    };
  }
  
  return { 
    success: true, 
    message: `RLS working correctly. Found ${data?.length ?? 0} consents (all belonging to current user)` 
  };
}
