import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header missing" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's token - RLS will be enforced
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const userEmail = user.email;

    console.log(`[data-export] Starting export for user: ${userId}`);

    // 2. Fetch all personal data (RLS enforced on each query)
    
    // Profile data
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId);

    if (profileError) {
      console.error("[data-export] Profile fetch error:", profileError);
    }

    const profileId = profileData?.[0]?.id;

    // Assessment results (includes ximatar assignment)
    const { data: assessmentResults, error: assessmentResultsError } = await supabase
      .from("assessment_results")
      .select("*")
      .eq("user_id", userId);

    if (assessmentResultsError) {
      console.error("[data-export] Assessment results error:", assessmentResultsError);
    }

    // Assessment answers
    const { data: assessmentAnswers, error: assessmentAnswersError } = await supabase
      .from("assessment_answers")
      .select("*")
      .in("result_id", assessmentResults?.map(r => r.id) || []);

    if (assessmentAnswersError) {
      console.error("[data-export] Assessment answers error:", assessmentAnswersError);
    }

    // Open responses
    const { data: openResponses, error: openResponsesError } = await supabase
      .from("assessment_open_responses")
      .select("*")
      .eq("user_id", userId);

    if (openResponsesError) {
      console.error("[data-export] Open responses error:", openResponsesError);
    }

    // CV analysis
    const { data: cvAnalysis, error: cvAnalysisError } = await supabase
      .from("assessment_cv_analysis")
      .select("*")
      .eq("user_id", userId);

    if (cvAnalysisError) {
      console.error("[data-export] CV analysis error:", cvAnalysisError);
    }

    // Assessments
    const { data: assessments, error: assessmentsError } = await supabase
      .from("assessments")
      .select("*")
      .eq("user_id", userId);

    if (assessmentsError) {
      console.error("[data-export] Assessments error:", assessmentsError);
    }

    // XIMAtar data - get ximatar_ids from assessment_results
    const ximatarIds = assessmentResults?.map(r => r.ximatar_id).filter(Boolean) || [];
    const { data: ximatarData, error: ximatarError } = await supabase
      .from("ximatars")
      .select("id, label, animal, description, pillar_weights")
      .in("id", ximatarIds);

    if (ximatarError) {
      console.error("[data-export] XIMAtar error:", ximatarError);
    }

    // Feed items referencing user's ximatar
    const { data: feedItems, error: feedItemsError } = await supabase
      .from("feed_items")
      .select("*")
      .in("subject_ximatar_id", ximatarIds);

    if (feedItemsError) {
      console.error("[data-export] Feed items error:", feedItemsError);
    }

    // Challenge invitations (if candidate has profile)
    let challengeInvitations = null;
    let challengeSubmissions = null;
    let eligibilityRecords = null;

    if (profileId) {
      const { data: invitations, error: invitationsError } = await supabase
        .from("challenge_invitations")
        .select("*")
        .eq("candidate_profile_id", profileId);

      if (invitationsError) {
        console.error("[data-export] Invitations error:", invitationsError);
      }
      challengeInvitations = invitations;

      const { data: submissions, error: submissionsError } = await supabase
        .from("challenge_submissions")
        .select("*")
        .eq("candidate_profile_id", profileId);

      if (submissionsError) {
        console.error("[data-export] Submissions error:", submissionsError);
      }
      challengeSubmissions = submissions;

      const { data: eligibility, error: eligibilityError } = await supabase
        .from("candidate_eligibility")
        .select("*")
        .eq("candidate_profile_id", profileId);

      if (eligibilityError) {
        console.error("[data-export] Eligibility error:", eligibilityError);
      }
      eligibilityRecords = eligibility;
    }

    // Chat threads and messages
    const { data: chatParticipants, error: chatParticipantsError } = await supabase
      .from("chat_participants")
      .select("thread_id")
      .eq("user_id", profileId || "");

    if (chatParticipantsError) {
      console.error("[data-export] Chat participants error:", chatParticipantsError);
    }

    const threadIds = chatParticipants?.map(p => p.thread_id) || [];
    
    let chatMessages = null;
    if (threadIds.length > 0) {
      const { data: messages, error: messagesError } = await supabase
        .from("chat_messages")
        .select("*")
        .in("thread_id", threadIds);

      if (messagesError) {
        console.error("[data-export] Messages error:", messagesError);
      }
      chatMessages = messages;
    }

    // AI conversations
    const { data: aiConversations, error: aiConversationsError } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", userId);

    if (aiConversationsError) {
      console.error("[data-export] AI conversations error:", aiConversationsError);
    }

    const conversationIds = aiConversations?.map(c => c.id) || [];
    
    let aiMessages = null;
    if (conversationIds.length > 0) {
      const { data: messages, error: aiMessagesError } = await supabase
        .from("ai_messages")
        .select("*")
        .in("conversation_id", conversationIds);

      if (aiMessagesError) {
        console.error("[data-export] AI messages error:", aiMessagesError);
      }
      aiMessages = messages;
    }

    // Activity logs
    const { data: activityLogs, error: activityLogsError } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId);

    if (activityLogsError) {
      console.error("[data-export] Activity logs error:", activityLogsError);
    }

    // Bot events
    const { data: botEvents, error: botEventsError } = await supabase
      .from("bot_events")
      .select("*")
      .eq("user_id", profileId || "");

    if (botEventsError) {
      console.error("[data-export] Bot events error:", botEventsError);
    }

    // Notifications
    const { data: notifications, error: notificationsError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId);

    // Notifications table may not exist, ignore error
    if (notificationsError && notificationsError.code !== "42P01") {
      console.error("[data-export] Notifications error:", notificationsError);
    }

    // 3. Compile export data
    const exportData = {
      export_metadata: {
        generated_at: new Date().toISOString(),
        user_id: userId,
        user_email: userEmail,
        export_version: "1.0",
        tables_included: [
          "profiles",
          "assessment_results",
          "assessment_answers",
          "assessment_open_responses",
          "assessment_cv_analysis",
          "assessments",
          "ximatars",
          "feed_items",
          "challenge_invitations",
          "challenge_submissions",
          "candidate_eligibility",
          "chat_messages",
          "ai_conversations",
          "ai_messages",
          "activity_logs",
          "bot_events",
        ],
      },
      tables: {
        profiles: {
          description: "User profile and account information",
          record_count: profileData?.length || 0,
          data: profileData || [],
        },
        assessment_results: {
          description: "XIMAtar assignments and pillar scores",
          record_count: assessmentResults?.length || 0,
          data: assessmentResults || [],
        },
        assessment_answers: {
          description: "Individual assessment question answers",
          record_count: assessmentAnswers?.length || 0,
          data: assessmentAnswers || [],
        },
        assessment_open_responses: {
          description: "Open-ended assessment responses with AI scoring",
          record_count: openResponses?.length || 0,
          data: openResponses || [],
        },
        assessment_cv_analysis: {
          description: "CV/resume analysis results (AI-generated)",
          record_count: cvAnalysis?.length || 0,
          data: cvAnalysis || [],
        },
        assessments: {
          description: "Completed assessment records",
          record_count: assessments?.length || 0,
          data: assessments || [],
        },
        ximatars: {
          description: "XIMAtar profile assignments",
          record_count: ximatarData?.length || 0,
          data: ximatarData || [],
        },
        feed_items: {
          description: "Activity feed items referencing your XIMAtar",
          record_count: feedItems?.length || 0,
          data: feedItems || [],
        },
        challenge_invitations: {
          description: "Challenge invitations received",
          record_count: challengeInvitations?.length || 0,
          data: challengeInvitations || [],
        },
        challenge_submissions: {
          description: "Challenge submission responses and signals",
          record_count: challengeSubmissions?.length || 0,
          data: challengeSubmissions || [],
        },
        candidate_eligibility: {
          description: "Eligibility verification records",
          record_count: eligibilityRecords?.length || 0,
          data: eligibilityRecords || [],
        },
        chat_messages: {
          description: "Chat messages in threads you participate in",
          record_count: chatMessages?.length || 0,
          data: chatMessages || [],
        },
        ai_conversations: {
          description: "XimAI assistant conversation sessions",
          record_count: aiConversations?.length || 0,
          data: aiConversations || [],
        },
        ai_messages: {
          description: "XimAI assistant messages",
          record_count: aiMessages?.length || 0,
          data: aiMessages || [],
        },
        activity_logs: {
          description: "User activity logs",
          record_count: activityLogs?.length || 0,
          data: activityLogs || [],
        },
        bot_events: {
          description: "Bot interaction events",
          record_count: botEvents?.length || 0,
          data: botEvents || [],
        },
      },
    };

    console.log(`[data-export] Export completed for user: ${userId}`);

    // 4. Return as JSON download
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="xima-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });

  } catch (error) {
    console.error("[data-export] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
