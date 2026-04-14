// SCHEMA PREFLIGHT (verified 2026-04-14):
// job_posts: id, business_id, title, description, location, employment_type, seniority,
//   salary_range, required_skills, requirements, benefits, department, industry, company_name,
//   source_url, import_method, xima_hr_requested, xima_hr_requested_at, xima_hr_status,
//   linked_hiring_goal_id, ai_suggested_ximatar, published_at, filled_at
// SALARY CONVENTION: salary_min/salary_max are ALWAYS gross (RAL). Net-to-gross ×1.4 at import.
// AI MODEL ROUTING:
//   - Haiku (claude-haiku-4-5-20251001): structural field extraction
//   - Sonnet (claude-sonnet-4-20250514): XIMAtar archetype suggestion

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse } from "../_shared/errors.ts";

function extractJsonSafe(text: string): any {
  let s = typeof text === "string" ? text.trim() : String(text);
  const fence = s.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fence) s = fence[1].trim();
  if (!s.startsWith("{") && !s.startsWith("[")) {
    const first = s.indexOf("{");
    const last = s.lastIndexOf("}");
    if (first !== -1 && last > first) s = s.substring(first, last + 1);
  }
  return JSON.parse(s);
}

const XIMATAR_DESCRIPTIONS = `
1. Lion — The Executive Leader: High drive (90), strong communication (70). Strategic, decisive, authoritative. Ideal for CEO, MD, VP roles.
2. Owl — The Analytical Thinker: High comp_power (85), strong knowledge (75). Data-driven, methodical, insightful. Ideal for Data Scientist, Research Analyst.
3. Dolphin — The Team Facilitator: High communication (85), balanced pillars. Collaborative, empathetic, supportive. Ideal for HR Manager, Team Lead.
4. Fox — The Strategic Opportunist: High creativity (85), strong communication (75). Adaptive, resourceful, persuasive. Ideal for Business Development, Sales Manager.
5. Bear — The Grounded Protector: High knowledge (85), strong comp_power (65). Reliable, stable, governance-focused. Ideal for Compliance Officer, Risk Manager.
6. Bee — The Purposeful Contributor: High drive (85) + comp_power (80). Process-oriented, diligent, disciplined. Ideal for Operations Coordinator, Project Coordinator.
7. Wolf — The Pack Strategist: High drive (80), strong communication (70). Team-oriented, loyal, strategic executor. Ideal for Team Lead, Sales Director.
8. Cat — The Independent Specialist: High comp_power (85) + creativity (80). Autonomous, precise, deep expertise. Ideal for Senior Engineer, Architect.
9. Parrot — The Charismatic Communicator: High communication (90), strong creativity (70). Expressive, storyteller, socially engaging. Ideal for Marketing Manager, Brand Manager.
10. Elephant — The Wise Mentor: High knowledge (90), strong comp_power (65). Wise, experienced, institutional memory. Ideal for Senior Advisor, Principal.
11. Horse — The Relentless Performer: High drive (80), consistent across pillars. Hardworking, enduring, performance-driven. Ideal for Sales Rep, Production Manager.
12. Chameleon — The Adaptive Generalist: Balanced pillars (all ~65). Versatile, flexible, context-switching. Ideal for Product Manager, Consultant.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return unauthorizedResponse("Missing auth");

    const jwt = authHeader.replace("Bearer ", "").trim();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) return unauthorizedResponse("Auth required");
    const userId = claimsData.claims.sub as string;

    const contentType = req.headers.get("content-type") || "";
    let importMethod: string;
    let sourceUrl: string | null = null;
    let rawText = "";

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return errorResponse(500, "CONFIG_ERROR", "API key not configured");

    if (contentType.includes("multipart/form-data")) {
      importMethod = "file";
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) return errorResponse(400, "INVALID_INPUT", "File required");

      const fileBytes = new Uint8Array(await file.arrayBuffer());

      if (file.type === "application/pdf") {
        let base64 = "";
        const CHUNK = 8192;
        for (let i = 0; i < fileBytes.length; i += CHUNK) {
          const chunk = fileBytes.subarray(i, Math.min(i + CHUNK, fileBytes.length));
          base64 += String.fromCharCode(...chunk);
        }
        base64 = btoa(base64);

        console.log("[import-job-post] Extracting text from PDF via Claude Vision");
        const vr = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 4096,
            messages: [{
              role: "user",
              content: [
                { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
                { type: "text", text: "Extract ALL text from this job description document. Return the raw text faithfully." },
              ],
            }],
          }),
        });
        if (vr.ok) {
          const vd = await vr.json();
          rawText = vd.content?.[0]?.text || "";
        }
        await vr.body?.cancel().catch(() => {});
      } else if (file.type.includes("wordprocessingml") || file.type.includes("msword")) {
        try {
          const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
          const zip = await JSZip.loadAsync(fileBytes);
          const xml = await zip.file("word/document.xml")?.async("string");
          if (xml) {
            const matches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
            rawText = matches.map((m: string) => m.replace(/<[^>]*>/g, "")).join(" ").replace(/\s+/g, " ").trim();
          }
        } catch (e) {
          console.warn("[import-job-post] DOCX extraction failed:", e);
        }
      } else {
        rawText = new TextDecoder("utf-8").decode(fileBytes);
      }
    } else {
      const body = await req.json();
      importMethod = body.method || "url";
      sourceUrl = body.url || null;

      if (importMethod === "url" && sourceUrl) {
        try {
          const resp = await fetch(sourceUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; XIMA Job Importer)" },
          });
          if (resp.ok) {
            const html = await resp.text();
            rawText = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .substring(0, 15000);
          } else {
            await resp.body?.cancel().catch(() => {});
          }
        } catch (e) {
          console.warn("[import-job-post] URL fetch failed:", e);
        }
      } else if (importMethod === "ai_search") {
        const companyName = body.company_name;

        console.log("[import-job-post] AI search for:", companyName);
        const searchResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            tools: [{ type: "web_search_20250305", name: "web_search" }],
            messages: [{
              role: "user",
              content: `Search LinkedIn for current open job positions at "${companyName}". Find up to 10 active job listings. For each job found, extract: job title, location, employment type (full-time/part-time/contract), posting date if visible, and a brief description. Return ONLY a JSON array: [{"title": "...", "location": "...", "type": "...", "posted": "...", "description": "...", "url": "..."}]. If you cannot find jobs, return an empty array [].`,
            }],
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const textBlocks = searchData.content?.filter((b: any) => b.type === "text").map((b: any) => b.text) || [];
          const searchText = textBlocks.join("\n");

          try {
            const jsonMatch = searchText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const jobs = JSON.parse(jsonMatch[0]);
              return jsonResponse({
                success: true,
                method: "ai_search",
                jobs,
                message: `Found ${jobs.length} open positions at ${companyName}`,
              });
            }
          } catch { /* fallthrough */ }

          return jsonResponse({
            success: true,
            method: "ai_search",
            jobs: [],
            raw_search: searchText.substring(0, 2000),
            message: `Search completed for ${companyName}. Results may need manual review.`,
          });
        }
        await searchResponse.body?.cancel().catch(() => {});
        return errorResponse(502, "SEARCH_FAILED", "AI search failed. Please try again.");
      } else if (importMethod === "paste") {
        rawText = body.raw_text || "";
        console.log("[import-job-post] Paste text import, length:", rawText.length);
      }
    }

    // ── STEP 1: Structural extraction via Haiku ──
    if (!rawText || rawText.length < 50) {
      return errorResponse(400, "INSUFFICIENT_CONTENT", "Could not extract enough content from the source. Please try a different URL or file.");
    }

    console.log("[import-job-post] Step 1: Haiku structural extraction, text length:", rawText.length);

    const extractResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        system: `You are a job post parser. Extract structured job information from the provided text. Return ONLY valid JSON with this exact structure:
{
  "title": "string — the job title",
  "role_summary": "string — 2-3 sentence summary of the role",
  "description": "string — full job description (clean, no HTML)",
  "responsibilities": ["responsibility 1", "responsibility 2", ...],
  "required_skills": ["skill1", "skill2", ...],
  "nice_to_have_skills": ["skill1", "skill2", ...],
  "years_experience_min": number or null,
  "years_experience_max": number or null,
  "education_level": "string or null — e.g. 'bachelor', 'master', 'phd'",
  "languages": [{"language": "Italian", "level": "native"}, ...],
  "location_city": "string or null",
  "location_country": "string or null",
  "work_model": "remote | hybrid | onsite | null",
  "employment_type": "full-time | part-time | contract | internship",
  "seniority": "junior | mid | senior | lead | executive",
  "salary_min": number or null (ALWAYS in gross annual EUR. If net is stated, multiply by 1.4),
  "salary_max": number or null (ALWAYS in gross annual EUR. If net is stated, multiply by 1.4),
  "salary_currency": "EUR" (default EUR if not specified),
  "salary_period": "annual" (default annual),
  "salary_is_estimated": boolean (true if the original stated net and you converted, or if you estimated),
  "salary_raw_text": "string or null — the original salary text from the JD",
  "requirements": "string — qualifications and requirements summary",
  "benefits": "string or null — benefits if mentioned",
  "department": "string or null",
  "industry": "string or null",
  "company_name": "string or null — if identifiable"
}
If information is not available, use null. Extract as much as possible.
IMPORTANT: All salary values MUST be gross annual (RAL). If the JD states a net salary, multiply by 1.4 to estimate gross and set salary_is_estimated to true.`,
        messages: [{ role: "user", content: `Extract structured job information from this content:\n\n${rawText.substring(0, 10000)}` }],
      }),
    });

    if (!extractResponse.ok) {
      const errText = await extractResponse.text().catch(() => "");
      console.error("[import-job-post] Haiku extraction failed:", extractResponse.status, errText.substring(0, 300));
      return errorResponse(502, "EXTRACTION_FAILED", "Failed to extract job details. Please try again.");
    }

    const extractData = await extractResponse.json();
    const extractedText = extractData.content?.[0]?.text || "";

    let jobData: any;
    try {
      jobData = extractJsonSafe(extractedText);
    } catch {
      console.error("[import-job-post] Failed to parse Haiku JSON:", extractedText.substring(0, 500));
      return errorResponse(502, "PARSE_FAILED", "Failed to parse extracted job data. Please try again.");
    }

    console.log("[import-job-post] Haiku extraction complete:", {
      title: jobData.title,
      skills_count: jobData.required_skills?.length || 0,
      salary: `${jobData.salary_min}-${jobData.salary_max} ${jobData.salary_currency}`,
      estimated: jobData.salary_is_estimated,
    });

    // ── STEP 2: XIMAtar archetype suggestion via Sonnet ──
    const roleSummary = jobData.role_summary || jobData.description?.substring(0, 500) || jobData.title || "";
    const responsibilities = (jobData.responsibilities || []).join(", ");
    const requiredSkills = (jobData.required_skills || []).join(", ");

    console.log("[import-job-post] Step 2: Sonnet XIMAtar archetype suggestion");

    let ximatarSuggestion: { suggested_ximatar: string; reasoning: string } = {
      suggested_ximatar: "chameleon",
      reasoning: "Default fallback — archetype suggestion unavailable",
    };

    try {
      const archetypeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: `You are a behavioral profiling expert for the XIMA platform. Given a job description's role summary, responsibilities, and required skills, determine which of the 12 XIMAtar behavioral archetypes best fits the ideal candidate for this role.

