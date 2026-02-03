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

const MENTORS_TO_SEED: MentorSeed[] = [
  {
    email: 'roberta.fazz@gmail.com',
    password: 'XimaMentor2026',
    mentorId: '928dbd7d-1d4f-4abd-b069-d6bb18fd725e',
  },
  {
    email: 'cozzi.pietro94@gmail.com',
    password: 'XimaMentor2026',
    mentorId: '8f879039-36cb-4367-8064-49ba9a9fdbf2',
  },
];

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
