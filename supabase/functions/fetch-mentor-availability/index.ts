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
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  
  // Base64URL encode
  const base64url = (data: Uint8Array | string): string => {
    const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerB64 = base64url(JSON.stringify(header));
  const claimB64 = base64url(JSON.stringify(claim));
  const signatureInput = `${headerB64}.${claimB64}`;

  // Import private key and sign
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

  // Exchange JWT for access token
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

// Fetch busy times from Google Calendar
async function getGoogleCalendarBusyTimes(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<{ start: string; end: string }[]> {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/freeBusy',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: calendarId }],
      }),
    }
  );

  const data = await response.json();
  
  if (data.error) {
    console.error('[Google Calendar] FreeBusy error:', data.error);
    return [];
  }

  return data.calendars?.[calendarId]?.busy || [];
}

// Generate 15-minute slots for the next 14 days (weekdays 9:00-18:00)
function generateAvailableSlots(busyTimes: { start: string; end: string }[]): { start: string; end: string; id: string }[] {
  const slots: { start: string; end: string; id: string }[] = [];
  const now = new Date();
  const slotDuration = 15 * 60 * 1000; // 15 minutes in ms

  for (let day = 1; day <= 14; day++) {
    const date = new Date(now);
    date.setDate(now.getDate() + day);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // Generate slots from 9:00 to 18:00
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart.getTime() + slotDuration);

        // Check if slot conflicts with busy times
        const isConflict = busyTimes.some(busy => {
          const busyStart = new Date(busy.start).getTime();
          const busyEnd = new Date(busy.end).getTime();
          const start = slotStart.getTime();
          const end = slotEnd.getTime();
          return (start < busyEnd && end > busyStart);
        });

        if (!isConflict) {
          slots.push({
            id: `slot-${slotStart.toISOString()}`,
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
          });
        }
      }
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

    // Try to get Google Calendar availability
    let slots: { id: string; start: string; end: string }[] = [];
    let calendarSource = 'database';
    let usedFallbackMentor = false;

    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    let calendarId = (mentorInfo.availability as any)?.google_calendar_id;
    let calendarMentorId = mentorId; // Track which mentor's calendar we're using

    // If assigned mentor doesn't have a Google Calendar, find a fallback mentor who does
    if (serviceAccountJson && !calendarId) {
      console.log('[fetch-mentor-availability] Assigned mentor has no Google Calendar, searching for fallback...');
      
      // Query all mentors with a google_calendar_id in their availability JSONB
      const { data: mentorsWithCalendar, error: fallbackError } = await supabase
        .from('mentors')
        .select('id, name, availability')
        .eq('is_active', true);
      
      if (!fallbackError && mentorsWithCalendar) {
        // Find first mentor with a valid google_calendar_id
        const fallbackMentor = mentorsWithCalendar.find(m => {
          const avail = m.availability as any;
          return avail?.google_calendar_id;
        });
        
        if (fallbackMentor) {
          calendarId = (fallbackMentor.availability as any).google_calendar_id;
          calendarMentorId = fallbackMentor.id;
          usedFallbackMentor = true;
          console.log('[fetch-mentor-availability] Using fallback mentor calendar:', fallbackMentor.name, calendarId);
        }
      }
    }

    if (serviceAccountJson && calendarId) {
      try {
        console.log('[fetch-mentor-availability] Fetching from Google Calendar:', calendarId);
        const serviceAccount = JSON.parse(serviceAccountJson);
        const accessToken = await getGoogleAccessToken(serviceAccount);

        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 14);

        const busyTimes = await getGoogleCalendarBusyTimes(
          accessToken,
          calendarId,
          now.toISOString(),
          futureDate.toISOString()
        );

        console.log('[fetch-mentor-availability] Busy times found:', busyTimes.length);
        
        slots = generateAvailableSlots(busyTimes);
        calendarSource = usedFallbackMentor ? 'google_calendar_fallback' : 'google_calendar';
        console.log('[fetch-mentor-availability] Generated slots from Google Calendar:', slots.length, usedFallbackMentor ? '(fallback)' : '');
      } catch (googleError: any) {
        console.error('[fetch-mentor-availability] Google Calendar error:', googleError.message);
        // Fall back to database slots
      }
    }

    // If no Google Calendar slots, try database slots for the assigned mentor
    if (slots.length === 0) {
      console.log('[fetch-mentor-availability] Falling back to database slots');
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const { data: dbSlots, error: slotsError } = await supabase
        .from('mentor_availability_slots')
        .select('id, start_time, end_time, is_booked')
        .eq('mentor_id', mentorId)
        .eq('is_booked', false)
        .gte('start_time', now.toISOString())
        .lte('start_time', futureDate.toISOString())
        .order('start_time', { ascending: true });

      if (!slotsError && dbSlots) {
        slots = dbSlots.map(s => ({
          id: s.id,
          start: s.start_time,
          end: s.end_time,
        }));
        calendarSource = 'database';
      }
    }

    console.log('[fetch-mentor-availability] Total slots:', slots.length, 'source:', calendarSource);

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
        calendarMentorId: calendarSource.includes('google_calendar') ? calendarMentorId : null,
        calendarMentorName: usedFallbackMentor ? 'Fallback Mentor' : mentorInfo.name,
        debug: {
          assignedMentorId: mentorId,
          assignedMentorName: mentorInfo.name,
          calendarMentorId: calendarMentorId,
          usedFallback: usedFallbackMentor,
          source: calendarSource
        },
        message: formattedSlots.length ? null : "No available slots at the moment"
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
