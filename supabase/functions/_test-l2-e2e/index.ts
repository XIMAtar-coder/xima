// Temporary E2E harness for Stage C l2-converse flow. Delete after run.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CHALLENGE_ID = "34abbebd-b221-40d8-b174-0f45869b995c";
const INVITATION_ID = "dd8fd3bf-a0b3-4527-a088-f759d3769bb5";
const CANDIDATE_USER_ID = "ff3183e9-8031-413e-a052-42049aaec7de";
const CANDIDATE_EMAIL = "peter07@hotmail.com";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (_req) => {
  const log: any[] = [];
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // 0. Clear any existing submission row for clean slate
  const { error: delErr } = await admin
    .from("challenge_submissions")
    .delete()
    .eq("invitation_id", INVITATION_ID);
  log.push({ step: "0_clear", error: delErr?.message ?? null });

  // 1. Generate magic-link and verify to mint an access token for the candidate
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: CANDIDATE_EMAIL,
  });
  if (linkErr) return j({ log, fatal: "generateLink failed", err: linkErr.message });
  const hashed = (linkData?.properties as any)?.hashed_token;
  if (!hashed) return j({ log, fatal: "no hashed_token returned" });

  const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: otpData, error: otpErr } = await anonClient.auth.verifyOtp({
    type: "magiclink",
    token_hash: hashed,
  });
  if (otpErr || !otpData?.session) return j({ log, fatal: "verifyOtp failed", err: otpErr?.message });
  const access = otpData.session.access_token;
  log.push({ step: "1_token", user_id: otpData.user?.id });

  // 2. Drive l2-converse through several turns + curveball + concludi
  const turns = [
    "Capisco la tua preoccupazione. Proponiamo di partire da un MVP focalizzato sui due processi piu' critici, con un team ridotto e tempistiche di 6 settimane.",
    "Sui numeri: stimo un costo iniziale di circa 40k, con ROI atteso in 4 mesi grazie alla riduzione dei tempi operativi del 30%.",
    "Per i rischi: gestiamo la migrazione in parallelo, mantenendo il sistema attuale fino al cutover finale. Cosi' azzeriamo il rischio di downtime.",
    "Sul team: avrei bisogno di due sviluppatori e mezza giornata a settimana del PM. Posso garantire delivery anche con questo scope ridotto.",
    "Sulla nuova vincolo del budget tagliato, ridefinisco lo scope: ci concentriamo solo sul processo numero uno, riducendo i costi a 22k e mantenendo l'80% del valore atteso.",
    "Va bene, concludi: ti mando entro venerdi' una nota scritta con scope, tempi e numeri rivisti.",
  ];

  const turnResults: any[] = [];
  for (let i = 0; i < turns.length; i++) {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/l2-converse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${access}`,
        "apikey": Deno.env.get("SUPABASE_ANON_KEY")!,
      },
      body: JSON.stringify({
        challenge_id: CHALLENGE_ID,
        invitation_id: INVITATION_ID,
        latest_candidate_message: turns[i],
        turn_index: i,
      }),
    });
    const body = await resp.json().catch(() => ({}));
    turnResults.push({
      turn: i,
      status: resp.status,
      reply_preview: typeof body?.counterpart_reply === "string" ? body.counterpart_reply.slice(0, 120) : null,
      done: body?.done ?? null,
      curveball_fired: body?.curveball_fired ?? null,
      next_turn: body?.next_turn_index ?? null,
      error: body?.error ?? null,
    });
    if (body?.done) break;
  }
  log.push({ step: "2_turns", turns: turnResults });

  // 3. Load resulting draft
  const { data: sub, error: subErr } = await admin
    .from("challenge_submissions")
    .select("id, status, draft_payload, signals_version")
    .eq("invitation_id", INVITATION_ID)
    .maybeSingle();
  if (subErr || !sub) return j({ log, fatal: "no submission row after turns", err: subErr?.message });
  log.push({
    step: "3_draft",
    id: sub.id,
    status: sub.status,
    format: (sub.draft_payload as any)?.format,
    transcript_len: (sub.draft_payload as any)?.transcript?.length,
    curveball_fired: (sub.draft_payload as any)?.curveball_fired,
    last_turn_index: (sub.draft_payload as any)?.last_turn_index,
    done: (sub.draft_payload as any)?.done,
    reason: (sub.draft_payload as any)?.reason,
  });

  // 4. Submit exactly like useL2ConverseDraft.submit(): UPDATE row
  const draft = sub.draft_payload as any;
  const submitted_payload = {
    format: "l2_conversation",
    transcript: draft.transcript,
    opening_line: draft.opening_line,
    curveball_fired: draft.curveball_fired,
    last_turn_index: draft.last_turn_index,
    reason: draft.reason ?? "concludi_signal",
  };

  const { data: updated, error: updErr } = await admin
    .from("challenge_submissions")
    .update({
      status: "submitted",
      submitted_payload,
      signals_version: "v1",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", sub.id)
    .select("id, status, submitted_payload, signals_version, submitted_at")
    .maybeSingle();
  log.push({
    step: "4_submit",
    ok: !updErr,
    error: updErr?.message ?? null,
    error_details: (updErr as any)?.details ?? null,
    error_hint: (updErr as any)?.hint ?? null,
    error_code: (updErr as any)?.code ?? null,
    submitted_status: updated?.status ?? null,
    submitted_format: (updated?.submitted_payload as any)?.format ?? null,
    signals_version: updated?.signals_version ?? null,
  });

  // 5. Verify feed_items row was emitted by trigger
  const { data: feed, error: feedErr } = await admin
    .from("feed_items")
    .select("id, type, created_at, payload")
    .or(`payload->>invitation_id.eq.${INVITATION_ID},payload->>submission_id.eq.${sub.id}`)
    .order("created_at", { ascending: false })
    .limit(5);
  log.push({
    step: "5_feed",
    error: feedErr?.message ?? null,
    count: feed?.length ?? 0,
    items: (feed ?? []).map((r: any) => ({ id: r.id, type: r.type, created_at: r.created_at })),
  });

  return j({ log });
});

function j(obj: any) {
  return new Response(JSON.stringify(obj, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}
