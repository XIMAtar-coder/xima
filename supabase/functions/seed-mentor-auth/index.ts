import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MentorSeed {
  email: string;
  password: string;
  mentorId: string;
}

// Mentor seed records. Both the {email -> mentorId} mapping and the
// {email -> password} mapping MUST be supplied at runtime via secrets:
//   MENTOR_SEED_TARGETS:   { "<email>": "<mentorId>", ... }
//   MENTOR_SEED_PASSWORDS: { "<email>": "<password>", ... }
// Never commit credentials or PII to source.

function loadMentorSeeds(): { seeds: MentorSeed[]; error: string | null } {
  const rawTargets = Deno.env.get('MENTOR_SEED_TARGETS');
  if (!rawTargets) {
    return { seeds: [], error: 'MENTOR_SEED_TARGETS secret is not configured' };
  }
  let targetMap: Record<string, string>;
  try {
    targetMap = JSON.parse(rawTargets);
  } catch {
    return { seeds: [], error: 'MENTOR_SEED_TARGETS is not valid JSON' };
  }
  const targets: Array<Omit<MentorSeed, 'password'>> = Object.entries(targetMap)
    .filter(([email, mentorId]) => typeof email === 'string' && typeof mentorId === 'string')
    .map(([email, mentorId]) => ({ email: email.toLowerCase(), mentorId }));
  if (targets.length === 0) {
    return { seeds: [], error: 'MENTOR_SEED_TARGETS contains no entries' };
  }

  const rawPw = Deno.env.get('MENTOR_SEED_PASSWORDS');
  if (!rawPw) {
    return { seeds: [], error: 'MENTOR_SEED_PASSWORDS secret is not configured' };
  }
  let pwMap: Record<string, string>;
  try {
    pwMap = JSON.parse(rawPw);
  } catch {
    return { seeds: [], error: 'MENTOR_SEED_PASSWORDS is not valid JSON' };
  }
  const seeds: MentorSeed[] = [];
  for (const target of targets) {
    const pw = pwMap[target.email];
    if (!pw || typeof pw !== 'string' || pw.length < 12) {
      return { seeds: [], error: 'Missing/weak password for one or more mentors' };
    }
    seeds.push({ ...target, password: pw });
  }
  return { seeds, error: null };
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify caller is admin/founder
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user: caller }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller has admin role (simple check - adjust as needed)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { seeds: MENTORS_TO_SEED, error: seedError } = loadMentorSeeds();
    if (seedError) {
      return new Response(
        JSON.stringify({ error: seedError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: { email: string; status: string; userId?: string; error?: string }[] = [];

    for (const mentor of MENTORS_TO_SEED) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === mentor.email);

        let userId: string;

        if (existingUser) {
          // User exists, use their ID
          userId = existingUser.id;
          results.push({
            email: mentor.email,
            status: 'already_exists',
            userId,
          });
        } else {
          // Create new user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: mentor.email,
            password: mentor.password,
            email_confirm: true,
            user_metadata: {
              role: 'mentor',
            },
          });

          if (createError) {
            results.push({
              email: mentor.email,
              status: 'error',
              error: createError.message,
            });
            continue;
          }

          userId = newUser.user.id;
          results.push({
            email: mentor.email,
            status: 'created',
            userId,
          });
        }

        // Link mentor record to auth user
        const { error: updateError } = await supabaseAdmin
          .from('mentors')
          .update({ user_id: userId, updated_at: new Date().toISOString() })
          .eq('id', mentor.mentorId);

        if (updateError) {
          results.push({
            email: mentor.email,
            status: 'link_error',
            userId,
            error: updateError.message,
          });
        }

      } catch (err) {
        results.push({
          email: mentor.email,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Seed mentor auth error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
