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

    if (contentType.includes("multipart/form-data")) {
      importMethod = "file";
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) return errorResponse(400, "INVALID_INPUT", "File required");

      const fileBytes = new Uint8Array(await file.arrayBuffer());

      if (file.type === "application/pdf") {
        const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
        if (!ANTHROPIC_API_KEY) return errorResponse(500, "CONFIG_ERROR", "API key not configured");

        let base64 = "";
        const CHUNK = 8192;
        for (let i = 0; i < fileBytes.length; i += CHUNK) {
          const chunk = fileBytes.subarray(i, Math.min(i + CHUNK, fileBytes.length));
          base64 += String.fromCharCode(...chunk);
        }
        base64 = btoa(base64);

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
          console.warn("[import-job] DOCX extraction failed:", e);
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
          console.warn("[import-job] URL fetch failed:", e);
        }
      } else if (importMethod === "ai_search") {
        const companyName = body.company_name;
        const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
        if (!ANTHROPIC_API_KEY) return errorResponse(500, "CONFIG_ERROR", "API key not configured");

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
      }
    }

    // Extract structured data from raw text
    if (!rawText || rawText.length < 50) {
      return errorResponse(400, "INSUFFICIENT_CONTENT", "Could not extract enough content from the source. Please try a different URL or file.");
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return errorResponse(500, "CONFIG_ERROR", "API key not configured");

    const extractResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: `You are a job post parser. Extract structured job information from the provided text. Return ONLY valid JSON with this structure:
{
  "title": "string — the job title",
  "description": "string — full job description (clean, no HTML)",
  "location": "string — job location or 'Remote'",
  "employment_type": "full-time | part-time | contract | internship",
  "seniority": "junior | mid | senior | lead | executive",
  "salary_range": "string or null — if mentioned",
  "required_skills": ["skill1", "skill2"],
  "requirements": "string — qualifications and requirements summary",
  "benefits": "string or null — benefits if mentioned",
  "department": "string or null",
  "industry": "string or null",
  "company_name": "string or null — if identifiable"
}
If information is not available, use null. Extract as much as possible.`,
        messages: [{ role: "user", content: `Extract structured job information from this content:\n\n${rawText.substring(0, 10000)}` }],
      }),
    });

    if (!extractResponse.ok) {
      await extractResponse.body?.cancel().catch(() => {});
      return errorResponse(502, "EXTRACTION_FAILED", "Failed to extract job details. Please try again.");
    }

    const extractData = await extractResponse.json();
    const extractedText = extractData.content?.[0]?.text || "";

    let jobData: any;
    try {
      jobData = extractJsonSafe(extractedText);
    } catch {
      return errorResponse(502, "PARSE_FAILED", "Failed to parse extracted job data. Please try again.");
    }

    return jsonResponse({
      success: true,
      method: importMethod,
      source_url: sourceUrl,
      job: jobData,
      message: "Job details extracted successfully. Review and confirm to import.",
    });
  } catch (err: any) {
    console.error("[import-job] Error:", err.message);
    return errorResponse(500, "INTERNAL_ERROR", err.message || "An unexpected error occurred");
  }
});
