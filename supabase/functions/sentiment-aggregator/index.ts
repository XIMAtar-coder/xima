import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * @deprecated This function returned hardcoded stub data and has no production use.
 * Company sentiment is now derived from generate-company-profile analysis.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.warn("[DEPRECATED] sentiment-aggregator is deprecated. Company sentiment is now part of generate-company-profile.");

  return new Response(
    JSON.stringify({
      deprecated: true,
      message: "This endpoint is deprecated. Company sentiment data is now part of the company profile.",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
