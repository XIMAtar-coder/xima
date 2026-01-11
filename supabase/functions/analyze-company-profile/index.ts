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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeBody {
  website?: string;
  locale?: string;
}

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

  try {
    const { website, locale = 'en' }: AnalyzeBody = await req.json();
    if (!website || !/^https?:\/\//i.test(website)) {
      return json({ error: "Invalid website URL" }, 400);
    }

    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing auth token" }, 401);
    }
    const jwt = authHeader.replace("Bearer ", "");
    const company_id = decodeJwtSub(jwt);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Supabase env not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch and aggregate website text (homepage + likely subpages)
    const pages = [website];
    try {
      const homepage = await fetch(website, { headers: { "User-Agent": ua() } });
      const html = await homepage.text();
      const $ = cheerio.load(html);
      // look for about/mission/values links
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

    const corpus = textChunks.join("\n\n").slice(0, 18000); // keep under model limits

    const langInstruction = getLanguageInstruction(locale);
    const system = [
      "You are XIM-AI analyzing a company's public website to extract culture and hiring signals.",
      "Return a STRICT JSON object with keys: summary, values, operating_style, communication_style, ideal_traits, risk_areas.",
      "Each key should be concise strings or string arrays. No extra commentary.",
      langInstruction
    ].join(" ");

    const prompt = `Website: ${website}\n\nContent:\n${corpus}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("Lovable AI error:", aiResp.status, t);
      if (aiResp.status === 429) return json({ error: "Rate limit exceeded. Please try again later." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted. Please add credits in Settings." }, 402);
      return json({ error: "AI request failed" }, 500);
    }

    const aiJson = await aiResp.json();
    const content = aiJson?.choices?.[0]?.message?.content || "{}";
    console.log("AI raw response:", content);

    let analysis: any;
    try {
      const jsonStr = safeJsonFromText(content);
      console.log("Extracted JSON:", jsonStr);
      analysis = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("JSON parse error, using fallback:", parseErr);
      analysis = fallbackAnalysis(corpus);
    }

    // Ensure all required fields have values
    const normalizedAnalysis = {
      summary: analysis.summary || "Company profile generated from website analysis.",
      values: toArray(analysis.values).length > 0 ? toArray(analysis.values) : ["Innovation", "Quality"],
      operating_style: analysis.operating_style || "Professional and results-oriented.",
      communication_style: analysis.communication_style || "Clear and collaborative.",
      ideal_traits: toArray(analysis.ideal_traits).length > 0 ? toArray(analysis.ideal_traits) : ["Problem-solving", "Teamwork"],
      risk_areas: toArray(analysis.risk_areas),
    };

    console.log("Normalized analysis:", normalizedAnalysis);

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
        adjustedDistance: x.distance - bonus, // Lower is better
        matchedKeywords
      };
    }).sort((a, b) => a.adjustedDistance - b.adjustedDistance);
    
    // Top 3 for recommended_ximatars (legacy field)
    const recommended_ximatars = rankedXimatars.slice(0, 3).map(x => x.id);
    
    // All 12 ranked IDs for ideal_ximatar_profile_ids
    const ideal_ximatar_profile_ids = rankedXimatars.map(x => x.id);
    
    // Build reasoning for top picks
    const ideal_ximatar_profile_reasoning = rankedXimatars.slice(0, 3).map(x => {
      const profile = XIMATAR_PROFILES[x.id];
      const keywords = x.matchedKeywords.length > 0 
        ? `Matched keywords: ${x.matchedKeywords.slice(0, 3).join(', ')}. `
        : '';
      return `${profile.name} (${profile.title}): ${keywords}Distance: ${x.distance.toFixed(1)}`;
    }).join(' | ');

    console.log("Upserting profile for company_id:", company_id);
    console.log("Ideal XIMAtar profile IDs:", ideal_ximatar_profile_ids);

    // Ensure a row exists, then update with full analysis
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
      console.error("DB upsert error:", upsertErr);
      return json({ error: "Failed to store profile" }, 500);
    }

    console.log("Profile saved successfully");
    return json({ success: true, ideal_ximatar_profile_ids, recommended_ximatars });
  } catch (e) {
    console.error("analyze_company_profile error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function decodeJwtSub(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload.sub;
  } catch {
    return "";
  }
}

function toAbsUrl(base: string, href: string): string | null {
  try { return new URL(href, base).toString(); } catch { return null; }
}

function ua() {
  return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";
}

function toArray(x: any): string[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.map((s) => String(s)).slice(0, 20);
  return String(x)
    .split(/[;,•\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function safeJsonFromText(s: string) {
  // Try to extract JSON from markdown code blocks first
  const codeBlockMatch = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const extracted = codeBlockMatch[1].trim();
    const jsonMatch = extracted.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : "{}";
  }
  // Otherwise find any JSON object
  const m = s.match(/\{[\s\S]*\}/);
  return m ? m[0] : "{}";
}

function fallbackAnalysis(corpus: string) {
  // Extract basic info when AI parsing fails
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

// NOTE: computePillars and suggestXimatars have been replaced by
// canonical functions from _shared/ximatarTaxonomy.ts
