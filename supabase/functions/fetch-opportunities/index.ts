import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeadersFor } from "../_shared/errors.ts";


/**
 * @deprecated Use recommend-jobs instead. This function is scheduled for removal.
 */
serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.warn("[DEPRECATED] fetch-opportunities is deprecated. Use recommend-jobs instead.");

  return new Response(
    JSON.stringify({
      deprecated: true,
      message: "This endpoint is deprecated. Please use the recommend-jobs endpoint instead.",
      migration_guide: "Update your frontend to call the recommend-jobs edge function.",
      opportunities: [],
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
