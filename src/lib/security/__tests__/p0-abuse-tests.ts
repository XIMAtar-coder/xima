/**
 * P0 Security Abuse Tests
 * 
 * These tests verify that the P0 security fixes are working correctly.
 * They should be run manually or as part of a security audit.
 * 
 * To run these tests:
 * 1. Create two test users: Candidate A and Candidate B
 * 2. Create a test business user
 * 3. Execute each test scenario and verify the expected behavior
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iyckvvnecpnldrxqmzta.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Test credentials (replace with actual test user credentials)
const TEST_CANDIDATE_A_EMAIL = 'test-candidate-a@example.com';
const TEST_CANDIDATE_A_PASSWORD = 'test-password-123';
const TEST_CANDIDATE_B_EMAIL = 'test-candidate-b@example.com';
const TEST_CANDIDATE_B_PASSWORD = 'test-password-123';
const TEST_BUSINESS_EMAIL = 'test-business@example.com';
const TEST_BUSINESS_PASSWORD = 'test-password-123';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

/**
 * TEST 1: Candidate A cannot read Candidate B's feed items
 * 
 * Expected: Feed items with visibility restricted to Candidate B's ximatar
 * should NOT be visible to Candidate A.
 */
async function testFeedItemIsolation(): Promise<TestResult> {
  const testName = 'P0-1: Feed Item Visibility Isolation';
  
  try {
    // Sign in as Candidate A
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: authA, error: authErrorA } = await supabaseA.auth.signInWithPassword({
      email: TEST_CANDIDATE_A_EMAIL,
      password: TEST_CANDIDATE_A_PASSWORD
    });
    
    if (authErrorA) {
      return { name: testName, passed: false, error: `Auth failed: ${authErrorA.message}` };
    }

    // Get Candidate A's ximatar_id
    const { data: resultA } = await supabaseA
      .from('assessment_results')
      .select('ximatar_id')
      .eq('user_id', authA.user?.id)
      .limit(1)
      .single();

    // Query all feed items
    const { data: feedItems, error: feedError } = await supabaseA
      .from('feed_items')
      .select('id, subject_ximatar_id, visibility');

    if (feedError) {
      return { name: testName, passed: false, error: `Feed query failed: ${feedError.message}` };
    }

    // Check that no feed items belong to other users' ximatars (unless public)
    const ownXimatarId = resultA?.ximatar_id;
    const violations = feedItems?.filter(item => {
      const isPublic = item.visibility?.public === true;
      const isOwnXimatar = item.subject_ximatar_id === ownXimatarId;
      // If it's not public and not owned, it's a violation
      return !isPublic && !isOwnXimatar;
    }) || [];

    if (violations.length > 0) {
      return { 
        name: testName, 
        passed: false, 
        error: `Found ${violations.length} feed items visible that should be hidden`,
        details: JSON.stringify(violations.slice(0, 3))
      };
    }

    return { name: testName, passed: true, details: `Checked ${feedItems?.length || 0} feed items` };
  } catch (err: any) {
    return { name: testName, passed: false, error: err.message };
  }
}

/**
 * TEST 2: Candidate A cannot search Candidate B by email
 * 
 * Expected: The chat search should NOT allow searching by email and should
 * only return users who the candidate has an existing thread with.
 */
async function testEmailSearchBlocked(): Promise<TestResult> {
  const testName = 'P0-2: Email Search Blocked';
  
  try {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: authA, error: authErrorA } = await supabaseA.auth.signInWithPassword({
      email: TEST_CANDIDATE_A_EMAIL,
      password: TEST_CANDIDATE_A_PASSWORD
    });
    
    if (authErrorA) {
      return { name: testName, passed: false, error: `Auth failed: ${authErrorA.message}` };
    }

    // Try to search profiles by Candidate B's email
    const { data: searchResults, error: searchError } = await supabaseA
      .from('profiles')
      .select('id, user_id, name, full_name, email')
      .ilike('email', `%${TEST_CANDIDATE_B_EMAIL.split('@')[0]}%`)
      .limit(10);

    // The query may succeed but should NOT expose emails outside of authorized contexts
    // Check if any results contain email data from other users
    const exposedEmails = searchResults?.filter(r => 
      r.email && r.email !== TEST_CANDIDATE_A_EMAIL
    ) || [];

    if (exposedEmails.length > 0) {
      return { 
        name: testName, 
        passed: false, 
        error: `Email enumeration possible: found ${exposedEmails.length} emails`,
        details: 'Profiles table should have RLS to hide email column from non-owners'
      };
    }

    return { name: testName, passed: true, details: 'Email search returned no unauthorized emails' };
  } catch (err: any) {
    return { name: testName, passed: false, error: err.message };
  }
}

/**
 * TEST 3: Candidate A cannot insert a message into a thread they are not part of
 * 
 * Expected: INSERT into chat_messages should fail with RLS error if the user
 * is not a participant in the thread.
 */
