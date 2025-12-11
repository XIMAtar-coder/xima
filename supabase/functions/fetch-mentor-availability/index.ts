import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate fake availability slots for next 7 days (09:00-18:00, 1-hour intervals, weekdays only)
function generateFakeAvailabilitySlots(): { id: string; start: string; end: string }[] {
  const slots: { id: string; start: string; end: string }[] = [];
  const now = new Date();
  const slotDuration = 60 * 60 * 1000; // 1 hour in ms

  for (let day = 1; day <= 7; day++) {
    const date = new Date(now);
    date.setDate(now.getDate() + day);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // Generate 1-hour slots from 9:00 to 18:00
    for (let hour = 9; hour < 18; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      
      const slotEnd = new Date(slotStart.getTime() + slotDuration);

      slots.push({
        id: `fake-slot-${slotStart.toISOString()}`,
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
      });
    }
  }

  return slots;
}

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

    const mentorData = profile.mentor as any;
    
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

    const mentorId = mentorData.id;
    console.log('[fetch-mentor-availability] Mentor found:', mentorId);

    // Fetch mentor details from unified mentors table
    const { data: mentorDetails, error: mentorError } = await supabase
      .from('mentors')
      .select('id, name, profile_image_url, title, bio, availability')
      .eq('id', mentorId)
      .maybeSingle();

    if (mentorError) {
      console.error('[fetch-mentor-availability] Mentor details error:', mentorError);
    }

    const mentorInfo = mentorDetails || {
      id: mentorId,
      name: mentorData.name || mentorData.full_name,
      title: mentorData.title,
      bio: mentorData.locale_bio?.en || mentorData.bio,
      profile_image_url: mentorData.avatar_url || mentorData.avatar_path,
      availability: null
    };

    console.log('[fetch-mentor-availability] Mentor info:', mentorInfo.name);

    // TEMPORARY: Google Calendar integration disabled
    // Always generate fake availability slots for all mentors
    console.log('[fetch-mentor-availability] Google Calendar DISABLED - generating fake slots');
    
    const slots = generateFakeAvailabilitySlots();
    const calendarSource = 'fake_generated';

    console.log('[fetch-mentor-availability] Generated fake slots:', slots.length);

    // Transform slots for frontend
    const formattedSlots = slots.map(s => ({
      id: s.id,
      start_time: s.start,
      end_time: s.end,
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
        calendarSource,
        debug: {
          assignedMentorId: mentorId,
          assignedMentorName: mentorInfo.name,
          source: calendarSource,
          googleCalendarDisabled: true,
          slotsGenerated: formattedSlots.length,
          slotDuration: '1 hour',
          slotRange: 'Next 7 weekdays, 09:00-18:00'
        },
        message: null
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
