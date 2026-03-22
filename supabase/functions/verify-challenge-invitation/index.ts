import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { emitAuditEvent } from "../_shared/auditEvents.ts";
import { extractCorrelationId } from "../_shared/correlationId.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting (per IP, max 10 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";

    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      console.warn(`[verify-challenge-invitation] Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Too many requests", message: "Please try again later" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const correlationId = extractCorrelationId(req);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for token
    const body = await req.json().catch(() => ({}));
    const { token } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Bad request", message: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      console.warn(`[verify-challenge-invitation] Invalid token format: ${token.substring(0, 8)}...`);
      return new Response(
        JSON.stringify({ error: "Invalid token", message: "Token format is invalid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[verify-challenge-invitation] Looking up token: ${token.substring(0, 8)}...`);

    // Fetch invitation by token - only return necessary fields
    const { data: invitation, error: invError } = await supabase
      .from("challenge_invitations")
      .select("id, status, created_at, business_id, hiring_goal_id, challenge_id")
      .eq("invite_token", token)
      .maybeSingle();

    if (invError) {
      console.error("[verify-challenge-invitation] Database error:", invError);
      return new Response(
        JSON.stringify({ error: "Server error", message: "Failed to verify invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!invitation) {
      console.log(`[verify-challenge-invitation] No invitation found for token: ${token.substring(0, 8)}...`);
      return new Response(
        JSON.stringify({ error: "Not found", message: "Invitation not found or expired" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[verify-challenge-invitation] Found invitation: ${invitation.id}`);

    // Fetch related company, goal, and challenge details
    const [businessResult, goalResult, challengeResult] = await Promise.all([
      supabase
        .from("business_profiles")
        .select("company_name")
        .eq("user_id", invitation.business_id)
        .maybeSingle(),
      supabase
        .from("hiring_goal_drafts")
        .select("role_title, task_description")
        .eq("id", invitation.hiring_goal_id)
        .maybeSingle(),
      invitation.challenge_id
        ? supabase
            .from("business_challenges")
            .select("title, start_at, end_at, status")
            .eq("id", invitation.challenge_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // Build response with only necessary data
    const response = {
      invitation: {
        id: invitation.id,
        status: invitation.status,
        created_at: invitation.created_at,
        company_name: businessResult.data?.company_name || "Company",
        role_title: goalResult.data?.role_title || null,
        task_description: goalResult.data?.task_description || null,
        challenge_title: challengeResult.data?.title || null,
        challenge_start_at: challengeResult.data?.start_at || null,
        challenge_end_at: challengeResult.data?.end_at || null,
        challenge_status: challengeResult.data?.status || null,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[verify-challenge-invitation] Error:", error);
    return new Response(
      JSON.stringify({ error: "Server error", message: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
