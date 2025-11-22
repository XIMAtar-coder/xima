import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing authorization", slots: [] }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace("Bearer ", "").trim();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      console.log('[fetch-mentor-availability] Auth failed:', userError?.message);
      return new Response(
        JSON.stringify({ success: false, message: "Authentication failed", slots: [] }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[fetch-mentor-availability] User authenticated:', user.id);

    // Get user's assigned mentor from mentor_matches
    const { data: mentorMatch, error: matchError } = await supabase
      .from('mentor_matches')
      .select(`
        mentor_user_id,
        mentors!mentor_matches_mentor_user_id_fkey(id, name, profile_image_url, title, bio)
      `)
      .eq('mentee_user_id', user.id)
      .maybeSingle();

    if (matchError) {
      console.error('[fetch-mentor-availability] Match error:', matchError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          slots: [], 
          message: "Error fetching mentor data" 
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mentorMatch) {
      console.log('[fetch-mentor-availability] No mentor assigned');
      return new Response(
        JSON.stringify({ 
          success: true, 
          slots: [], 
          mentor: null,
          message: "No mentor assigned yet. Complete your assessment to get a mentor." 
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mentorInfo = mentorMatch.mentors as any;
    const mentorId = mentorInfo?.id;

    if (!mentorId) {
      console.log('[fetch-mentor-availability] Mentor ID not found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          slots: [], 
          mentor: null,
          message: "Mentor data incomplete" 
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[fetch-mentor-availability] Mentor found:', mentorId);

    // Fetch available slots (not booked) for the next 30 days
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const { data: slots, error: slotsError } = await supabase
      .from('mentor_availability_slots')
      .select('id, start_time, end_time, is_booked')
      .eq('mentor_id', mentorId)
      .eq('is_booked', false)
      .gte('start_time', now.toISOString())
      .lte('start_time', futureDate.toISOString())
      .order('start_time', { ascending: true });

    if (slotsError) {
      console.error('[fetch-mentor-availability] Error fetching slots:', slotsError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          slots: [], 
          mentor: {
            id: mentorId,
            name: mentorInfo.name,
            title: mentorInfo.title,
            bio: mentorInfo.bio,
            avatar_url: mentorInfo.profile_image_url
          },
          message: "No availability slots found" 
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[fetch-mentor-availability] Found slots:', slots?.length || 0);

    return new Response(
      JSON.stringify({ 
        success: true, 
        slots: slots || [],
        mentor: {
          id: mentorId,
          name: mentorInfo.name,
          title: mentorInfo.title,
          bio: mentorInfo.bio,
          avatar_url: mentorInfo.profile_image_url
        },
        message: slots?.length ? null : "No available slots at the moment"
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[fetch-mentor-availability] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, slots: [], message: err.message || 'Internal error' }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
