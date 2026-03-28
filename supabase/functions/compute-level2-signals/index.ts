import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicApi, AnthropicError } from "../_shared/anthropicClient.ts";
import { extractJsonFromAiContent, generateCorrelationId, computeContentHash, persistEvidenceLedgerEntry } from "../_shared/aiClient.ts";
import { corsHeaders, errorResponse, jsonResponse, profilingOptOutResponse, unauthorizedResponse, forbiddenResponse } from "../_shared/errors.ts";
import { emitAuditEventWithMetric } from "../_shared/auditEvents.ts";
import { XIMATAR_PROFILES } from "../_shared/ximatarTaxonomy.ts";
import { persistTrajectoryEvent } from "../_shared/pillarTrajectory.ts";

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', it: 'Italian', es: 'Spanish' };

function getLanguageInstruction(locale: string): string {
  const normalizedLocale = ['en', 'it', 'es'].includes(locale) ? locale : 'en';
  const targetLanguage = LANGUAGE_NAMES[normalizedLocale];
  return `\n\nCRITICAL LANGUAGE INSTRUCTION:\nYou MUST respond ONLY in ${targetLanguage}.\nAll explanation text, summary, and flags must be in ${targetLanguage}.\nJSON keys must remain in English, but ALL string values must be in ${targetLanguage}.`;
}

// =====================================================
// Validation
// =====================================================

const L2_SIGNAL_VALUES = ["clear", "partial", "fragmented"];
const L2_READINESS_VALUES = ["ready", "needs_clarification", "insufficient"];

function validateLevel2SignalsV2(parsed: unknown): any | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  const signalFields = ["hardSkillClarity", "toolMethodMaturity", "decisionQualityUnderConstraints", "riskAwareness", "executionRealism"];
  for (const field of signalFields) {
    if (!L2_SIGNAL_VALUES.includes(String(obj[field]))) return null;
  }
  if (!L2_READINESS_VALUES.includes(String(obj.overallReadiness))) return null;

  const explanationFields = ["hardSkillExplanation", "toolMethodExplanation", "decisionExplanation", "riskExplanation", "executionExplanation", "summary"];
  for (const f of explanationFields) {
    if (typeof obj[f] !== "string" || (obj[f] as string).length === 0) return null;
  }
  if (!Array.isArray(obj.flags)) return null;

  // pillar_trajectory and archetype_alignment are optional — graceful degradation
  return {
    hardSkillClarity: String(obj.hardSkillClarity),
    hardSkillExplanation: String(obj.hardSkillExplanation),
    toolMethodMaturity: String(obj.toolMethodMaturity),
    toolMethodExplanation: String(obj.toolMethodExplanation),
    decisionQualityUnderConstraints: String(obj.decisionQualityUnderConstraints),
    decisionExplanation: String(obj.decisionExplanation),
    riskAwareness: String(obj.riskAwareness),
    riskExplanation: String(obj.riskExplanation),
    executionRealism: String(obj.executionRealism),
    executionExplanation: String(obj.executionExplanation),
    overallReadiness: String(obj.overallReadiness),
    summary: String(obj.summary),
    flags: (obj.flags as unknown[]).map(String),
    generatedAt: new Date().toISOString(),
    generatedLocale: "",
    pillar_trajectory: obj.pillar_trajectory && typeof obj.pillar_trajectory === 'object' ? obj.pillar_trajectory : null,
    archetype_alignment: obj.archetype_alignment && typeof obj.archetype_alignment === 'object' ? obj.archetype_alignment : null,
  };
}

