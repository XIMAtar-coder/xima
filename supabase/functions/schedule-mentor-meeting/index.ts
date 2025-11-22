import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing authorization" }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace("Bearer ", "").trim();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      console.log('[schedule-mentor-meeting] Auth failed:', userError?.message);
      return new Response(
        JSON.stringify({ success: false, message: "Authentication failed" }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { slot_id, mentor_id, start_time, end_time } = body;

    if (!slot_id || !mentor_id || !start_time || !end_time) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required parameters" }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[schedule-mentor-meeting] Booking slot:', slot_id, 'for user:', user.id);

    // Verify the slot is still available and belongs to user's mentor
    const { data: slotCheck, error: slotCheckError } = await supabase
      .from('mentor_availability_slots')
      .select('is_booked, mentor_id')
      .eq('id', slot_id)
      .eq('mentor_id', mentor_id)
      .eq('is_booked', false)
      .maybeSingle();

    if (slotCheckError || !slotCheck) {
      console.error('[schedule-mentor-meeting] Slot check failed:', slotCheckError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "This slot is no longer available" 
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get mentor info
    const { data: mentor, error: mentorError } = await supabase
      .from('mentors')
      .select('name, user_id')
      .eq('id', mentor_id)
      .single();

    if (mentorError || !mentor) {
      console.error('[schedule-mentor-meeting] Mentor fetch failed:', mentorError);
      return new Response(
        JSON.stringify({ success: false, message: "Mentor not found" }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create appointment record
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        user_id: user.id,
        mentor_id: mentor_id,
        title: `Mentoring Session with ${mentor.name}`,
        description: '15-minute evaluation session',
        scheduled_at: start_time,
        duration_minutes: 15,
        status: 'scheduled'
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('[schedule-mentor-meeting] Appointment creation failed:', appointmentError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to create appointment" }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark slot as booked
    const { error: updateError } = await supabase
      .from('mentor_availability_slots')
      .update({
        is_booked: true,
        booked_by: user.id,
        booking_id: appointment.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', slot_id)
      .eq('is_booked', false); // Double-check it's still available

    if (updateError) {
      console.error('[schedule-mentor-meeting] Slot update failed:', updateError);
      // Rollback appointment
      await supabase.from('appointments').delete().eq('id', appointment.id);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to book slot. It may have just been booked by someone else." }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[schedule-mentor-meeting] Booking successful:', appointment.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        appointment: {
          id: appointment.id,
          scheduled_at: appointment.scheduled_at,
          duration_minutes: appointment.duration_minutes
        },
        message: "Meeting scheduled successfully!" 
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[schedule-mentor-meeting] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, message: err.message || 'Internal error' }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
