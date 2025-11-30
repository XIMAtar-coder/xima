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

    // Get user's profile ID
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

    // Verify professional exists
    const { data: professional, error: professionalError } = await supabase
      .from('professionals')
      .select('id, user_id, full_name, title, bio, avatar_path, calendar_url, specialties, xima_pillars')
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

    // Get or create mentor's profile ID
    let mentorProfileId = professional.user_id;

    if (!mentorProfileId) {
      console.log('[assign-mentor] Professional has no user_id, using professional.id as reference');
      // For professionals without user_id, we'll use the professional.id directly
      mentorProfileId = professional.id;
    }

    // Check if mentor match already exists
    const { data: existingMatch } = await supabase
      .from('mentor_matches')
      .select('id')
      .eq('mentee_user_id', profile.id)
      .single();

    if (existingMatch) {
      console.log('[assign-mentor] Updating existing mentor match:', existingMatch.id);
      // Update existing match
      const { error: updateError } = await supabase
        .from('mentor_matches')
        .update({
          mentor_user_id: mentorProfileId,
          reason: {
            professional_name: professional.full_name,
            specialties: professional.specialties,
            xima_pillars: professional.xima_pillars,
            assigned_at: new Date().toISOString(),
          },
        })
        .eq('id', existingMatch.id);

      if (updateError) {
        console.error('[assign-mentor] Error updating mentor match:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update mentor assignment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('[assign-mentor] Creating new mentor match');
      // Create new match
      const { error: insertError } = await supabase
        .from('mentor_matches')
        .insert({
          mentee_user_id: profile.id,
          mentor_user_id: mentorProfileId,
          assigned_by: 'user_selection',
          reason: {
            professional_name: professional.full_name,
            specialties: professional.specialties,
            xima_pillars: professional.xima_pillars,
            assigned_at: new Date().toISOString(),
          },
        });

      if (insertError) {
        console.error('[assign-mentor] Error creating mentor match:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create mentor assignment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update profile's mentor field with professional data
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        mentor: {
          name: professional.full_name,
          title: professional.title,
          avatar_url: professional.avatar_path,
          calendar_url: professional.calendar_url,
          bio: professional.bio,
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
