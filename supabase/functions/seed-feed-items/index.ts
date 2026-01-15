import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dev-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // DEV-only gate: check for dev token header
    const devToken = req.headers.get('x-dev-token');
    const expectedToken = Deno.env.get('DEV_SEED_TOKEN') || 'xima-dev-seed-2024';
    
    if (devToken !== expectedToken) {
      console.log('[seed-feed-items] Unauthorized: invalid dev token');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - DEV only' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Find a real ximatar_id to use as subject
    const { data: ximatars, error: ximatarError } = await supabaseAdmin
      .from('ximatars')
      .select('id')
      .limit(1);

    if (ximatarError || !ximatars?.length) {
      console.log('[seed-feed-items] No ximatars found, cannot seed');
      return new Response(
        JSON.stringify({ success: false, error: 'No ximatars available for seeding' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subjectXimatarId = ximatars[0].id;
    console.log('[seed-feed-items] Using ximatar:', subjectXimatarId);

    // Define seed items with clean, anonymized payloads
    const seedItems = [
      {
        type: 'challenge_completed',
        source: 'dev_seed',
        subject_ximatar_id: subjectXimatarId,
        payload: { normalized_text: 'Completed a Level 2 challenge', level: 2 },
        visibility: { public: true }
      },
      {
        type: 'skill_validated',
        source: 'dev_seed',
        subject_ximatar_id: subjectXimatarId,
        payload: { normalized_text: 'Validated skill: Process Optimization', skill: 'Process Optimization' },
        visibility: { public: true }
      },
      {
        type: 'level_reached',
        source: 'dev_seed',
        subject_ximatar_id: subjectXimatarId,
        payload: { normalized_text: 'Advanced to Level 3 evaluation', level: 3 },
        visibility: { public: true }
      }
    ];

    // Insert feed items
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('feed_items')
      .insert(seedItems)
      .select('id, type');

    if (insertError) {
      console.error('[seed-feed-items] Insert error:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[seed-feed-items] Seeded items:', inserted);
    return new Response(
      JSON.stringify({ success: true, seeded: inserted?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[seed-feed-items] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
