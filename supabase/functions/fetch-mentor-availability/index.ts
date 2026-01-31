import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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

    // Get user's profile to extract mentor info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('mentor, id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('[fetch-mentor-availability] Profile error:', profileError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          slots: [], 
          message: "Error fetching profile data" 
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mentorData = profile.mentor as Record<string, unknown> | null;
    
    if (!mentorData || !mentorData.id) {
      console.log('[fetch-mentor-availability] No mentor assigned in profile');
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

    const mentorId = mentorData.id as string;
    console.log('[fetch-mentor-availability] Mentor found:', mentorId);

    // Fetch mentor details from unified mentors table
    const { data: mentorDetails, error: mentorError } = await supabase
      .from('mentors')
      .select('id, name, profile_image_url, title, bio')
      .eq('id', mentorId)
      .maybeSingle();

    if (mentorError) {
      console.error('[fetch-mentor-availability] Mentor details error:', mentorError);
    }

    const mentorInfo = mentorDetails || {
      id: mentorId,
      name: (mentorData.name as string) || (mentorData.full_name as string) || 'Unknown',
      title: mentorData.title as string | null,
      bio: (mentorData.locale_bio as Record<string, string>)?.en || (mentorData.bio as string) || null,
      profile_image_url: (mentorData.avatar_url as string) || (mentorData.avatar_path as string) || null,
    };

    console.log('[fetch-mentor-availability] Mentor info:', mentorInfo.name);

    // Query real availability slots from mentor_availability_slots table
    // RLS policy "Candidate can read selected mentor open slots" enforces:
    // - status = 'open'
    // - mentor_id = candidate_selected_mentor_id(auth.uid())
    const now = new Date().toISOString();
    
    const { data: slotsData, error: slotsError } = await supabase
      .from('mentor_availability_slots')
      .select('id, start_time, end_time, timezone, status')
      .eq('mentor_id', mentorId)
      .eq('status', 'open')
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(100);

    if (slotsError) {
      console.error('[fetch-mentor-availability] Slots query error:', slotsError);
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
          message: "Error fetching availability slots"
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[fetch-mentor-availability] Found', slotsData?.length || 0, 'open slots');

    // Transform slots for frontend
    const formattedSlots = (slotsData || []).map(s => ({
      id: s.id,
      start_time: s.start_time,
      end_time: s.end_time,
      timezone: s.timezone || 'Europe/Rome',
      is_booked: false
    }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        slots: formattedSlots,
        mentor: {
          id: mentorId,
          name: mentorInfo.name,
          title: mentorInfo.title,
          bio: mentorInfo.bio,
          avatar_url: mentorInfo.profile_image_url
        },
        debug: {
          assignedMentorId: mentorId,
          assignedMentorName: mentorInfo.name,
          source: 'mentor_availability_slots',
          slotsFound: formattedSlots.length,
        },
        message: formattedSlots.length === 0 
          ? "Your mentor has not published availability yet" 
          : null
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal error';
    console.error('[fetch-mentor-availability] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, slots: [], message: errorMessage }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
