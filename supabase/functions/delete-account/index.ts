import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log("[delete-account] Starting deletion for user:", user.id);

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

    // Step 2: Delete storage files (CV uploads)
    try {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      
      // List and delete user's CV uploads
      const { data: files } = await adminClient.storage
        .from('cv-uploads')
        .list(user.id);

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${user.id}/${f.name}`);
        await adminClient.storage.from('cv-uploads').remove(filePaths);
        console.log("[delete-account] Deleted storage files:", filePaths.length);
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
        deletedTables: deleteResult?.deleted_tables || [],
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