The 12 archetypes and their behavioral profiles:
${XIMATAR_DESCRIPTIONS}

Analyze the role's behavioral demands — not just keywords, but the underlying competencies and work style required. Consider which pillar configuration (Drive, Computational Power, Communication, Creativity, Knowledge) the role emphasizes most.

Return ONLY valid JSON: {"suggested_ximatar": "archetype_id", "reasoning": "2-3 sentence explanation of why this archetype fits"}
The archetype_id must be one of: lion, owl, dolphin, fox, bear, bee, wolf, cat, parrot, elephant, horse, chameleon.`,
          messages: [{
            role: "user",
            content: `Role: ${jobData.title || "Unknown"}\n\nSummary: ${roleSummary}\n\nResponsibilities: ${responsibilities}\n\nRequired Skills: ${requiredSkills}`,
          }],
        }),
      });

      if (archetypeResponse.ok) {
        const archetypeData = await archetypeResponse.json();
        const archetypeText = archetypeData.content?.[0]?.text || "";
        try {
          const parsed = extractJsonSafe(archetypeText);
          if (parsed.suggested_ximatar && typeof parsed.suggested_ximatar === "string") {
            ximatarSuggestion = {
              suggested_ximatar: parsed.suggested_ximatar.toLowerCase().trim(),
              reasoning: parsed.reasoning || "",
            };
          }
        } catch (e) {
          console.warn("[import-job-post] Failed to parse Sonnet archetype response:", e);
        }
      } else {
        const errText = await archetypeResponse.text().catch(() => "");
        console.error("[import-job-post] Sonnet archetype suggestion failed:", archetypeResponse.status, errText.substring(0, 300));
      }
    } catch (e) {
      console.warn("[import-job-post] Sonnet archetype call error:", e);
    }

    console.log("[import-job-post] Archetype suggestion:", ximatarSuggestion);

    // ── Return extracted data for frontend review (no auto-persist) ──
    return jsonResponse({
      success: true,
      method: importMethod,
      source_url: sourceUrl,
      job: {
        ...jobData,
        suggested_ximatar: ximatarSuggestion.suggested_ximatar,
        ximatar_reasoning: ximatarSuggestion.reasoning,
      },
      message: "Job details extracted successfully. Review and confirm to import.",
    });
  } catch (err: any) {
    console.error("[import-job-post] Error:", err.message, err.stack);
    return errorResponse(500, "INTERNAL_ERROR", err.message || "An unexpected error occurred");
  }
});
