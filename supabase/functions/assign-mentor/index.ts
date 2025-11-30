import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssignMentorRequest {
  professional_id: string; // ID from professionals table
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[assign-mentor] Request started');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[assign-mentor] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[assign-mentor] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[assign-mentor] Authenticated user:', user.id);

    // Parse request body
    const { professional_id } = await req.json() as AssignMentorRequest;
    if (!professional_id) {
      console.error('[assign-mentor] Missing professional_id');
      return new Response(
        JSON.stringify({ error: 'professional_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[assign-mentor] Assigning professional:', professional_id);

    // Create admin client for system operations (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user's profile ID (using user client for security)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[assign-mentor] Profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[assign-mentor] User profile ID:', profile.id);

    // Verify professional exists (using admin client)
    const { data: professional, error: professionalError } = await supabaseAdmin
      .from('professionals')
      .select('id, user_id, full_name, title, avatar_path, calendar_url, locale_bio, specialties, xima_pillars')
      .eq('id', professional_id)
      .single();

    if (professionalError || !professional) {
      console.error('[assign-mentor] Professional not found:', professionalError);
      return new Response(
        JSON.stringify({ error: 'Professional not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[assign-mentor] Found professional:', professional.full_name);

    // Use professional.id as mentor_user_id (since professionals.user_id may be null)
    const mentorUserId = professional.id;

    // Check if mentor match already exists
    const { data: existingMatch } = await supabaseAdmin
      .from('mentor_matches')
      .select('id')
      .eq('mentee_user_id', profile.id)
      .maybeSingle();

    if (existingMatch) {
      console.log('[assign-mentor] Updating existing mentor match:', existingMatch.id);
      // Update existing match using admin client
      const { error: updateError } = await supabaseAdmin
        .from('mentor_matches')
        .update({
          mentor_user_id: mentorUserId,
          reason: {
            professional_name: professional.full_name,
            professional_id: professional.id,
            specialties: professional.specialties,
            xima_pillars: professional.xima_pillars,
            assigned_at: new Date().toISOString(),
          },
        })
        .eq('id', existingMatch.id);

      if (updateError) {
        console.error('[assign-mentor] Error updating mentor match:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update mentor assignment', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('[assign-mentor] Creating new mentor match');
      // Create new match using admin client
      const { error: insertError } = await supabaseAdmin
        .from('mentor_matches')
        .insert({
          mentee_user_id: profile.id,
          mentor_user_id: mentorUserId,
          assigned_by: 'user_selection',
          reason: {
            professional_name: professional.full_name,
            professional_id: professional.id,
            specialties: professional.specialties,
            xima_pillars: professional.xima_pillars,
            assigned_at: new Date().toISOString(),
          },
        });

      if (insertError) {
        console.error('[assign-mentor] Error creating mentor match:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create mentor assignment', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update profile's mentor field with professional data (using admin client)
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        mentor: {
          id: professional.id,
          name: professional.full_name,
          title: professional.title,
          avatar_url: professional.avatar_path,
          calendar_url: professional.calendar_url,
          locale_bio: professional.locale_bio,
          specialties: professional.specialties,
          xima_pillars: professional.xima_pillars,
        },
      })
      .eq('id', profile.id);

    if (profileUpdateError) {
      console.error('[assign-mentor] Error updating profile:', profileUpdateError);
      // Not critical, continue
    }

    console.log('[assign-mentor] Successfully assigned mentor:', professional.full_name);

    return new Response(
      JSON.stringify({
        success: true,
        mentor: {
          id: professional.id,
          name: professional.full_name,
          title: professional.title,
          avatar_url: professional.avatar_path,
          calendar_url: professional.calendar_url,
          specialties: professional.specialties,
          xima_pillars: professional.xima_pillars,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[assign-mentor] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