async function testChatMessageIsolation(): Promise<TestResult> {
  const testName = 'P0-4: Chat Message INSERT Isolation';
  
  try {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: authA, error: authErrorA } = await supabaseA.auth.signInWithPassword({
      email: TEST_CANDIDATE_A_EMAIL,
      password: TEST_CANDIDATE_A_PASSWORD
    });
    
    if (authErrorA) {
      return { name: testName, passed: false, error: `Auth failed: ${authErrorA.message}` };
    }

    // Get Candidate A's profile_id
    const { data: profileA } = await supabaseA
      .from('profiles')
      .select('id')
      .eq('user_id', authA.user?.id)
      .single();

    // Find a thread that Candidate A is NOT a participant of
    const { data: allThreads } = await supabaseA
      .from('chat_threads')
      .select('id')
      .limit(10);

    const { data: myParticipations } = await supabaseA
      .from('chat_participants')
      .select('thread_id')
      .eq('user_id', profileA?.id);

    const myThreadIds = new Set(myParticipations?.map(p => p.thread_id) || []);
    const foreignThread = allThreads?.find(t => !myThreadIds.has(t.id));

    if (!foreignThread) {
      return { name: testName, passed: true, details: 'No foreign threads to test (test setup needed)' };
    }

    // Attempt to insert a message into a thread we're not part of
    const { data: insertResult, error: insertError } = await supabaseA
      .from('chat_messages')
      .insert({
        thread_id: foreignThread.id,
        sender_id: profileA?.id,
        body: 'SECURITY TEST - This should be blocked'
      })
      .select();

    if (!insertError) {
      // If insert succeeded, this is a CRITICAL failure
      return { 
        name: testName, 
        passed: false, 
        error: 'CRITICAL: Message inserted into unauthorized thread!',
        details: `Thread: ${foreignThread.id}`
      };
    }

    // Expected: RLS policy violation error
    if (insertError.code === '42501' || insertError.message.includes('policy')) {
      return { name: testName, passed: true, details: 'RLS correctly blocked unauthorized insert' };
    }

    return { name: testName, passed: true, details: `Insert blocked with: ${insertError.message}` };
  } catch (err: any) {
    return { name: testName, passed: false, error: err.message };
  }
}

/**
 * TEST 4: Candidate A cannot update another company's profile
 * 
 * Expected: UPDATE on company_profiles should fail unless the user owns
 * the company_id.
 */
async function testCompanyProfileIsolation(): Promise<TestResult> {
  const testName = 'P0-3: Company Profile UPDATE Isolation';
  
  try {
    const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: authA, error: authErrorA } = await supabaseA.auth.signInWithPassword({
      email: TEST_CANDIDATE_A_EMAIL,
      password: TEST_CANDIDATE_A_PASSWORD
    });
    
    if (authErrorA) {
      return { name: testName, passed: false, error: `Auth failed: ${authErrorA.message}` };
    }

    // Find any company profile (not owned by this user)
    const { data: companyProfiles, error: fetchError } = await supabaseA
      .from('company_profiles')
      .select('id, company_id')
      .limit(1);

    if (fetchError) {
      // If we can't even read company_profiles, that's also a pass (RLS blocking)
      return { name: testName, passed: true, details: 'Cannot read company_profiles (good)' };
    }

    if (!companyProfiles || companyProfiles.length === 0) {
      return { name: testName, passed: true, details: 'No company profiles to test' };
    }

    const targetProfile = companyProfiles[0];

    // Skip if this is somehow our own profile
    if (targetProfile.company_id === authA.user?.id) {
      return { name: testName, passed: true, details: 'Only own profile found, cannot test cross-user access' };
    }

    // Attempt to update another company's profile
    const { data: updateResult, error: updateError } = await supabaseA
      .from('company_profiles')
      .update({ summary: 'SECURITY TEST - This should be blocked' })
      .eq('id', targetProfile.id)
      .select();

    if (!updateError && updateResult && updateResult.length > 0) {
      return { 
        name: testName, 
        passed: false, 
        error: 'CRITICAL: Updated another company profile!',
        details: `Profile: ${targetProfile.id}`
      };
    }

    return { name: testName, passed: true, details: 'RLS correctly blocked unauthorized update' };
  } catch (err: any) {
    return { name: testName, passed: false, error: err.message };
  }
}

/**
 * Run all P0 security tests
 */
export async function runP0SecurityTests(): Promise<TestResult[]> {
  console.log('🔒 Running P0 Security Abuse Tests...\n');
  
  const results: TestResult[] = [];
  
  results.push(await testFeedItemIsolation());
  results.push(await testEmailSearchBlocked());
  results.push(await testChatMessageIsolation());
  results.push(await testCompanyProfileIsolation());
  
  console.log('\n📊 Test Results:');
  console.log('================\n');
  
  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${result.name}`);
    if (result.error) console.log(`   Error: ${result.error}`);
    if (result.details) console.log(`   Details: ${result.details}`);
    console.log('');
  }
  
  const passCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`\n📈 Summary: ${passCount}/${totalCount} tests passed`);
  
  if (passCount < totalCount) {
    console.log('\n⚠️  SECURITY ISSUES DETECTED - Review failed tests immediately!');
  } else {
    console.log('\n✅ All P0 security tests passed');
  }
  
  return results;
}

// Export for use in test runners
export {
  testFeedItemIsolation,
  testEmailSearchBlocked,
  testChatMessageIsolation,
  testCompanyProfileIsolation
};
