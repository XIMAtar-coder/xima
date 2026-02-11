import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Checks whether the authenticated user's email is verified and account is active.
 * Returns { verified: true, userId } on success, or { verified: false, code, message } on failure.
 */
export async function checkEmailVerified(
  authHeader: string | null
): Promise<
  | { verified: true; userId: string }
  | { verified: false; code: string; message: string }
> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { verified: false, code: "UNAUTHORIZED", message: "Missing auth token" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { verified: false, code: "UNAUTHORIZED", message: "Invalid auth token" };
  }

  if (!user.email_confirmed_at) {
    return { verified: false, code: "EMAIL_NOT_VERIFIED", message: "Email not verified" };
  }

  // Check profile account_status
  const serviceClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("account_status")
    .eq("user_id", user.id)
    .single();

  if (profile?.account_status === "suspended") {
    return { verified: false, code: "ACCOUNT_SUSPENDED", message: "Account suspended" };
  }

  return { verified: true, userId: user.id };
}

/** Returns a 403 Response for unverified users */
export function unverifiedResponse(
  code: string,
  message: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error: code, message }),
    {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
