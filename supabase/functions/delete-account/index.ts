import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emitAuditEvent } from "../_shared/auditEvents.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * GDPR Art. 17 - Right to Erasure (Right to Deletion)
 * 
 * This edge function handles complete account deletion:
 * 1. Calls the database RPC to delete/anonymize user data
 * 2. Deletes the auth.users record via admin API
 * 3. Cleans up storage files
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.replace("Bearer ", "").trim();

    // Create client with user's auth context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    });

    // Verify authenticated user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("Authentication failed:", userError);
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const correlationId = extractCorrelationId(req);
    console.log("[delete-account] Starting deletion for user:", user.id);

    // Emit audit event BEFORE deletion (actor_id will be nullified after)
    emitAuditEvent({
      actorType: 'candidate',
      actorId: user.id,
      action: 'data_rights.deletion_requested',
      entityType: 'profile',
      entityId: user.id,
      correlationId,
    });

    // Parse confirmation from request body
    const { confirmation } = await req.json();
    if (confirmation !== "DELETE MY ACCOUNT") {
      return new Response(
        JSON.stringify({ error: "Invalid confirmation. Please type 'DELETE MY ACCOUNT' to confirm." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Call the database RPC to delete/anonymize data
    const { data: deleteResult, error: deleteError } = await userClient.rpc('delete_user_account', {
      p_user_id: user.id
    });

    if (deleteError) {
      console.error("[delete-account] RPC error:", deleteError);
      return new Response(
        JSON.stringify({ error: `Failed to delete account data: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[delete-account] Database cleanup complete:", deleteResult);

    // Step 1b: Delete from recently added tables (belt-and-suspenders — CASCADE may handle these)
    const adminClientEarly = createClient(supabaseUrl, supabaseServiceKey);

    const { error: cvCredError } = await adminClientEarly
      .from('cv_credentials')
      .delete()
      .eq('user_id', user.id);
    if (cvCredError) console.warn("[delete-account] cv_credentials cleanup:", cvCredError.message);

    const { error: cvIdentError } = await adminClientEarly
      .from('cv_identity_analysis')
      .delete()
      .eq('user_id', user.id);
    if (cvIdentError) console.warn("[delete-account] cv_identity_analysis cleanup:", cvIdentError.message);

    const { error: trajError } = await adminClientEarly
      .from('pillar_trajectory_log')
      .delete()
      .eq('user_id', user.id);
    if (trajError) console.warn("[delete-account] pillar_trajectory_log cleanup:", trajError.message);

    console.log("[delete-account] New tables cleanup complete");

    // Step 2: Delete storage files (CV uploads + challenge videos)
    try {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      
      // Delete user's CV uploads
      const { data: cvFiles } = await adminClient.storage
        .from('cv-uploads')
        .list(user.id);

      if (cvFiles && cvFiles.length > 0) {
        const cvPaths = cvFiles.map(f => `${user.id}/${f.name}`);
        await adminClient.storage.from('cv-uploads').remove(cvPaths);
        console.log("[delete-account] Deleted CV files:", cvPaths.length);
      }

      // Delete user's challenge videos (Level 3 Standing)
      // Get profile ID to find video folder
      const { data: profile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.id) {
        const { data: videoFiles } = await adminClient.storage
          .from('challenge-videos')
          .list(`standing/${profile.id}`);

        if (videoFiles && videoFiles.length > 0) {
          const videoPaths = videoFiles.map(f => `standing/${profile.id}/${f.name}`);
          await adminClient.storage.from('challenge-videos').remove(videoPaths);
          console.log("[delete-account] Deleted challenge videos:", videoPaths.length);
        }
      }
    } catch (storageError) {
      // Log but don't fail - storage cleanup is best effort
      console.error("[delete-account] Storage cleanup error:", storageError);
    }

    // Step 3: Delete auth.users record via admin API
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (authDeleteError) {
      console.error("[delete-account] Auth deletion error:", authDeleteError);
      // This is critical - if auth deletion fails, we have orphaned data
      return new Response(
        JSON.stringify({ 
          error: "Account data deleted but auth record removal failed. Please contact support.",
          partial: true,
          deletedData: deleteResult
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[delete-account] Account fully deleted for user:", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Your account and all associated data have been permanently deleted.",
        deletedTables: [...(deleteResult?.deleted_tables || []), 'cv_credentials', 'cv_identity_analysis', 'pillar_trajectory_log'],
        anonymizedTables: deleteResult?.anonymized_tables || []
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[delete-account] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
