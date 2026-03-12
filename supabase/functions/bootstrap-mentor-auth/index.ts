import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Bootstrap function to create/configure mentor auth users.
 * This function is meant for initial setup only.
 * 
 * Security: Uses service role key for admin operations.
 * Access: Restricted to internal service calls (no user auth required for bootstrap).
 */

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

    // --- Authentication: require admin secret, service-role key, or admin JWT ---
    const adminSecretHeader = req.headers.get("x-admin-secret");
    const authHeader = req.headers.get("authorization");
    const apiKeyHeader = req.headers.get("apikey");

    let isAuthorized = false;

    // Option 1: Admin secret header
    if (adminSecret && adminSecretHeader === adminSecret) {
      isAuthorized = true;
    }

    // Option 2: Service-role key (internal/server-side call)
    if (!isAuthorized && apiKeyHeader === serviceRoleKey) {
      isAuthorized = true;
    }

    // Option 3: JWT + admin role check
    if (!isAuthorized && authHeader) {
      const verifyClient = createClient(supabaseUrl, serviceRoleKey);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await verifyClient.auth.getUser(token);

      if (!authError && user) {
        const { data: roleRows } = await verifyClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin");

        if (roleRows && roleRows.length > 0) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: admin credentials required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password } = await req.json();

    // Validate inputs
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Restrict to specific mentor emails for safety
    const allowedEmails = [
      "roberta.fazz@gmail.com",
      "daniel.cracau@gmail.com",
      "cozzi.pietro94@gmail.com"
    ];

    if (!allowedEmails.includes(email.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: "Email not in allowed mentor list" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        JSON.stringify({ error: "Failed to check existing users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    let userId: string;
    let action: string;

    if (!existingUser) {
      // Create the user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: `Failed to create user: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user!.id;
      action = "created";
    } else {
      // Update password and confirm email
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        existingUser.id,
        { password: password, email_confirm: true }
      );

      if (updateError) {
        console.error("Error updating user:", updateError);
        return new Response(
          JSON.stringify({ error: `Failed to update user: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = existingUser.id;
      action = "updated";
    }

    // Link to mentor record - find by matching part of email before @
    const emailPrefix = email.split("@")[0].toLowerCase();
    
    // Try to find and update the mentor record
    const { data: mentorData, error: mentorError } = await adminClient
      .from("mentors")
      .update({ 
        user_id: userId, 
        is_active: true,
        updated_at: new Date().toISOString() 
      })
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .ilike("name", `%${emailPrefix.split(".")[0]}%`)
      .select("id, name, is_active");

    if (mentorError) {
      console.error("Error linking mentor:", mentorError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        action: action,
        user_id: userId,
        mentor: mentorData?.[0] || null,
        message: mentorData?.[0] 
          ? `Auth user ${action} and linked to mentor: ${mentorData[0].name}`
          : `Auth user ${action} but no matching mentor found to link`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
