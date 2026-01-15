import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dev-token',
};

// Valid sources per DB constraint - hard-coded for safety
const VALID_SOURCES = ['candidate', 'business', 'system'] as const;
type ValidSource = typeof VALID_SOURCES[number];

function normalizeSource(rawSource: string): ValidSource {
  const normalized = String(rawSource).toLowerCase().trim();
  if (VALID_SOURCES.includes(normalized as ValidSource)) {
    return normalized as ValidSource;
  }
  return 'system'; // fallback to system for any invalid value
}

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

    // Find 3 distinct ximatars to create a "mixed" feed
    const { data: ximatars, error: ximatarError } = await supabaseAdmin
      .from('ximatars')
      .select('id, label, image_url')
      .order('id')
      .limit(3);

    if (ximatarError || !ximatars?.length) {
      console.log('[seed-feed-items] No ximatars found, cannot seed');
      return new Response(
        JSON.stringify({ success: false, error: 'No ximatars available for seeding' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[seed-feed-items] Using ximatars:', ximatars.map(x => x.label || x.id));

    // Demo batch timestamp for identification
    const demoBatch = new Date().toISOString();
    
    // Skills to use for variety
    const skills = ['Analytical Thinking', 'Process Optimization', 'Strategic Planning', 'Team Coordination'];
    
    // Mixed sources for variety (all valid)
    const sources: ValidSource[] = ['system', 'candidate', 'business'];
    
    // Build seed items - multiple items per ximatar for a realistic mixed feed
    const seedItems: Array<{
      type: string;
      source: ValidSource;
      subject_ximatar_id: string;
      payload: Record<string, unknown>;
      visibility: { public: boolean };
    }> = [];

    ximatars.forEach((ximatar, index) => {
      // Demo metadata added to all payloads for identification
      const demoMeta = {
        demo: true,
        demo_batch: demoBatch,
        demo_label: 'Seed demo signals mixed',
      };
      
      const basePayload = {
        ximatar_name: ximatar.label || `XIMAtar ${index + 1}`,
        ximatar_image: ximatar.image_url || `/ximatars/default.png`,
        ...demoMeta,
      };

      // Use mixed valid sources, cycling through them
      const itemSource = normalizeSource(sources[index % sources.length]);

      // Each ximatar gets 2-3 different signal types
      // Ximatar 1: challenge_completed + skill_validated (source: system)
      if (index === 0) {
        seedItems.push({
          type: 'challenge_completed',
          source: itemSource,
          subject_ximatar_id: ximatar.id,
          payload: { 
            ...basePayload,
            normalized_text: 'Completed a Level 2 challenge', 
            level: 2 
          },
          visibility: { public: true }
        });
        seedItems.push({
          type: 'skill_validated',
          source: itemSource,
          subject_ximatar_id: ximatar.id,
          payload: { 
            ...basePayload,
            normalized_text: `Validated skill: ${skills[0]}`, 
            skill: skills[0],
            skill_tags: [skills[0]]
          },
          visibility: { public: true }
        });
      }
      
      // Ximatar 2: skill_validated + level_reached (source: candidate)
      if (index === 1) {
        seedItems.push({
          type: 'skill_validated',
          source: itemSource,
          subject_ximatar_id: ximatar.id,
          payload: { 
            ...basePayload,
            normalized_text: `Validated skill: ${skills[1]}`, 
            skill: skills[1],
            skill_tags: [skills[1], skills[2]]
          },
          visibility: { public: true }
        });
        seedItems.push({
          type: 'level_reached',
          source: itemSource,
          subject_ximatar_id: ximatar.id,
          payload: { 
            ...basePayload,
            normalized_text: 'Advanced to Level 3 evaluation', 
            level: 3 
          },
          visibility: { public: true }
        });
      }
      
      // Ximatar 3: challenge_completed + skill_validated (source: business)
      if (index === 2) {
        seedItems.push({
          type: 'challenge_completed',
          source: itemSource,
          subject_ximatar_id: ximatar.id,
          payload: { 
            ...basePayload,
            normalized_text: 'Completed a Level 1 challenge', 
            level: 1 
          },
          visibility: { public: true }
        });
        seedItems.push({
          type: 'skill_validated',
          source: itemSource,
          subject_ximatar_id: ximatar.id,
          payload: { 
            ...basePayload,
            normalized_text: `Validated skill: ${skills[3]}`, 
            skill: skills[3],
            skill_tags: [skills[3]]
          },
          visibility: { public: true }
        });
      }
    });

    console.log('[seed-feed-items] Inserting', seedItems.length, 'items via emit_feed_signal for', ximatars.length, 'ximatars');

    // Insert feed items using emit_feed_signal RPC for dedup + consistency
    const insertedIds: string[] = [];
    const errors: string[] = [];

    for (const item of seedItems) {
      const { data, error } = await supabaseAdmin.rpc('emit_feed_signal', {
        p_type: item.type,
        p_source: item.source,
        p_subject_ximatar_id: item.subject_ximatar_id,
        p_payload: item.payload,
        p_visibility: item.visibility,
      });

      if (error) {
        console.error('[seed-feed-items] emit_feed_signal error:', error.message);
        errors.push(`${item.type}: ${error.message}`);
      } else if (data) {
        insertedIds.push(data);
      }
    }

    if (errors.length > 0 && insertedIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: errors.join('; ') }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[seed-feed-items] Seeded items:', insertedIds.length, 'errors:', errors.length);
    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted: insertedIds.length,
        skipped_or_errors: errors.length,
        ximatars: ximatars.map(x => ({ id: x.id, label: x.label }))
      }),
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
