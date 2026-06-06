// Temporary dev harness — calls generate-challenge with service-role bypass
// to materialize config_json.l2_simulation for a specific challenge.
// Safe to delete after one-off use.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const payload = {
    mode: 'xima_core',
    business_id: '6217364b-2c69-4bf1-a746-802dd7153628',
    hiring_goal_id: 'eab2f3b2-fd0a-4bc5-9ef4-ceab67cdbbf3',
    challenge_id: '34abbebd-b221-40d8-b174-0f45869b995c',
    level: 2,
    force_regenerate: true,
  };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-challenge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'x-internal-admin': '1',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  return new Response(JSON.stringify({ status: res.status, body: tryJson(text) }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});

function tryJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}
