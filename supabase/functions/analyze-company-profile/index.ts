import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import * as cheerio from "npm:cheerio@1.0.0-rc.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeBody {
  website?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { website }: AnalyzeBody = await req.json();
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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Supabase env not configured");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

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

    const system = [
      "You are XIM-AI analyzing a company's public website to extract culture and hiring signals.",
      "Return a STRICT JSON object with keys: summary, values, operating_style, communication_style, ideal_traits, risk_areas.",
      "Each key should be concise strings or string arrays. No extra commentary."
    ].join(" ");

    const prompt = `Website: ${website}\n\nContent:\n${corpus}`;

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
      console.error("OpenAI error:", aiResp.status, t);
      return json({ error: "OpenAI request failed" }, 500);
    }

    const aiJson = await aiResp.json();
    const content = aiJson?.choices?.[0]?.message?.content || "{}";

    let analysis: any;
    try {
      analysis = JSON.parse(safeJsonFromText(content));
    } catch {
      analysis = fallbackAnalysis(corpus);
    }

    const pillar_vector = computePillars(analysis);
    const recommended_ximatars = suggestXimatars(pillar_vector, analysis);

    // Ensure a row exists, then update with full analysis
    const { error: upsertErr } = await supabase.from("company_profiles").upsert(
      {
        company_id,
        website,
        summary: analysis.summary || "",
        values: toArray(analysis.values),
        operating_style: analysis.operating_style || "",
        communication_style: analysis.communication_style || "",
        ideal_traits: toArray(analysis.ideal_traits),
        risk_areas: toArray(analysis.risk_areas),
        pillar_vector,
        recommended_ximatars,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" }
    );

    if (upsertErr) {
      console.error("DB upsert error:", upsertErr);
      return json({ error: "Failed to store profile" }, 500);
    }

    return json({ success: true });
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
  const m = s.match(/\{[\s\S]*\}$/);
  return m ? m[0] : "{}";
}

function computePillars(a: any) {
  // Simple heuristics blended with keywords
  const txt = [a.summary, a.operating_style, a.communication_style, ...(toArray(a.values) || [])].join(" ").toLowerCase();
  const score = (cond: boolean, base = 50, inc = 15) => Math.max(0, Math.min(100, base + (cond ? inc : 0)));
  return {
    drive: score(/fast|ambitious|growth|performance|drive|execution/.test(txt), 55, 20),
    comp_power: score(/data|analysis|engineering|ai|software|ops|process/.test(txt), 50, 20),
    communication: score(/communication|team|collaboration|marketing|brand|story/.test(txt), 50, 20),
    creativity: score(/innovation|design|creative|explore|experiment/.test(txt), 50, 20),
    knowledge: score(/expertise|quality|research|learning|safety|compliance/.test(txt), 55, 15),
  };
}

function suggestXimatars(vec: { drive: number; comp_power: number; communication: number; creativity: number; knowledge: number }, a: any): string[] {
  // Basic template vectors 0–100
  const templates: Record<string, { drive: number; comp_power: number; communication: number; creativity: number; knowledge: number }> = {
    lion: { drive: 90, comp_power: 60, communication: 70, creativity: 55, knowledge: 55 },
    owl: { drive: 55, comp_power: 85, communication: 60, creativity: 55, knowledge: 75 },
    dolphin: { drive: 60, comp_power: 55, communication: 85, creativity: 60, knowledge: 60 },
    fox: { drive: 65, comp_power: 60, communication: 75, creativity: 85, knowledge: 55 },
    bear: { drive: 60, comp_power: 65, communication: 55, creativity: 50, knowledge: 85 },
    bee: { drive: 85, comp_power: 80, communication: 55, creativity: 50, knowledge: 60 },
    wolf: { drive: 80, comp_power: 60, communication: 70, creativity: 55, knowledge: 55 },
    cat: { drive: 55, comp_power: 85, communication: 55, creativity: 80, knowledge: 60 },
    parrot: { drive: 60, comp_power: 55, communication: 90, creativity: 70, knowledge: 55 },
    elephant: { drive: 55, comp_power: 65, communication: 60, creativity: 55, knowledge: 90 },
    horse: { drive: 80, comp_power: 65, communication: 60, creativity: 55, knowledge: 60 },
    chameleon: { drive: 65, comp_power: 65, communication: 65, creativity: 65, knowledge: 65 },
  };
  const names = Object.keys(templates);
  const dist = (a: any, b: any) => Math.sqrt(
    (a.drive - b.drive) ** 2 +
    (a.comp_power - b.comp_power) ** 2 +
    (a.communication - b.communication) ** 2 +
    (a.creativity - b.creativity) ** 2 +
    (a.knowledge - b.knowledge) ** 2,
  );
  return names
    .map((n) => ({ n, d: dist(vec, templates[n]) }))
    .sort((x, y) => x.d - y.d)
    .slice(0, 3)
    .map((x) => x.n);
}
