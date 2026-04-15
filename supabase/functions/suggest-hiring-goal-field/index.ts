// SCHEMA PREFLIGHT (verified 2026-04-14):
// hiring_goal_drafts: id, business_id, task_description, role_title, experience_level,
//   work_model, country, city_region, salary_min, salary_max, salary_currency, salary_period,
//   status, imported_from_listing_id, ai_suggested_ximatar, xima_hr_requested
// business_profiles: id, user_id, company_name, website, metadata, strategic_focus, team_culture
// company_profiles: id, company_id, pillar_vector, summary, values, ideal_traits,
//   communication_style, operating_style, summary_override, values_override, ideal_traits_override,
//   communication_style_override, operating_style_override
// SALARY CONVENTION: salary_min/salary_max are ALWAYS gross (RAL). Net-to-gross ×1.4 at import.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";

const FIELD_CONFIG: Record<string, { count: number; label: string }> = {
  role_summary: { count: 1, label: "role summary (2-3 sentences)" },
  responsibilities: { count: 5, label: "key responsibilities" },
  required_skills: { count: 8, label: "required skills" },
  nice_to_have: { count: 5, label: "nice-to-have skills" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return unauthorizedResponse("Missing auth");

    const jwt = authHeader.replace("Bearer ", "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser(jwt);
    if (userError || !user) return unauthorizedResponse("Auth required");

    const body = await req.json();
    const { business_id, field_name, current_values, role_title } = body;

    if (!business_id || !field_name || !role_title) {
      return errorResponse(400, "INVALID_INPUT", "business_id, field_name, and role_title are required");
    }

    const fieldCfg = FIELD_CONFIG[field_name];
    if (!fieldCfg) {
      return errorResponse(400, "INVALID_FIELD", `field_name must be one of: ${Object.keys(FIELD_CONFIG).join(", ")}`);
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Load business DNA context
    console.log("[suggest-hiring-goal-field] START", { business_id, field_name, role_title });
    const [profileRes, dnaRes] = await Promise.all([
      serviceClient.from("business_profiles").select("company_name, website, team_culture, strategic_focus, metadata").eq("user_id", business_id).maybeSingle(),
      serviceClient.from("company_profiles").select("summary, summary_override, values, values_override, ideal_traits, ideal_traits_override, communication_style, communication_style_override, operating_style, operating_style_override, pillar_vector").eq("company_id", business_id).maybeSingle(),
    ]);

    const bp = profileRes.data;
    const dna = dnaRes.data;

    // Build context string with overrides taking precedence
    const companyContext = [
      bp?.company_name ? `Company: ${bp.company_name}` : null,
      (dna?.summary_override || dna?.summary) ? `About: ${dna.summary_override || dna.summary}` : null,
      (dna?.values_override || dna?.values) ? `Values: ${JSON.stringify(dna.values_override || dna.values)}` : null,
      (dna?.ideal_traits_override || dna?.ideal_traits) ? `Ideal traits: ${JSON.stringify(dna.ideal_traits_override || dna.ideal_traits)}` : null,
      (dna?.communication_style_override || dna?.communication_style) ? `Communication style: ${dna.communication_style_override || dna.communication_style}` : null,
      (dna?.operating_style_override || dna?.operating_style) ? `Operating style: ${dna.operating_style_override || dna.operating_style}` : null,
      bp?.team_culture ? `Team culture: ${bp.team_culture}` : null,
      bp?.strategic_focus ? `Strategic focus: ${JSON.stringify(bp.strategic_focus)}` : null,
    ].filter(Boolean).join("\n");

    const currentValuesStr = current_values && Array.isArray(current_values) && current_values.length > 0
      ? `\nAlready provided by user (do NOT repeat these): ${current_values.join(", ")}`
      : "";

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return errorResponse(500, "CONFIG_ERROR", "API key not configured");

    console.log("[suggest-hiring-goal-field] Generating suggestions:", { field_name, role_title, business_id });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are a hiring expert helping a company define a job position. Generate contextually relevant ${fieldCfg.label} for the given role, tailored to the company's DNA and culture.

${companyContext ? `Company context:\n${companyContext}` : "No company context available — use industry best practices."}

Return ONLY valid JSON: {"suggestions": ["suggestion1", "suggestion2", ...]}
Generate exactly ${fieldCfg.count} suggestions. Each suggestion should be concise (1-2 sentences for role_summary, 5-15 words for skills/responsibilities).${currentValuesStr}`,
        messages: [{
          role: "user",
          content: `Generate ${fieldCfg.count} ${fieldCfg.label} for the role: "${role_title}"`,
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[suggest-hiring-goal-field] AI call failed:", response.status, errText.substring(0, 300));
      return errorResponse(502, "AI_FAILED", "Failed to generate suggestions. Please try again.");
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    try {
      const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
      const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();
      const parsed = JSON.parse(jsonStr.startsWith("{") ? jsonStr : jsonStr.substring(jsonStr.indexOf("{")));
      
      console.log("[suggest-hiring-goal-field] Generated:", parsed.suggestions?.length, "suggestions");
      
      return jsonResponse({
        suggestions: parsed.suggestions || [],
        field_name,
        role_title,
      });
    } catch {
      console.error("[suggest-hiring-goal-field] Failed to parse AI response:", text.substring(0, 500));
      return errorResponse(502, "PARSE_FAILED", "Failed to parse suggestions. Please try again.");
    }
  } catch (err: any) {
    console.error("[suggest-hiring-goal-field] Error:", err.message);
    return errorResponse(500, "INTERNAL_ERROR", err.message || "An unexpected error occurred");
  }
});
