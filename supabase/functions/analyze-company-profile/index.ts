import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import * as cheerio from "npm:cheerio@1.0.0-rc.12";
import { 
  XIMATAR_PROFILES, 
  computePillarsFromText, 
  rankXimatarsByDistance, 
  computeKeywordBonus,
  type XimatarPillars 
} from "../_shared/ximatarTaxonomy.ts";
import { callAiGateway, extractJsonFromAiContent, generateCorrelationId, AiGatewayError } from "../_shared/aiClient.ts";
import { validateCompanyAnalysis } from "../_shared/aiSchema.ts";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";

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
All string values (summary, operating_style, communication_style, values, ideal_traits, risk_areas) must be in ${targetLanguage}.
Do NOT include any English words unless they are proper nouns, brand names, or product names.
Do NOT add bilingual text or translations in parentheses.
JSON keys must remain in English, but ALL values must be in ${targetLanguage}.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = req.headers.get('x-correlation-id') || generateCorrelationId();

  try {
    const { website, locale = 'en' } = await req.json();
    if (!website || !/^https?:\/\//i.test(website)) {
      return errorResponse(400, 'INVALID_INPUT', 'Invalid website URL');
    }

    // ===== P0 SECURITY: Proper JWT verification (replaces manual decodeJwtSub) =====
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return unauthorizedResponse('Missing auth token');
    }
    const token = authHeader.replace("Bearer ", "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return unauthorizedResponse('Invalid or expired token');
    }
    const company_id = claimsData.claims.sub as string;

    // Service role for DB writes
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch and aggregate website text (homepage + likely subpages)
    const pages = [website];
    try {
      const homepage = await fetch(website, { headers: { "User-Agent": ua() } });
      const html = await homepage.text();
      const $ = cheerio.load(html);
      $("a[href]").each((_, el) => {
        const href = ($(el).attr("href") || "").toLowerCase();
        if (href.includes("about") || href.includes("mission") || href.includes("values")) {
          const url = toAbsUrl(website, href);
          if (url && !pages.includes(url) && pages.length < 4) pages.push(url);
        }
      });
    } catch (_) { /* ignore */ }

    let textChunks: string[] = [];
    for (const url of pages) {
      try {
        const res = await fetch(url, { headers: { "User-Agent": ua() } });
        const html = await res.text();
        const $ = cheerio.load(html);
        const text = [
          $("h1,h2,h3,h4").text(),
          $("p,li").text(),
          $("meta[name='description']").attr("content") || "",
        ]
          .join(" \n")
          .replace(/\s+/g, " ")
          .trim();
        if (text) textChunks.push(text);
      } catch (_) { /* ignore single page failures */ }
    }

    const corpus = textChunks.join("\n\n").slice(0, 18000);

    const langInstruction = getLanguageInstruction(locale);
    const system = [
      "You are XIM-AI analyzing a company's public website to extract culture and hiring signals.",
      "Return a STRICT JSON object with keys: summary, values, operating_style, communication_style, ideal_traits, risk_areas.",
      "Each key should be concise strings or string arrays. No extra commentary.",
      langInstruction
    ].join(" ");

    const prompt = `Website: ${website}\n\nContent:\n${corpus}`;

    // ===== OBSERVABILITY: Use shared AI client =====
    let aiContent: string;
    try {
      const aiResp = await callAiGateway({
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
        correlationId,
        functionName: 'analyze-company-profile',
      });
      aiContent = aiResp.content;
    } catch (e) {
      if (e instanceof AiGatewayError) return e.toResponse();
      throw e;
    }

    // ===== RELIABILITY: Strict schema validation =====
    let analysis;
    try {
      const jsonStr = extractJsonFromAiContent(aiContent);
      const parsed = JSON.parse(jsonStr);
      analysis = validateCompanyAnalysis(parsed);
    } catch (parseErr) {
      console.error(JSON.stringify({
        type: 'parse_error', correlation_id: correlationId,
        function_name: 'analyze-company-profile',
      }));
    }

    // Fallback if validation fails
    if (!analysis) {
      console.log(JSON.stringify({
        type: 'validation_fallback', correlation_id: correlationId,
        function_name: 'analyze-company-profile',
      }));
      analysis = fallbackAnalysis(corpus);
    }

    // Ensure all required fields have values
    const normalizedAnalysis = {
      summary: analysis.summary || "Company profile generated from website analysis.",
      values: analysis.values.length > 0 ? analysis.values : ["Innovation", "Quality"],
      operating_style: analysis.operating_style || "Professional and results-oriented.",
      communication_style: analysis.communication_style || "Clear and collaborative.",
      ideal_traits: analysis.ideal_traits.length > 0 ? analysis.ideal_traits : ["Problem-solving", "Teamwork"],
      risk_areas: analysis.risk_areas,
    };

    // Use canonical taxonomy for pillar computation
    const analysisText = [
      normalizedAnalysis.summary, 
      normalizedAnalysis.operating_style, 
      normalizedAnalysis.communication_style, 
      ...(normalizedAnalysis.values || []),
      ...(normalizedAnalysis.ideal_traits || [])
    ].join(" ");
    
    const pillar_vector = computePillarsFromText(analysisText);
    
    // Rank XIMAtars using canonical taxonomy with keyword bonus
    const contextKeywords = [
      ...(normalizedAnalysis.values || []),
      ...(normalizedAnalysis.ideal_traits || [])
    ];
    
    const rankedXimatars = rankXimatarsByDistance(pillar_vector).map(x => {
      const { bonus, matchedKeywords } = computeKeywordBonus(x.id, contextKeywords);
      return {
        ...x,
        adjustedDistance: x.distance - bonus,
        matchedKeywords
      };
    }).sort((a, b) => a.adjustedDistance - b.adjustedDistance);
    
    const recommended_ximatars = rankedXimatars.slice(0, 3).map(x => x.id);
    const ideal_ximatar_profile_ids = rankedXimatars.map(x => x.id);
    
    const ideal_ximatar_profile_reasoning = rankedXimatars.slice(0, 3).map(x => {
      const profile = XIMATAR_PROFILES[x.id];
      const keywords = x.matchedKeywords.length > 0 
        ? `Matched keywords: ${x.matchedKeywords.slice(0, 3).join(', ')}. `
        : '';
      return `${profile.name} (${profile.title}): ${keywords}Distance: ${x.distance.toFixed(1)}`;
    }).join(' | ');

    console.log(JSON.stringify({
      type: 'success', correlation_id: correlationId,
      function_name: 'analyze-company-profile',
      ideal_ximatar_count: ideal_ximatar_profile_ids.length,
    }));

    const { error: upsertErr } = await supabase.from("company_profiles").upsert(
      {
        company_id,
        website,
        summary: normalizedAnalysis.summary,
        values: normalizedAnalysis.values,
        operating_style: normalizedAnalysis.operating_style,
        communication_style: normalizedAnalysis.communication_style,
        ideal_traits: normalizedAnalysis.ideal_traits,
        risk_areas: normalizedAnalysis.risk_areas,
        pillar_vector,
        recommended_ximatars,
        ideal_ximatar_profile_ids,
        ideal_ximatar_profile_reasoning,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" }
    );

    if (upsertErr) {
      console.error(JSON.stringify({
        type: 'db_error', correlation_id: correlationId,
        function_name: 'analyze-company-profile',
        error: upsertErr.message,
      }));
      return errorResponse(500, 'DB_ERROR', 'Failed to store profile');
    }

    return jsonResponse({ success: true, ideal_ximatar_profile_ids, recommended_ximatars });
  } catch (e) {
    console.error(JSON.stringify({
      type: 'unhandled_error', correlation_id: correlationId,
      function_name: 'analyze-company-profile',
      error: e instanceof Error ? e.message : 'Unknown error',
    }));
    return errorResponse(500, 'INTERNAL_ERROR', e instanceof Error ? e.message : 'Unknown error');
  }
});

function toAbsUrl(base: string, href: string): string | null {
  try { return new URL(href, base).toString(); } catch { return null; }
}

function ua() {
  return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";
}

function fallbackAnalysis(corpus: string) {
  const sentences = corpus.split(/[.!?]+/).filter(s => s.trim().length > 20);
  return {
    summary: sentences.slice(0, 2).join('. ').slice(0, 300) || "Company profile analysis pending.",
    values: ["Innovation", "Quality", "Customer Focus"],
    operating_style: "Results-oriented with focus on efficiency",
    communication_style: "Professional and collaborative",
    ideal_traits: ["Adaptability", "Problem-solving", "Team collaboration"],
    risk_areas: ["Rapid scaling challenges", "Market competition"],
  };
}
