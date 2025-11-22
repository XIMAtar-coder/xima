import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch public job opportunities
    const { data: opportunities, error } = await supabase
      .from("opportunities")
      .select("id, title, company, description, location, skills, source_url, created_at, is_public")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Database error:", error);
      throw new Error(`Failed to fetch opportunities: ${error.message}`);
    }

    console.log(`Fetched ${opportunities?.length || 0} opportunities`);

    return new Response(
      JSON.stringify({
        success: true,
        opportunities: opportunities || [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in fetch-opportunities function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
