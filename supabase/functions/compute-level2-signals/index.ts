import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Level2SignalsPayload {
  hardSkillClarity: 'clear' | 'partial' | 'fragmented';
  hardSkillExplanation: string;
  toolMethodMaturity: 'clear' | 'partial' | 'fragmented';
  toolMethodExplanation: string;
  decisionQualityUnderConstraints: 'clear' | 'partial' | 'fragmented';
  decisionExplanation: string;
  riskAwareness: 'clear' | 'partial' | 'fragmented';
  riskExplanation: string;
  executionRealism: 'clear' | 'partial' | 'fragmented';
  executionExplanation: string;
  overallReadiness: 'ready' | 'needs_clarification' | 'insufficient';
  summary: string;
  flags: string[];
  generatedAt: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submission_id } = await req.json();

    if (!submission_id) {
      return new Response(
        JSON.stringify({ error: 'Missing submission_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Computing Level 2 signals for submission:', submission_id);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch submission data
    const { data: submission, error: submissionError } = await supabase
      .from('challenge_submissions')
      .select(`
        id,
        submitted_payload,
        challenge_id,
        hiring_goal_id,
        business_id
      `)
      .eq('id', submission_id)
      .single();

    if (submissionError || !submission) {
      console.error('Submission not found:', submissionError);
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = submission.submitted_payload as Record<string, any>;
    if (!payload) {
      return new Response(
        JSON.stringify({ error: 'No submission payload found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch context: challenge info, company info, role info
    let roleTitle = '';
    let companyName = '';
    let challengeDescription = '';

    const { data: challenge } = await supabase
      .from('business_challenges')
      .select('title, description')
      .eq('id', submission.challenge_id)
      .single();

    if (challenge) {
      challengeDescription = challenge.description || '';
    }

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

    console.log('Submission content lengths:', {
      approach: approach.length,
      decisionsTradeoffs: decisionsTradeoffs.length,
      deliverables: deliverables.length,
      tools: tools.length,
      risks: risks.length,
      questions: questions.length,
    });

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

Be fair, constructive, and focused on helping the business make informed decisions.`;

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

    console.log('Calling AI for Level 2 interpretation...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error("No content in AI response:", data);
      return new Response(
        JSON.stringify({ error: "No content in AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse AI response
    let parsedResult: Level2SignalsPayload;
    try {
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                        aiContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
      const parsed = JSON.parse(jsonString.trim());
      
      // Validate and normalize
      parsedResult = {
        hardSkillClarity: parsed.hardSkillClarity || 'partial',
        hardSkillExplanation: parsed.hardSkillExplanation || '',
        toolMethodMaturity: parsed.toolMethodMaturity || 'partial',
        toolMethodExplanation: parsed.toolMethodExplanation || '',
        decisionQualityUnderConstraints: parsed.decisionQualityUnderConstraints || 'partial',
        decisionExplanation: parsed.decisionExplanation || '',
        riskAwareness: parsed.riskAwareness || 'partial',
        riskExplanation: parsed.riskExplanation || '',
        executionRealism: parsed.executionRealism || 'partial',
        executionExplanation: parsed.executionExplanation || '',
        overallReadiness: parsed.overallReadiness || 'needs_clarification',
        summary: parsed.summary || 'Unable to generate summary.',
        flags: Array.isArray(parsed.flags) ? parsed.flags : [],
        generatedAt: new Date().toISOString(),
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", rawResponse: aiContent }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save to database
    const { error: updateError } = await supabase
      .from('challenge_submissions')
      .update({
        signals_payload: parsedResult,
        signals_version: 'v2_ai',
      })
      .eq('id', submission_id);

    if (updateError) {
      console.error('Error saving signals to DB:', updateError);
      // Still return the signals even if save fails
    } else {
      console.log('Level 2 signals saved to database');
    }

    console.log('Level 2 interpretation complete:', {
      overallReadiness: parsedResult.overallReadiness,
      flagsCount: parsedResult.flags.length,
    });

    return new Response(
      JSON.stringify({ signals: parsedResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in compute-level2-signals:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
