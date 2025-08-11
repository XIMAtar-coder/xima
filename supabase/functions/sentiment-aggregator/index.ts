// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company } = await req.json();

    // Placeholder logic: return canned data for known companies
    const samples: Record<string, any> = {
      "Aurora Insights": {
        overallScore: 0.78,
        pros: ["Strong learning culture", "Supportive team"],
        cons: ["Fast-paced environment"],
        highlights: [
          { text: "Great mentorship opportunities", source: "Glassdoor", timestamp: new Date().toISOString() },
          { text: "Innovative analytics projects", source: "LinkedIn", timestamp: new Date().toISOString() }
        ]
      },
      "NovaTech": {
        overallScore: 0.71,
        pros: ["Flexible hours", "Remote-friendly"],
        cons: ["Ambitious deadlines"],
        highlights: [
          { text: "Collaborative teams across EU", source: "Community", timestamp: new Date().toISOString() }
        ]
      }
    };

    const payload = samples[company as string] ?? {};

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
