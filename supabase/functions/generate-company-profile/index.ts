/**
 * XIMA Company Intelligence Engine v3.0
 * 
 * Multi-page website scanning: discovers and fetches homepage + about + values + team + careers.
 * Extracts open positions from careers pages automatically.
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
// Page discovery & fetching
// =====================================================

const KEY_PAGE_PATTERNS: Record<string, RegExp[]> = {
  about: [/\/about/i, /\/chi-siamo/i, /\/who-we-are/i, /\/company/i, /\/azienda/i, /\/sobre/i, /\/ueber-uns/i],
  values: [/\/values/i, /\/valori/i, /\/culture/i, /\/cultura/i, /\/mission/i, /\/missione/i, /\/purpose/i],
  team: [/\/team/i, /\/people/i, /\/leadership/i, /\/management/i, /\/dirigenza/i, /\/persone/i],
  careers: [/\/careers/i, /\/jobs/i, /\/lavora-con-noi/i, /\/join/i, /\/positions/i, /\/opportunit/i, /\/carriere/i, /\/hiring/i, /\/offerte/i, /\/trabajo/i, /\/karriere/i, /\/stellenangebote/i],
};

function identifyPageType(url: string): string {
  const u = url.toLowerCase();
  for (const [type, patterns] of Object.entries(KEY_PAGE_PATTERNS)) {
    if (patterns.some(p => p.test(u))) return type;
  }
  return 'homepage';
}

function discoverKeyPages(baseUrl: string, homepageHtml: string): string[] {
  const linkMatches = homepageHtml.match(/href=["']([^"']+)["']/gi) || [];
  const links = linkMatches
    .map(m => m.replace(/href=["']/i, '').replace(/["']$/, ''))
    .map(href => {
      try {
        if (href.startsWith('http')) return href;
        if (href.startsWith('/')) return new URL(href, baseUrl).href;
        return new URL(href, baseUrl).href;
      } catch { return null; }
    })
    .filter(Boolean)
    .filter(url => {
      try { return new URL(url!).hostname === new URL(baseUrl).hostname; }
      catch { return false; }
    }) as string[];

  const unique = [...new Set(links)];
  const discovered: Record<string, string> = {};

  for (const [pageType, patterns] of Object.entries(KEY_PAGE_PATTERNS)) {
    for (const url of unique) {
      if (patterns.some(p => p.test(url))) {
        if (!discovered[pageType]) {
          discovered[pageType] = url;
        }
        break;
      }
    }
  }

  console.log("[generate-company-profile] Discovered pages:", JSON.stringify(discovered));
  return Object.values(discovered);
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface PageResult {
  url: string;
  text: string;
  rawHtml: string;
  pageType: string;
}

async function fetchPage(url: string, maxChars = 8000): Promise<PageResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; XIMABot/1.0)" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!response.ok) return { url, text: '', rawHtml: '', pageType: identifyPageType(url) };

    const html = await response.text();
    const text = stripHtmlToText(html).substring(0, maxChars);
    return { url, text, rawHtml: html, pageType: identifyPageType(url) };
  } catch (_e) {
    console.warn(`[generate-company-profile] Failed to fetch ${url}`);
    return { url, text: '', rawHtml: '', pageType: identifyPageType(url) };
  }
}

async function fetchAllPages(website: string): Promise<PageResult[]> {
  let baseUrl = website.trim();
  if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
  baseUrl = baseUrl.replace(/\/$/, "");

  // Step 1: Fetch homepage
  const homepage = await fetchPage(baseUrl);
  if (homepage.text.length < 100) return homepage.text.length > 0 ? [homepage] : [];

  // Step 2: Discover key pages from homepage links
  const keyPageUrls = discoverKeyPages(baseUrl, homepage.rawHtml);

  // Step 3: Fetch all discovered pages in parallel
  const additionalPages = await Promise.all(
    keyPageUrls.map(url => fetchPage(url))
  );

  const allPages = [homepage, ...additionalPages].filter(p => p.text.length > 100);
  console.log(`[generate-company-profile] Scanned ${allPages.length} pages: ${allPages.map(p => p.pageType).join(', ')}`);
  return allPages;
}

// =====================================================
// Claude system prompt
// =====================================================

function buildCompanyProfilePrompt(pageTypes: string[]): string {
  const ximatarRef = Object.entries(XIMATAR_PROFILES)
    .map(([id, p]) => `- ${p.name} (${id}): Drive ${p.pillars.drive}, CompPower ${p.pillars.comp_power}, Comm ${p.pillars.communication}, Creativity ${p.pillars.creativity}, Knowledge ${p.pillars.knowledge} — ${p.title}`)
    .join("\n");

  const hasCareerPage = pageTypes.includes('careers');

  return `You are the XIMA Company Intelligence Engine. You analyze company websites (multiple pages) to create a psychometric profile that captures the organization's behavioral DNA.

You have content from these page types: ${pageTypes.join(', ')}.

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

LANGUAGE: Detect the website language. Write summary, operating_style, communication_style, ideal_traits, risk_areas, values, company_culture, and culture_insights in the SAME language as the website.

Return ONLY valid JSON:
{
  "summary": "3-5 sentence comprehensive summary based on all pages scanned",
  "values": ["value1", "value2", "value3", "value4"],
  "operating_style": "2-3 sentence description of how the company operates, based on evidence from about/values/team pages",
  "communication_style": "1-2 sentence description of communication culture",
  "ideal_traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
  "risk_areas": ["risk1", "risk2"],
  "company_culture": "2-3 sentences describing the actual culture based on team page, values page, and overall tone",
  "culture_insights": {
    "strengths": ["What this company does well culturally"],
    "watch_points": ["Areas where the culture might create friction for certain candidates"],
    "hiring_advice": "One paragraph of practical advice for this company's HR team"
  },
  "industry_focus": "Primary industry or sector",
  "pillar_vector": { "drive": 65, "comp_power": 70, "communication": 60, "creativity": 55, "knowledge": 60 },
  "recommended_ximatars": ["archetype1", "archetype2", "archetype3"],
  "snapshot": { "hq_city": "string or null", "hq_country": "string or null", "industry": "string or null", "employees_count": null, "revenue_range": "string or null", "founded_year": null },
  "detected_language": "en"${hasCareerPage ? `,
  "open_positions": [
    {
      "title": "Job title",
      "location": "Location or Remote",
      "department": "Department if identifiable",
      "employment_type": "full-time or part-time or contract",
      "description": "Brief description (2-3 sentences max)",
      "source_url": "URL of the careers page"
    }
  ]` : ''}
}

IMPORTANT:
- Base your analysis on ACTUAL content from the website, not assumptions
- The pillar scores should reflect the company's emphasis, not generic scores
${hasCareerPage ? '- For open_positions, only include positions clearly listed as open/active — do not invent positions' : '- No careers page was provided, so do not include open_positions'}`;
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
  company_culture: string;
  culture_insights: { strengths: string[]; watch_points: string[]; hiring_advice: string } | null;
  industry_focus: string;
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
  open_positions: Array<{
    title: string;
    location: string;
    department: string | null;
    employment_type: string;
    description: string;
    source_url: string;
  }>;
}

function validateProfileResponse(parsed: unknown): ValidatedProfile | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.summary !== "string" || obj.summary.length < 10) return null;
  if (typeof obj.operating_style !== "string" || obj.operating_style.length < 5) return null;
  if (!Array.isArray(obj.values) || obj.values.length < 2) return null;

  const pv = obj.pillar_vector as Record<string, unknown> | undefined;
  if (!pv || typeof pv !== "object") return null;
  const pillarKeys = ["drive", "comp_power", "communication", "creativity", "knowledge"];
  for (const k of pillarKeys) {
    if (typeof pv[k] !== "number" || (pv[k] as number) < 30 || (pv[k] as number) > 95) return null;
  }

  if (!Array.isArray(obj.recommended_ximatars) || obj.recommended_ximatars.length < 1) return null;
  const validIds = Object.keys(XIMATAR_PROFILES);
  const validArchetypes = (obj.recommended_ximatars as string[]).filter(id => validIds.includes(id));
  if (validArchetypes.length === 0) return null;

  const snapshot = (obj.snapshot as Record<string, unknown>) || {};

  // Parse culture_insights
  let cultureInsights = null;
  if (obj.culture_insights && typeof obj.culture_insights === "object") {
    const ci = obj.culture_insights as Record<string, unknown>;
    cultureInsights = {
      strengths: Array.isArray(ci.strengths) ? ci.strengths as string[] : [],
      watch_points: Array.isArray(ci.watch_points) ? ci.watch_points as string[] : [],
      hiring_advice: typeof ci.hiring_advice === "string" ? ci.hiring_advice : "",
    };
  }

  // Parse open_positions
  const openPositions: ValidatedProfile["open_positions"] = [];
  if (Array.isArray(obj.open_positions)) {
    for (const pos of obj.open_positions) {
      if (pos && typeof pos === "object" && typeof (pos as any).title === "string") {
        const p = pos as Record<string, unknown>;
        openPositions.push({
          title: p.title as string,
          location: (p.location as string) || "",
          department: typeof p.department === "string" ? p.department : null,
          employment_type: (p.employment_type as string) || "full-time",
          description: (p.description as string) || "",
          source_url: (p.source_url as string) || "",
        });
      }
    }
  }

  return {
    summary: obj.summary as string,
    values: obj.values as string[],
    operating_style: obj.operating_style as string,
    communication_style: (obj.communication_style as string) || "",
    ideal_traits: Array.isArray(obj.ideal_traits) ? obj.ideal_traits as string[] : [],
    risk_areas: Array.isArray(obj.risk_areas) ? obj.risk_areas as string[] : [],
    company_culture: typeof obj.company_culture === "string" ? obj.company_culture : "",
    culture_insights: cultureInsights,
    industry_focus: typeof obj.industry_focus === "string" ? obj.industry_focus : "",
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
    open_positions: openPositions,
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

    const { company_id, company_name, website } = await req.json();
    if (!company_id || !company_name || !website) {
      return errorResponse(400, "MISSING_FIELDS", "company_id, company_name, and website are required");
    }

    if (company_id !== callerUserId) {
      return forbiddenResponse("Can only generate profile for your own company");
    }

    console.log(JSON.stringify({ type: "company_profile_start", correlation_id: correlationId, company_name, website }));

    // ===== Multi-page scanning =====
    const pages = await fetchAllPages(website);
    if (pages.length === 0 || pages.every(p => p.text.length < 100)) {
      return errorResponse(400, "INSUFFICIENT_CONTENT", "Could not extract enough content from the website. Please check the URL.");
    }

    const pageTypes = pages.map(p => p.pageType);
    const pagesContext = pages.map(p =>
      `=== ${p.pageType.toUpperCase()} PAGE (${p.url}) ===\n${p.text}`
    ).join('\n\n');

    // ===== Claude call =====
    const systemPrompt = buildCompanyProfilePrompt(pageTypes);
    const userMessage = `Analyze this company's website content and create their XIMA psychometric profile.\n\nCompany name: ${company_name}\nWebsite: ${website}\n\n${pagesContext}`;

    const result = await callAnthropicApi({
      system: systemPrompt,
      userMessage,
      correlationId,
      functionName: "generate-company-profile",
      inputSummary: `company:${company_name},pages:${pages.length},types:${pageTypes.join(',')}`,
      maxTokens: 4096,
      promptTemplateVersion: "3.0",
    });

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

    // Cross-check recommended XIMatars
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

    // ===== Store to company_profiles =====
    const pagesScanned = pages.map(p => ({ url: p.url, type: p.pageType }));

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
        company_culture: validated.company_culture,
        culture_insights: validated.culture_insights,
        industry_focus: validated.industry_focus,
        pages_scanned: pagesScanned,
        open_positions_found: validated.open_positions,
        last_scan_at: new Date().toISOString(),
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

    // ===== Store discovered positions as drafts =====
    if (validated.open_positions.length > 0) {
      console.log(`[generate-company-profile] Found ${validated.open_positions.length} open positions`);
      for (const pos of validated.open_positions) {
        try {
          await supabase.from("job_post_drafts").upsert({
            business_id: callerUserId,
            role_title: pos.title,
            location: pos.location || null,
            department: pos.department,
            employment_type: pos.employment_type || "full-time",
            description: pos.description || null,
            source_url: pos.source_url || website,
            import_source: "website_scan",
            status: "draft",
          }, { onConflict: "business_id,role_title" });
        } catch (e) {
          console.warn("[generate-company-profile] Failed to upsert draft:", e);
        }
      }
    }

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
        pages_scanned: pagesScanned.length,
        page_types: pageTypes,
        open_positions_found: validated.open_positions.length,
        detected_language: validated.detected_language,
        top_ximatar: validated.recommended_ximatars[0],
      },
    }, "company_profiles_generated");

    console.log(JSON.stringify({
      type: "company_profile_success",
      correlation_id: correlationId,
      pages: pagesScanned.length,
      positions_found: validated.open_positions.length,
      top_ximatar: validated.recommended_ximatars[0],
    }));

    return jsonResponse({
      success: true,
      profile: data,
      pages_scanned: pagesScanned.length,
      open_positions_found: validated.open_positions.length,
    });
  } catch (e) {
    if (e instanceof AnthropicError) {
      console.error(JSON.stringify({ type: "anthropic_error", correlation_id: correlationId, code: e.errorCode, status: e.statusCode }));
      return errorResponse(e.statusCode, e.errorCode, e.message);
    }
    console.error(JSON.stringify({ type: "unhandled_error", correlation_id: correlationId, error: e instanceof Error ? e.message : String(e) }));
    return errorResponse(500, "INTERNAL_ERROR", "An unexpected error occurred");
  }
});
