import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

/**
 * The video room of a mentor session, on Daily.
 *
 * meet.jit.si now refuses to start a room until someone signs in on their
 * side as moderator, so the embedded room never opened. Daily gives a
 * private room per session and a token per participant: nobody gets in
 * without one, and the mentor's token makes them the owner. The API key
 * stays here; the browser only ever sees its own token.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_API = 'https://api.daily.co/v1';
const OPEN_BEFORE_MIN = 10;
const MIN_ROOM_MINUTES = 60; // the room stays usable for at least an hour from the start
const GRACE_AFTER_END_MIN = 30;

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ success: false, error: 'UNAUTHENTICATED' });

    const { session_id } = await req.json().catch(() => ({ session_id: null }));
    if (!session_id || typeof session_id !== 'string') return json({ success: false, error: 'SESSION_REQUIRED' });

    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ success: false, error: 'UNAUTHENTICATED' });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: session } = await admin
      .from('mentor_sessions')
      .select('id, mentor_id, candidate_profile_id, starts_at, ends_at, status, video_provider, video_room_name, video_room_url')
      .eq('id', session_id)
      .maybeSingle();
    if (!session) return json({ success: false, error: 'SESSION_NOT_FOUND' });

    const [{ data: mentor }, { data: profile }] = await Promise.all([
      admin.from('mentors').select('id, user_id, name').eq('id', session.mentor_id).maybeSingle(),
      admin.from('profiles').select('id, user_id, full_name, name, first_name').eq('id', session.candidate_profile_id).maybeSingle(),
    ]);
    const isMentor = !!mentor && mentor.user_id === user.id;
    const isCandidate = !!profile && profile.user_id === user.id;
    if (!isMentor && !isCandidate) return json({ success: false, error: 'NOT_A_PARTICIPANT' });
    if (session.status !== 'confirmed') return json({ success: false, error: 'NOT_CONFIRMED' });

    const startMs = new Date(session.starts_at).getTime();
    const endMs = Math.max(new Date(session.ends_at).getTime(), startMs + MIN_ROOM_MINUTES * 60_000);
    const now = Date.now();
    if (now < startMs - OPEN_BEFORE_MIN * 60_000) return json({ success: false, error: 'TOO_EARLY' });
    if (now > endMs) return json({ success: false, error: 'ENDED' });

    const apiKey = Deno.env.get('DAILY_API_KEY');
    if (!apiKey) {
      console.error('[session-room-token] DAILY_API_KEY is not set');
      return json({ success: false, error: 'VIDEO_NOT_CONFIGURED' });
    }
    const daily = (path: string, init?: RequestInit) =>
      fetch(`${DAILY_API}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      });

    const roomName = `xima-${session.id}`;
    const expSeconds = Math.floor((endMs + GRACE_AFTER_END_MIN * 60_000) / 1000);

    // One private room per session, created by whoever arrives first.
    let roomUrl: string | null = null;
    const existing = await daily(`/rooms/${roomName}`);
    if (existing.ok) {
      roomUrl = (await existing.json()).url ?? null;
    } else {
      await existing.body?.cancel();
      const created = await daily('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: roomName,
          privacy: 'private',
          properties: {
            exp: expSeconds,
            eject_at_room_exp: true,
            enable_prejoin_ui: true,
            enable_chat: true,
            enable_screenshare: true,
            max_participants: 4,
            lang: 'user',
          },
        }),
      });
      if (!created.ok) {
        const detail = await created.text();
        // Two people arriving together: the other request made it first.
        const retry = await daily(`/rooms/${roomName}`);
        if (!retry.ok) {
          console.error('[session-room-token] room creation failed', created.status, detail);
          return json({ success: false, error: 'VIDEO_PROVIDER_ERROR' });
        }
        roomUrl = (await retry.json()).url ?? null;
      } else {
        roomUrl = (await created.json()).url ?? null;
      }
    }
    if (!roomUrl) return json({ success: false, error: 'VIDEO_PROVIDER_ERROR' });

    const displayName = isMentor
      ? (mentor?.name || 'Mentor')
      : (profile?.full_name || profile?.name || profile?.first_name || 'Candidate').trim();

    const tokenRes = await daily('/meeting-tokens', {
      method: 'POST',
      body: JSON.stringify({
        properties: { room_name: roomName, user_name: displayName, user_id: user.id, is_owner: isMentor, exp: expSeconds },
      }),
    });
    if (!tokenRes.ok) {
      console.error('[session-room-token] token failed', tokenRes.status, await tokenRes.text());
      return json({ success: false, error: 'VIDEO_PROVIDER_ERROR' });
    }
    const { token } = await tokenRes.json();

    const role = isMentor ? 'mentor' : 'candidate';
    if (session.video_provider !== 'daily' || session.video_room_name !== roomName) {
      await admin.from('mentor_sessions').update({
        video_provider: 'daily',
        video_room_name: roomName,
        video_room_url: roomUrl,
        video_room_created_at: new Date().toISOString(),
      }).eq('id', session.id);
      await admin.from('mentor_session_audit_logs').insert({
        session_id: session.id, actor_user_id: user.id, actor_role: role,
        action: 'video_room_created', meta: { provider: 'daily', room_name: roomName },
      });
    }
    await admin.from('mentor_session_audit_logs').insert({
      session_id: session.id, actor_user_id: user.id, actor_role: role,
      action: 'video_room_joined', meta: { provider: 'daily' },
    });

    return json({ success: true, url: roomUrl, token, role, starts_at: session.starts_at, ends_at: session.ends_at });
  } catch (err) {
    console.error('[session-room-token] unexpected', err);
    return json({ success: false, error: 'INTERNAL' });
  }
});
