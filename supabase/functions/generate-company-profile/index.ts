/**
 * XIMA Company Intelligence Engine v2.0
 * 
 * Analyzes company websites using Claude to create psychometric profiles.
 * Replaces regex-based pattern matching with genuine AI company understanding.
 * 
 * Feeds into: L1 challenge generation, job matching, L2 challenge generation.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicApi, AnthropicError } from "../_shared/anthropicClient.ts";
import { extractJsonFromAiContent, generateCorrelationId } from "../_shared/aiClient.ts";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse, forbiddenResponse } from "../_shared/errors.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";
import { emitAuditEventWithMetric } from "../_shared/auditEvents.ts";
import { XIMATAR_PROFILES, rankXimatarsByDistance, type XimatarPillars } from "../_shared/ximatarTaxonomy.ts";

// =====================================================
// Website content fetching
// =====================================================

async function fetchCompanyContent(website: string): Promise<string> {
  let baseUrl = website.trim();
  if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
  baseUrl = baseUrl.replace(/\/$/, "");

  const pages = [
    baseUrl,
    baseUrl + "/about",
    baseUrl + "/about-us",
    baseUrl + "/chi-siamo",
    baseUrl + "/company",
  ];

  const contents: string[] = [];

  for (const url of pages) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; XIMABot/1.0)" },
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (response.ok) {
        const html = await response.text();
        const text = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
          .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (text.length > 100) {
          contents.push(text.substring(0, 3000));
        }
      }
    } catch (_e) {
      // Silently skip failed pages
    }
  }

  return contents.join("\n\n---PAGE BREAK---\n\n").substring(0, 12000);
}

// =====================================================
// Claude system prompt
// =====================================================

function buildCompanyProfilePrompt(): string {
  // Build XIMAtar reference from canonical taxonomy
  const ximatarRef = Object.entries(XIMATAR_PROFILES)
    .map(([id, p]) => `- ${p.name} (${id}): Drive ${p.pillars.drive}, CompPower ${p.pillars.comp_power}, Comm ${p.pillars.communication}, Creativity ${p.pillars.creativity}, Knowledge ${p.pillars.knowledge} — ${p.title}`)
    .join("\n");

  return `You are the XIMA Company Intelligence Engine. You analyze company websites to create a psychometric profile that captures the organization's behavioral DNA.

Your analysis goes far beyond keyword detection. You read like a senior organizational consultant: inferring leadership philosophy from how they talk about teams, detecting innovation culture from product descriptions, understanding pace and pressure from job-related language, and sensing communication style from tone and structure.

XIMA'S 5 PILLARS (score each 30-95 for the company's ideal employee):
- drive: How much does this company value initiative, speed, ownership, proactivity?
- comp_power: How much does this company value technical depth, analytical rigor, data-driven thinking?
- communication: How much does this company value collaboration, stakeholder management, team dynamics?
- creativity: How much does this company value innovation, unconventional thinking, experimentation?
- knowledge: How much does this company value domain expertise, formal qualifications, depth of experience?

SCORING GUIDE:
- 30-45: Company doesn't emphasize this pillar
- 46-60: Moderate emphasis
- 61-75: Strong emphasis
- 76-95: Core defining trait

RECOMMENDED XIMATARS (pick top 3 from these 12 archetypes):
${ximatarRef}

SNAPSHOT EXTRACTION:
Also extract factual data if present in the website content:
- HQ city and country
- Industry (standardized)
- Employee count (number or estimate)
- Revenue range (if mentioned)
- Founded year

LANGUAGE: Detect the website language. Write summary, operating_style, communication_style, ideal_traits, risk_areas, and values in the SAME language as the website.

Return ONLY valid JSON:
{
  "summary": "3-4 sentence nuanced description of the company's culture and identity",
  "values": ["value1", "value2", "value3", "value4"],
  "operating_style": "2-3 sentence description of how the company operates",
  "communication_style": "1-2 sentence description of communication culture",
  "ideal_traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
  "risk_areas": ["risk1", "risk2"],
  "pillar_vector": { "drive": 65, "comp_power": 70, "communication": 60, "creativity": 55, "knowledge": 60 },
  "recommended_ximatars": ["archetype1", "archetype2", "archetype3"],
  "snapshot": { "hq_city": "string or null", "hq_country": "string or null", "industry": "string or null", "employees_count": null, "revenue_range": "string or null", "founded_year": null },
  "detected_language": "en"
}`;
}

// =====================================================
// Validation
// =====================================================

interface ValidatedProfile {
  summary: string;
  values: string[];
  operating_style: string;
  communication_style: string;
  ideal_traits: string[];
  risk_areas: string[];
  pillar_vector: { drive: number; comp_power: number; communication: number; creativity: number; knowledge: number };
  recommended_ximatars: string[];
  snapshot: {
    hq_city: string | null;
    hq_country: string | null;
    industry: string | null;
    employees_count: number | null;
    revenue_range: string | null;
    founded_year: number | null;
  };
  detected_language: string;
}

function validateProfileResponse(parsed: unknown): ValidatedProfile | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.summary !== "string" || obj.summary.length < 10) return null;
  if (typeof obj.operating_style !== "string" || obj.operating_style.length < 5) return null;
  if (!Array.isArray(obj.values) || obj.values.length < 2) return null;

  // Validate pillar vector
  const pv = obj.pillar_vector as Record<string, unknown> | undefined;
  if (!pv || typeof pv !== "object") return null;
  const pillarKeys = ["drive", "comp_power", "communication", "creativity", "knowledge"];
  for (const k of pillarKeys) {
    if (typeof pv[k] !== "number" || (pv[k] as number) < 30 || (pv[k] as number) > 95) return null;
  }

  // Validate recommended_ximatars
  if (!Array.isArray(obj.recommended_ximatars) || obj.recommended_ximatars.length < 1) return null;
  const validIds = Object.keys(XIMATAR_PROFILES);
  const validArchetypes = (obj.recommended_ximatars as string[]).filter(id => validIds.includes(id));
  if (validArchetypes.length === 0) return null;

  const snapshot = (obj.snapshot as Record<string, unknown>) || {};

  return {
    summary: obj.summary as string,
    values: obj.values as string[],
    operating_style: obj.operating_style as string,
    communication_style: (obj.communication_style as string) || "",
    ideal_traits: Array.isArray(obj.ideal_traits) ? obj.ideal_traits as string[] : [],
    risk_areas: Array.isArray(obj.risk_areas) ? obj.risk_areas as string[] : [],
    pillar_vector: pv as ValidatedProfile["pillar_vector"],
    recommended_ximatars: validArchetypes.slice(0, 3),
    snapshot: {
      hq_city: typeof snapshot.hq_city === "string" ? snapshot.hq_city : null,
      hq_country: typeof snapshot.hq_country === "string" ? snapshot.hq_country : null,
      industry: typeof snapshot.industry === "string" ? snapshot.industry : null,
      employees_count: typeof snapshot.employees_count === "number" ? snapshot.employees_count : null,
      revenue_range: typeof snapshot.revenue_range === "string" ? snapshot.revenue_range : null,
      founded_year: typeof snapshot.founded_year === "number" ? snapshot.founded_year : null,
    },
    detected_language: typeof obj.detected_language === "string" ? obj.detected_language : "en",
  };
}

// =====================================================
// Main handler
// =====================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = extractCorrelationId(req);

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return unauthorizedResponse();
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return unauthorizedResponse();
    }
    const callerUserId = user.id;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse request
    const { company_id, company_name, website } = await req.json();
    if (!company_id || !company_name || !website) {
      return errorResponse(400, "MISSING_FIELDS", "company_id, company_name, and website are required");
    }

    // Ownership check
    if (company_id !== callerUserId) {
      return forbiddenResponse("Can only generate profile for your own company");
    }

    console.log(JSON.stringify({ type: "company_profile_start", correlation_id: correlationId, company_name, website }));

    // Fetch website content (multiple pages)
    const websiteContent = await fetchCompanyContent(website);
    if (websiteContent.length < 100) {
      return errorResponse(400, "INSUFFICIENT_CONTENT", "Could not extract enough content from the website. Please check the URL.");
    }

    // Call Claude
    const systemPrompt = buildCompanyProfilePrompt();
    const userMessage = `Analyze this company's website content and create their XIMA psychometric profile.\n\nCompany name: ${company_name}\nWebsite: ${website}\n\n---WEBSITE CONTENT---\n${websiteContent}\n---END---`;

    const result = await callAnthropicApi({
      system: systemPrompt,
      userMessage,
      correlationId,
      functionName: "generate-company-profile",
      inputSummary: `company:${company_name},content_len:${websiteContent.length}`,
      maxTokens: 4096,
      promptTemplateVersion: "2.0",
    });

    // Parse and validate
    const cleanedJson = extractJsonFromAiContent(result.content);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch {
      console.error(JSON.stringify({ type: "json_parse_error", correlation_id: correlationId }));
      return errorResponse(502, "AI_PARSE_FAILED", "Failed to parse AI response");
    }

    const validated = validateProfileResponse(parsed);
    if (!validated) {
      console.error(JSON.stringify({ type: "validation_failed", correlation_id: correlationId }));
      return errorResponse(502, "AI_VALIDATION_FAILED", "AI response did not pass validation");
    }

    // Cross-check recommended XIMatars against algorithmic ranking
    const pillarVec: XimatarPillars = {
      drive: validated.pillar_vector.drive,
      comp_power: validated.pillar_vector.comp_power,
      communication: validated.pillar_vector.communication,
      creativity: validated.pillar_vector.creativity,
      knowledge: validated.pillar_vector.knowledge,
    };
    const algorithmicRanking = rankXimatarsByDistance(pillarVec).slice(0, 3).map(r => r.id);
    const overlap = validated.recommended_ximatars.filter(id => algorithmicRanking.includes(id));
    if (overlap.length === 0) {
      console.warn(JSON.stringify({
        type: "ximatar_divergence",
        correlation_id: correlationId,
        claude: validated.recommended_ximatars,
        algorithmic: algorithmicRanking,
      }));
    }

    // Store to company_profiles
    const { data, error } = await supabase
      .from("company_profiles")
      .upsert({
        company_id,
        website,
        summary: validated.summary,
        values: validated.values,
        operating_style: validated.operating_style,
        communication_style: validated.communication_style,
        ideal_traits: validated.ideal_traits,
        risk_areas: validated.risk_areas,
        pillar_vector: validated.pillar_vector,
        recommended_ximatars: validated.recommended_ximatars,
        ideal_ximatar_profile_ids: validated.recommended_ximatars,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id" })
      .select()
      .single();

    if (error) {
      console.error(JSON.stringify({ type: "db_error", correlation_id: correlationId, error: error.message }));
      return errorResponse(500, "DB_ERROR", "Failed to store company profile");
    }

    // Update business_profiles snapshot
    await supabase
      .from("business_profiles")
      .update({
        snapshot_hq_city: validated.snapshot.hq_city,
        snapshot_hq_country: validated.snapshot.hq_country,
        snapshot_industry: validated.snapshot.industry,
        snapshot_employees_count: validated.snapshot.employees_count,
        snapshot_revenue_range: validated.snapshot.revenue_range,
        snapshot_founded_year: validated.snapshot.founded_year,
        snapshot_last_enriched_at: new Date().toISOString(),
      })
      .eq("user_id", company_id);

    // Audit
    emitAuditEventWithMetric({
      actorType: "business",
      actorId: callerUserId,
      action: "company.profile_generated",
      entityType: "company_profile",
      entityId: company_id,
      correlationId,
      metadata: {
        website,
        detected_language: validated.detected_language,
        top_ximatar: validated.recommended_ximatars[0],
      },
    }, "company_profiles_generated");

    console.log(JSON.stringify({ type: "company_profile_success", correlation_id: correlationId, top_ximatar: validated.recommended_ximatars[0] }));

    return jsonResponse({ success: true, profile: data });
  } catch (e) {
    if (e instanceof AnthropicError) {
      console.error(JSON.stringify({ type: "anthropic_error", correlation_id: correlationId, code: e.errorCode, status: e.statusCode }));
      return errorResponse(e.statusCode, e.errorCode, e.message);
    }
    console.error(JSON.stringify({ type: "unhandled_error", correlation_id: correlationId, error: e instanceof Error ? e.message : String(e) }));
    return errorResponse(500, "INTERNAL_ERROR", "An unexpected error occurred");
  }
});
