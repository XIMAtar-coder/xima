import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminSecret = Deno.env.get("ADMIN_SECRET");

    // Auth check: admin secret header, OR authenticated admin user, OR internal service call
    const adminSecretHeader = req.headers.get("x-admin-secret");
    const authHeader = req.headers.get("authorization");
    const apiKeyHeader = req.headers.get("apikey");

    let isAuthorized = false;

    // Check admin secret
    if (adminSecret && adminSecretHeader === adminSecret) {
      isAuthorized = true;
    }

    // Check if this is a service-role call (internal/admin)
    // Service role key in apikey header indicates server-side call
    if (!isAuthorized && apiKeyHeader === serviceRoleKey) {
      isAuthorized = true;
    }

    // Check JWT + admin role
    if (!isAuthorized && authHeader) {
      const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (!authError && user) {
        // Check if user has admin role
        const { data: roleData } = await supabaseClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        
        if (roleData) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, new_password, create_if_missing } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!new_password || typeof new_password !== "string" || new_password.length < 8) {
      return new Response(
        JSON.stringify({ error: "new_password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if user exists
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(
        JSON.stringify({ error: "Failed to list users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!existingUser) {
      if (create_if_missing) {
        // Create the user with the specified password
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: email,
          password: new_password,
          email_confirm: true,
        });

        if (createError) {
          console.error("Error creating user:", createError);
          return new Response(
            JSON.stringify({ error: `Failed to create user: ${createError.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Link to mentor by email pattern match
        const { data: mentorData, error: linkError } = await adminClient
          .from("mentors")
          .update({ user_id: newUser.user!.id, updated_at: new Date().toISOString() })
          .ilike("name", "%roberta%")
          .is("user_id", null)
          .select("id, name");

        return new Response(
          JSON.stringify({ 
            success: true, 
            action: "created",
            user_id: newUser.user!.id,
            mentor_linked: mentorData && mentorData.length > 0,
            mentor: mentorData?.[0] || null
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: "User not found. Set create_if_missing=true to create." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // User exists - update password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      existingUser.id,
      { password: new_password, email_confirm: true }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: `Failed to update password: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also ensure mentor is linked if not already
    const { data: mentorData, error: linkError } = await adminClient
      .from("mentors")
      .update({ user_id: existingUser.id, updated_at: new Date().toISOString() })
      .ilike("name", "%roberta%")
      .is("user_id", null)
      .select("id, name");

    return new Response(
      JSON.stringify({ 
        success: true, 
        action: "password_updated",
        user_id: existingUser.id,
        mentor_linked: mentorData && mentorData.length > 0,
        mentor: mentorData?.[0] || null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
