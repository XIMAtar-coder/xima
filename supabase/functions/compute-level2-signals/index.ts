import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiGateway, extractJsonFromAiContent, generateCorrelationId, logAiCall, AiGatewayError } from "../_shared/aiClient.ts";
import { validateLevel2Signals } from "../_shared/aiSchema.ts";
import { corsHeaders, errorResponse, jsonResponse, profilingOptOutResponse, unauthorizedResponse, forbiddenResponse } from "../_shared/errors.ts";

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  it: 'Italian',
  es: 'Spanish',
};

function getLanguageInstruction(locale: string): string {
  const normalizedLocale = ['en', 'it', 'es'].includes(locale) ? locale : 'en';
  const targetLanguage = LANGUAGE_NAMES[normalizedLocale];
  return `

CRITICAL LANGUAGE INSTRUCTION:
You MUST respond ONLY in ${targetLanguage}.
All explanation text, summary, and flags descriptions must be in ${targetLanguage}.
Do NOT include any English words unless they are proper nouns, code identifiers, or product names.
Do NOT add bilingual text or translations in parentheses.
JSON keys must remain in English, but ALL string values must be in ${targetLanguage}.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = req.headers.get('x-correlation-id') || generateCorrelationId();

  try {
    const { submission_id, locale = 'en' } = await req.json();
    const normalizedLocale = ['en', 'it', 'es'].includes(locale) ? locale : 'en';

    if (!submission_id || typeof submission_id !== 'string') {
      return errorResponse(400, 'INVALID_INPUT', 'Missing or invalid submission_id parameter');
    }

    // ===== P0 SECURITY: Verify JWT =====
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorizedResponse('Missing auth token');
    }
    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return unauthorizedResponse('Invalid or expired token');
    }
    const callerId = claimsData.claims.sub as string;

    // ===== P0 SECURITY: Verify business/admin role =====
    const { data: roles } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId);

    const hasBusiness = roles?.some(r => r.role === 'business');
    const hasAdmin = roles?.some(r => r.role === 'admin');
    if (!hasBusiness && !hasAdmin) {
      return forbiddenResponse('Business or admin role required to compute signals');
    }

    // Service role client for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ===== P0 SECURITY: Verify caller owns the submission's business =====
    const { data: submission, error: submissionError } = await supabase
      .from('challenge_submissions')
      .select('id, submitted_payload, challenge_id, hiring_goal_id, business_id, candidate_profile_id')
      .eq('id', submission_id)
      .single();

    if (submissionError || !submission) {
      return errorResponse(404, 'NOT_FOUND', 'Submission not found');
    }

    // Verify the caller is the business owner of this submission
    if (!hasAdmin) {
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', callerId)
        .single();

      if (!businessProfile || submission.business_id !== callerId) {
        return forbiddenResponse('You do not own this submission');
      }
    }

    // ===== GDPR: Check profiling opt-out BEFORE LLM call =====
    if (submission.candidate_profile_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('profiling_opt_out')
        .eq('id', submission.candidate_profile_id)
        .single();

      if (profile?.profiling_opt_out === true) {
        console.log(JSON.stringify({ 
          type: 'gdpr_block', correlation_id: correlationId,
          function_name: 'compute-level2-signals', reason: 'profiling_opt_out'
        }));
        return profilingOptOutResponse();
      }
    }

    const payload = submission.submitted_payload as Record<string, any>;
    if (!payload) {
      return errorResponse(400, 'INVALID_INPUT', 'No submission payload found');
    }

    // Fetch context (challenge info, company info, role info)
    let roleTitle = '';
    let companyName = '';
    let challengeDescription = '';

    const { data: challenge } = await supabase
      .from('business_challenges')
      .select('title, description')
      .eq('id', submission.challenge_id)
      .single();

    if (challenge) challengeDescription = challenge.description || '';

    if (submission.hiring_goal_id) {
      const { data: goal } = await supabase
        .from('hiring_goal_drafts')
        .select('role_title')
        .eq('id', submission.hiring_goal_id)
        .single();
      if (goal) roleTitle = goal.role_title || '';
    }

    if (submission.business_id) {
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('company_name')
        .eq('user_id', submission.business_id)
        .single();
      if (profile) companyName = profile.company_name || '';
    }

    // Build the AI prompt
    const approach = payload.approach || '';
    const decisionsTradeoffs = payload.decisions_tradeoffs || payload.assumptions_tradeoffs || '';
    const deliverables = payload.concrete_deliverables || payload.key_deliverables || '';
    const tools = payload.tools_methods || payload.role_plan || '';
    const risks = payload.risks_failures || '';
    const questions = payload.questions_for_company || '';

    console.log(JSON.stringify({
      type: 'input_summary', correlation_id: correlationId,
      function_name: 'compute-level2-signals',
      submission_id, locale: normalizedLocale,
      content_lengths: {
        approach: approach.length, decisionsTradeoffs: decisionsTradeoffs.length,
        deliverables: deliverables.length, tools: tools.length,
        risks: risks.length, questions: questions.length,
      }
    }));

    const langInstruction = getLanguageInstruction(normalizedLocale);

    const systemPrompt = `You are XIMA, an AI that evaluates Level 2 hard skill submissions for hiring assessments.

CONTEXT:
- Company: ${companyName || 'Unknown'}
- Role: ${roleTitle || 'Professional role'}
- Challenge: ${challengeDescription || 'Role-based assessment'}

EVALUATION CRITERIA (Qualitative only - NO SCORES):
1. Hard Skill Clarity: Technical approach specificity
2. Tool & Method Maturity: Familiarity with industry tools/frameworks
3. Decision Quality Under Constraints: Ability to prioritize and explain trade-offs
4. Risk Awareness: Identification and mitigation of potential issues
5. Execution Realism: Concrete deliverables and realistic timelines

RATING SCALE (for each criterion):
- "clear": Well-articulated with specific details and evidence
- "partial": Present but could be more specific
- "fragmented": Lacking specificity or missing key elements

RESPONSE FORMAT (strict JSON):
{
  "hardSkillClarity": "clear|partial|fragmented",
  "hardSkillExplanation": "1-2 sentence explanation",
  "toolMethodMaturity": "clear|partial|fragmented", 
  "toolMethodExplanation": "1-2 sentence explanation",
  "decisionQualityUnderConstraints": "clear|partial|fragmented",
  "decisionExplanation": "1-2 sentence explanation",
  "riskAwareness": "clear|partial|fragmented",
  "riskExplanation": "1-2 sentence explanation",
  "executionRealism": "clear|partial|fragmented",
  "executionExplanation": "1-2 sentence explanation",
  "overallReadiness": "ready|needs_clarification|insufficient",
  "summary": "2-3 sentence executive summary for hiring manager",
  "flags": ["array of observed patterns like 'strong_technical_depth', 'weak_risk_awareness']
}

Be fair, constructive, and focused on helping the business make informed decisions.${langInstruction}`;

    const userPrompt = `Evaluate this Level 2 hard skill submission:

TECHNICAL APPROACH:
"""
${approach || '(Not provided)'}
"""

DECISIONS & TRADE-OFFS:
"""
${decisionsTradeoffs || '(Not provided)'}
"""

CONCRETE DELIVERABLES:
"""
${deliverables || '(Not provided)'}
"""

TOOLS & METHODS:
"""
${tools || '(Not provided)'}
"""

RISKS & FAILURE POINTS:
"""
${risks || '(Not provided)'}
"""

QUESTIONS FOR COMPANY:
"""
${questions || '(Not provided)'}
"""

Respond with valid JSON only.`;

    // Call AI via shared gateway client
    let aiResponse;
    try {
      aiResponse = await callAiGateway({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        correlationId,
        functionName: 'compute-level2-signals',
      });
    } catch (e) {
      if (e instanceof AiGatewayError) return e.toResponse();
      throw e;
    }

    // ===== RELIABILITY: Strict schema validation =====
    let parsedResult;
    try {
      const jsonString = extractJsonFromAiContent(aiResponse.content);
      const parsed = JSON.parse(jsonString);
      parsedResult = validateLevel2Signals(parsed);
    } catch (parseError) {
      console.error(JSON.stringify({
        type: 'parse_error', correlation_id: correlationId,
        function_name: 'compute-level2-signals',
        error: 'Failed to parse AI response JSON',
      }));
    }

    if (!parsedResult) {
      logAiCall({
        correlation_id: correlationId,
        function_name: 'compute-level2-signals',
        model: aiResponse.model,
        latency_ms: aiResponse.latencyMs,
        status: 'error',
        error_code: 'SCHEMA_VALIDATION_FAILED',
      });
      // Update submission with failed status
      await supabase
        .from('challenge_submissions')
        .update({ signals_version: 'v2_ai_failed' })
        .eq('id', submission_id);

      return errorResponse(502, 'L2_SIGNALS_PARSE_FAILED', 
        'AI response did not match expected schema. Signals were not saved.');
    }

    // Set locale
    parsedResult.generatedLocale = normalizedLocale;

    // Save to database
    const { error: updateError } = await supabase
      .from('challenge_submissions')
      .update({
        signals_payload: parsedResult,
        signals_version: 'v2_ai',
      })
      .eq('id', submission_id);

    if (updateError) {
      console.error(JSON.stringify({
        type: 'db_error', correlation_id: correlationId,
        function_name: 'compute-level2-signals',
        error: updateError.message,
      }));
    }

    console.log(JSON.stringify({
      type: 'success', correlation_id: correlationId,
      function_name: 'compute-level2-signals',
      overallReadiness: parsedResult.overallReadiness,
      flagsCount: parsedResult.flags.length,
    }));

    return jsonResponse({ signals: parsedResult });

  } catch (error) {
    console.error(JSON.stringify({
      type: 'unhandled_error', correlation_id: correlationId,
      function_name: 'compute-level2-signals',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
    return errorResponse(500, 'INTERNAL_ERROR', 
      error instanceof Error ? error.message : 'Unknown error');
  }
});