// =====================================================
// Main handler
// =====================================================

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) return unauthorizedResponse('Invalid or expired token');
    const callerId = user.id;

    // ===== P0 SECURITY: Verify business/admin role =====
    const { data: roles } = await supabaseUser.from('user_roles').select('role').eq('user_id', callerId);
    const hasBusiness = roles?.some(r => r.role === 'business');
    const hasAdmin = roles?.some(r => r.role === 'admin');
    if (!hasBusiness && !hasAdmin) {
      return forbiddenResponse('Business or admin role required to compute signals');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ===== P0 SECURITY: Verify caller owns the submission's business =====
    const { data: submission, error: submissionError } = await supabase
      .from('challenge_submissions')
      .select('id, submitted_payload, challenge_id, hiring_goal_id, business_id, candidate_profile_id')
      .eq('id', submission_id)
      .single();

    if (submissionError || !submission) return errorResponse(404, 'NOT_FOUND', 'Submission not found');

    if (!hasAdmin) {
      const { data: businessProfile } = await supabase.from('business_profiles').select('id').eq('user_id', callerId).single();
      if (!businessProfile || submission.business_id !== callerId) {
        return forbiddenResponse('You do not own this submission');
      }
    }

    // ===== GDPR: Check profiling opt-out — KEPT EXACTLY =====
    if (submission.candidate_profile_id) {
      const { data: candidateProfile } = await supabase
        .from('profiles')
        .select('profiling_opt_out')
        .eq('id', submission.candidate_profile_id)
        .single();

      if (candidateProfile?.profiling_opt_out === true) {
        console.log(JSON.stringify({ type: 'gdpr_block', correlation_id: correlationId, function_name: 'compute-level2-signals', reason: 'profiling_opt_out' }));
        return profilingOptOutResponse();
      }
    }

    const payload = submission.submitted_payload as Record<string, any>;
    if (!payload) return errorResponse(400, 'INVALID_INPUT', 'No submission payload found');

    // Fetch context
    let roleTitle = '';
    let companyName = '';
    let challengeDescription = '';
    let candidateXimatar = '';
    let candidateScores: Record<string, number> | null = null;
    let configRubric: any[] = [];

    const [challengeRes, goalRes, companyRes] = await Promise.all([
      supabase.from('business_challenges').select('title, description, config_json').eq('id', submission.challenge_id).single(),
      submission.hiring_goal_id ? supabase.from('hiring_goal_drafts').select('role_title').eq('id', submission.hiring_goal_id).single() : Promise.resolve({ data: null }),
      submission.business_id ? supabase.from('business_profiles').select('company_name').eq('user_id', submission.business_id).single() : Promise.resolve({ data: null }),
    ]);

    if (challengeRes.data) {
      challengeDescription = challengeRes.data.description || '';
      const configJson = challengeRes.data.config_json as any;
      if (configJson?.scoring_rubric) configRubric = configJson.scoring_rubric;
    }
    if (goalRes.data) roleTitle = (goalRes.data as any).role_title || '';
    if (companyRes.data) companyName = (companyRes.data as any).company_name || '';

    // Fetch candidate's XIMAtar and pillar scores — NEW
    if (submission.candidate_profile_id) {
      const { data: candProfile } = await supabase
        .from('profiles')
        .select('ximatar_name, ximatar, ximatar_id, ximatar_level, pillar_scores')
        .eq('id', submission.candidate_profile_id)
        .single();

      if (candProfile) {
        candidateXimatar = (candProfile.ximatar_name || candProfile.ximatar || candProfile.ximatar_id || '') as string;
        candidateScores = (candProfile.pillar_scores) as Record<string, number> | null;
      }
    }

    // Build submission content sections
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
      has_candidate_ximatar: !!candidateXimatar,
      content_lengths: { approach: approach.length, decisionsTradeoffs: decisionsTradeoffs.length, deliverables: deliverables.length, tools: tools.length, risks: risks.length, questions: questions.length },
    }));

    const langInstruction = getLanguageInstruction(normalizedLocale);

    // Build candidate context block
    let candidateContextBlock = '';
    if (candidateXimatar && candidateScores) {
      const ximatarProfile = XIMATAR_PROFILES[candidateXimatar.toLowerCase()];
      candidateContextBlock = `
CANDIDATE CONTEXT (for trajectory computation only — do NOT bias signal evaluation):
- Current XIMAtar: ${candidateXimatar}${ximatarProfile ? ` (${ximatarProfile.title})` : ''}
- Current pillar scores: Drive ${candidateScores.drive ?? 'N/A'}, Comp Power ${candidateScores.computational_power ?? candidateScores.comp_power ?? 'N/A'}, Communication ${candidateScores.communication ?? 'N/A'}, Creativity ${candidateScores.creativity ?? 'N/A'}, Knowledge ${candidateScores.knowledge ?? 'N/A'}`;
    }

    // Build rubric context
    let rubricContext = '';
    if (configRubric.length > 0) {
      rubricContext = `\nSCORING RUBRIC (from challenge config):\n${configRubric.map(c => `- ${c.criterion} (weight: ${c.weight}%, pillar: ${c.primary_pillar || 'N/A'}): ${c.description}`).join('\n')}`;
    }

    const systemPrompt = `You are XIMA, an AI that evaluates Level 2 hard skill submissions for hiring assessments on the XIMA psychometric talent platform.

CONTEXT:
- Company: ${companyName || 'Unknown'}
- Role: ${roleTitle || 'Professional role'}
- Challenge: ${challengeDescription || 'Role-based assessment'}
${rubricContext}
${candidateContextBlock}

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

PILLAR TRAJECTORY:
After evaluating the 5 signals, compute how this submission affects the candidate's XIMA pillar scores:
- "clear" signals boost relevant pillars by +2 to +4
- "partial" signals give +0 to +1
- "fragmented" signals give -1 to -2
Map: hardSkillClarity → Knowledge + Computational Power, toolMethodMaturity → Knowledge + Computational Power, decisionQualityUnderConstraints → Drive + Creativity, riskAwareness → Knowledge + Drive, executionRealism → Drive + Computational Power

ARCHETYPE ALIGNMENT:
Assess whether this submission reinforces the candidate's current XIMAtar or signals evolution toward a different archetype.

RESPONSE FORMAT (strict JSON):
{
  "hardSkillClarity": "clear|partial|fragmented",
  "hardSkillExplanation": "1-2 sentences",
  "toolMethodMaturity": "clear|partial|fragmented",
  "toolMethodExplanation": "1-2 sentences",
  "decisionQualityUnderConstraints": "clear|partial|fragmented",
  "decisionExplanation": "1-2 sentences",
  "riskAwareness": "clear|partial|fragmented",
  "riskExplanation": "1-2 sentences",
  "executionRealism": "clear|partial|fragmented",
  "executionExplanation": "1-2 sentences",
  "overallReadiness": "ready|needs_clarification|insufficient",
  "summary": "2-3 sentence executive summary",
  "flags": ["array of patterns"],
  "pillar_trajectory": {
    "drive_delta": 0, "computational_power_delta": 0, "communication_delta": 0, "creativity_delta": 0, "knowledge_delta": 0,
    "reasoning": "Brief explanation"
  },
  "archetype_alignment": {
    "current_ximatar": "${candidateXimatar || 'unknown'}",
    "submission_signal": "ximatar_id",
    "alignment_score": 0,
    "note": "string"
  }
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

    let aiResponse;
    try {
      aiResponse = await callAnthropicApi({
        system: systemPrompt,
        userMessage: userPrompt,
        correlationId,
        functionName: 'compute-level2-signals',
        inputSummary: `l2_eval:sub=${submission_id},locale=${normalizedLocale},has_ximatar=${!!candidateXimatar}`,
        maxTokens: 4096,
      });
    } catch (e) {
      if (e instanceof AnthropicError) return errorResponse(e.statusCode, e.errorCode, e.message);
      throw e;
    }

    // Validate
    let parsedResult;
    try {
      const jsonString = extractJsonFromAiContent(aiResponse.content);
      const parsed = JSON.parse(jsonString);
      parsedResult = validateLevel2SignalsV2(parsed);
    } catch (parseError) {
      console.error(JSON.stringify({ type: 'parse_error', correlation_id: correlationId, function_name: 'compute-level2-signals', error: 'Failed to parse AI response' }));
    }

    if (!parsedResult) {
      await supabase.from('challenge_submissions').update({ signals_version: 'v2_claude_failed' }).eq('id', submission_id);
      return errorResponse(502, 'L2_SIGNALS_PARSE_FAILED', 'AI response did not match expected schema.');
    }

    parsedResult.generatedLocale = normalizedLocale;

    // Save signals
    const { error: updateError } = await supabase
      .from('challenge_submissions')
      .update({ signals_payload: parsedResult, signals_version: 'v2_claude' })
      .eq('id', submission_id);

    if (updateError) {
      console.error(JSON.stringify({ type: 'db_error', correlation_id: correlationId, function_name: 'compute-level2-signals', error: updateError.message }));
    }

    // ===== PILLAR TRAJECTORY — NEW =====
    let levelUpStatus: any = null;
    if (submission.candidate_profile_id && parsedResult.pillar_trajectory) {
      const { data: candidateUser } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', submission.candidate_profile_id)
        .single();

      if (candidateUser) {
        try {
          const traj = parsedResult.pillar_trajectory;
          const levelCheck = await persistTrajectoryEvent({
            user_id: candidateUser.user_id,
            source_function: "compute-level2-signals",
            source_type: "l2_challenge",
            source_entity_id: submission_id,
            correlation_id: correlationId,
            deltas: {
              drive: traj.drive_delta || 0,
              computational_power: traj.computational_power_delta || 0,
              communication: traj.communication_delta || 0,
              creativity: traj.creativity_delta || 0,
              knowledge: traj.knowledge_delta || 0,
            },
            reasoning: traj.reasoning || "",
          });

          if (levelCheck?.eligible || levelCheck?.evolution_eligible) {
            levelUpStatus = { eligible: levelCheck.eligible, evolution_eligible: levelCheck.evolution_eligible, current_level: levelCheck.current_level };
          }
        } catch (trajErr) {
          console.error('[trajectory] Error:', trajErr instanceof Error ? trajErr.message : trajErr);
        }
      }
    }

    // ===== EVIDENCE LEDGER — NEW =====
    if (submission.candidate_profile_id) {
      try {
        const payloadStr = JSON.stringify(payload);
        const contentHash = await computeContentHash(payloadStr);

        persistEvidenceLedgerEntry({
          open_response_id: submission_id, // repurposed — this is a submission, not an open response
          subject_profile_id: submission.candidate_profile_id,
          attempt_id: submission_id,
          field_key: 'l2_challenge',
          open_key: submission.challenge_id,
          ai_request_id: aiResponse.requestId,
          final_score: 0, // L2 uses qualitative signals, not numeric score
          quality_label: parsedResult.overallReadiness,
          key_reasons: [parsedResult.summary],
          detected_red_flags: parsedResult.flags,
          score_breakdown: null,
          content_hash: contentHash,
          content_length: payloadStr.length,
          content_language: normalizedLocale,
        });
      } catch (ledgerErr) {
        console.error('[evidence_ledger] Error:', ledgerErr instanceof Error ? ledgerErr.message : ledgerErr);
      }
    }

    // Audit event
    emitAuditEventWithMetric({
      actorType: "business",
      actorId: callerId,
      action: "challenge.l2_evaluated",
      entityType: "challenge_submission",
      entityId: submission_id,
      correlationId,
      metadata: {
        overallReadiness: parsedResult.overallReadiness,
        flagsCount: parsedResult.flags.length,
        archetype_alignment: parsedResult.archetype_alignment?.alignment_score,
        has_trajectory: !!parsedResult.pillar_trajectory,
      },
    }, "l2_signals_computed");

    console.log(JSON.stringify({
      type: 'success', correlation_id: correlationId,
      function_name: 'compute-level2-signals',
      overallReadiness: parsedResult.overallReadiness,
      flagsCount: parsedResult.flags.length,
      has_trajectory: !!parsedResult.pillar_trajectory,
    }));

    return jsonResponse({
      signals: parsedResult,
      ...(levelUpStatus ? { level_up_status: levelUpStatus } : {}),
    });

  } catch (error) {
    console.error(JSON.stringify({
      type: 'unhandled_error', correlation_id: correlationId,
      function_name: 'compute-level2-signals',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
    return errorResponse(500, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Unknown error');
  }
});
