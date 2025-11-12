// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Define test patterns for each XIMAtar
    const testPatterns = [
      { name: "Parrot", pillars: { creativity: 9, communication: 9, computational_power: 5, knowledge: 5, drive: 5 } },
      { name: "Owl", pillars: { knowledge: 9, computational_power: 9, creativity: 5, communication: 5, drive: 5 } },
      { name: "Elephant", pillars: { drive: 9, knowledge: 9, creativity: 5, communication: 5, computational_power: 5 } },
      { name: "Dolphin", pillars: { communication: 9, knowledge: 8, creativity: 5, computational_power: 5, drive: 5 } },
      { name: "Cat", pillars: { computational_power: 9, creativity: 9, communication: 5, knowledge: 5, drive: 5 } },
      { name: "Bee", pillars: { drive: 9, computational_power: 9, creativity: 5, communication: 5, knowledge: 5 } },
      { name: "Horse", pillars: { drive: 9, creativity: 8, communication: 5, computational_power: 5, knowledge: 5 } },
      { name: "Wolf", pillars: { drive: 8.5, communication: 7.5, creativity: 5, computational_power: 5, knowledge: 5 } },
      { name: "Bear", pillars: { drive: 8.5, knowledge: 7.5, creativity: 5, communication: 5, computational_power: 5 } },
      { name: "Fox", pillars: { creativity: 9, communication: 6, computational_power: 5, knowledge: 5, drive: 5 } },
      { name: "Chameleon", pillars: { creativity: 6, communication: 6, computational_power: 6, knowledge: 6, drive: 6 } },
    ];

    const results: any[] = [];

    // Get existing auth user
    const { data: authData } = await supabase.auth.admin.listUsers();
    
    if (!authData || !authData.users || authData.users.length === 0) {
      return new Response(
        JSON.stringify({ error: "No users found in database. Please create at least one user first." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const testUserId = authData.users[0].id;
    console.log(`Using test user: ${testUserId}`);

    // Ensure a profile exists for this user (FK requirement)
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", testUserId)
      .limit(1);

    if (!profileRows || profileRows.length === 0) {
      await supabase.from("profiles").insert({
        user_id: testUserId,
        name: "XIMAtar Test User",
        profile_complete: false
      });
    }

    // Test each pattern
    for (const pattern of testPatterns) {
      console.log(`Testing pattern: ${pattern.name}`);
      
      // Create assessment result
      const { data: assessmentResult, error: resultError } = await supabase
        .from("assessment_results")
        .insert({
          user_id: testUserId,
          completed: false,
          language: "en",
        })
        .select()
        .single();

      if (resultError) {
        console.error(`Error creating result for ${pattern.name}:`, resultError);
        results.push({ pattern: pattern.name, error: resultError.message, success: false });
        continue;
      }

      // Insert pillar scores directly
      const pillarInserts = Object.entries(pattern.pillars).map(([pillar, score]) => ({
        assessment_result_id: assessmentResult.id,
        pillar,
        score,
      }));

      const { error: pillarError } = await supabase
        .from("pillar_scores")
        .insert(pillarInserts);

      if (pillarError) {
        console.error(`Error inserting pillars for ${pattern.name}:`, pillarError);
        results.push({ pattern: pattern.name, error: pillarError.message, success: false });
        continue;
      }

      // Call assign function
      const { error: assignError } = await supabase.rpc("assign_ximatar_by_pillars", {
        p_result_id: assessmentResult.id,
      });

      if (assignError) {
        console.error(`Error assigning XIMAtar for ${pattern.name}:`, assignError);
        results.push({ pattern: pattern.name, error: assignError.message, success: false });
        continue;
      }

      // Fetch result
      const { data: finalResult, error: fetchError } = await supabase
        .from("assessment_results")
        .select("*, ximatars(label, image_url)")
        .eq("id", assessmentResult.id)
        .single();

      if (fetchError) {
        console.error(`Error fetching result for ${pattern.name}:`, fetchError);
        results.push({ pattern: pattern.name, error: fetchError.message, success: false });
        continue;
      }

      results.push({
        pattern: pattern.name,
        assigned: finalResult.ximatars?.label || "unknown",
        image: finalResult.ximatars?.image_url || null,
        pillars: pattern.pillars,
        success: true,
      });

      // Cleanup test data
      await supabase.from("pillar_scores").delete().eq("assessment_result_id", assessmentResult.id);
      await supabase.from("assessment_results").delete().eq("id", assessmentResult.id);
    }

    // Summary
    const summary = {
      total: testPatterns.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      uniqueXIMatars: new Set(results.filter(r => r.success).map(r => r.assigned)).size,
      results,
    };

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Test error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
