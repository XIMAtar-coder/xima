import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate JWT for Google API authentication using service account
async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  
  const base64url = (data: Uint8Array | string): string => {
    const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerB64 = base64url(JSON.stringify(header));
  const claimB64 = base64url(JSON.stringify(claim));
  const signatureInput = `${headerB64}.${claimB64}`;

  const pemContents = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = base64url(new Uint8Array(signature));
  const jwt = `${signatureInput}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    console.error('[Google Auth] Token exchange failed:', tokenData);
    throw new Error('Failed to get Google access token');
  }

  return tokenData.access_token;
}

// Create Google Calendar event
async function createGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: {
    summary: string;
    description: string;
    start: string;
    end: string;
    attendees?: { email: string }[];
  }
): Promise<{ id: string; htmlLink: string } | null> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.start, timeZone: 'Europe/Rome' },
        end: { dateTime: event.end, timeZone: 'Europe/Rome' },
        attendees: event.attendees,
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 15 }
          ]
        }
      }),
    }
  );

  const data = await response.json();
  
  if (data.error) {
    console.error('[Google Calendar] Event creation error:', data.error);
    return null;
  }

  return {
    id: data.id,
    htmlLink: data.htmlLink || data.hangoutLink || ''
  };
}

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

    if (!mentor_id || !start_time || !end_time) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required parameters" }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[schedule-mentor-meeting] Booking for user:', user.id, 'with mentor:', mentor_id);

    // Get mentor info
    const { data: mentor, error: mentorError } = await supabase
      .from('mentors')
      .select('name, user_id, availability')
      .eq('id', mentor_id)
      .single();

    if (mentorError || !mentor) {
      console.error('[schedule-mentor-meeting] Mentor fetch failed:', mentorError);
      return new Response(
        JSON.stringify({ success: false, message: "Mentor not found" }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile for email
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email, full_name, name')
      .eq('user_id', user.id)
      .maybeSingle();

    const userName = userProfile?.full_name || userProfile?.name || 'User';
    const userEmail = userProfile?.email || user.email;

    let meetingLink = '';
    let googleEventId = '';

    // Try to create Google Calendar event
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const calendarId = (mentor.availability as any)?.google_calendar_id;

    if (serviceAccountJson && calendarId) {
      try {
        console.log('[schedule-mentor-meeting] Creating Google Calendar event');
        const serviceAccount = JSON.parse(serviceAccountJson);
        const accessToken = await getGoogleAccessToken(serviceAccount);

        const calendarEvent = await createGoogleCalendarEvent(
          accessToken,
          calendarId,
          {
            summary: `XIMA Mentoring: ${userName} with ${mentor.name}`,
            description: `15-minute mentoring session booked through XIMA platform.\n\nMentee: ${userName}\nMentor: ${mentor.name}\n\nThis meeting was scheduled automatically.`,
            start: start_time,
            end: end_time,
            attendees: userEmail ? [{ email: userEmail }] : undefined
          }
        );

        if (calendarEvent) {
          meetingLink = calendarEvent.htmlLink;
          googleEventId = calendarEvent.id;
          console.log('[schedule-mentor-meeting] Google Calendar event created:', googleEventId);
        }
      } catch (googleError: any) {
        console.error('[schedule-mentor-meeting] Google Calendar error:', googleError.message);
        // Continue without Google Calendar event
      }
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
        status: 'scheduled',
        meeting_link: meetingLink || null,
        notes: googleEventId ? { google_event_id: googleEventId } : null
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

    // If slot_id exists (database slot), mark it as booked
    if (slot_id && !slot_id.startsWith('slot-')) {
      const { error: updateError } = await supabase
        .from('mentor_availability_slots')
        .update({
          is_booked: true,
          booked_by: user.id,
          booking_id: appointment.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', slot_id)
        .eq('is_booked', false);

      if (updateError) {
        console.error('[schedule-mentor-meeting] Slot update failed:', updateError);
        // Don't fail the whole operation, the appointment is still created
      }
    }

    console.log('[schedule-mentor-meeting] Booking successful:', appointment.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        appointment: {
          id: appointment.id,
          scheduled_at: appointment.scheduled_at,
          duration_minutes: appointment.duration_minutes,
          meeting_link: meetingLink
        },
        message: meetingLink 
          ? "Meeting scheduled successfully! A calendar invite has been sent."
          : "Meeting scheduled successfully!" 
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
