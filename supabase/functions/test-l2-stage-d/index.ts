// One-shot E2E harness for Stage D validation. Drives l2-converse, submits the row,
// invokes analyze-open-answer (l2_conversation branch), reports assertions.
// Auth: service-role only (called via fetch with the SUPABASE_SERVICE_ROLE_KEY as Bearer).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INV = "dd8fd3bf-a0b3-4527-a088-f759d3769bb5";
const CHAL = "34abbebd-b221-40d8-b174-0f45869b995c";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const service = createClient(SUPABASE_URL, SERVICE_KEY);

  const log: any[] = [];
  const report: Record<string, any> = {};

  // Reset state for clean run
  await service.from("challenge_submissions").delete().eq("invitation_id", INV);
  await service.from("pillar_trajectory_log").delete().eq("source_entity_id", INV).eq("source_type", "l2_challenge");
  await service.from("challenge_invitations").update({ status: "invited", responded_at: null }).eq("id", INV);

  // Snapshot pre-state
  const { data: profilePre } = await service.from("profiles").select("user_id, ximatar_name, pillar_scores").eq("id",
    (await service.from("challenge_invitations").select("candidate_profile_id").eq("id", INV).single()).data!.candidate_profile_id
  ).single();
  report.profile_pre = profilePre;

  const candidateMessages = [
    "Capisco la pressione. Marco, prima di tutto: hai ragione, 1000 pezzi cambiano completamente il problema. Ho due strade da discutere subito: (a) configurazione ibrida con una stazione manuale di backup che ci permette di andare live in 6-8 settimane con throughput a 800 pezzi/giorno, (b) phased rollout con la linea parallela esistente, riconfigurata in 4 settimane. Tradeoff: (a) costa ~40k in più ma garantisce continuita', (b) zero capex aggiuntivo ma rischio bottleneck sulla linea esistente per 3 mesi.",
    "Sul fornitore ritardatario: parallelizziamo. Chiedo a Produzione un ponte di 6 settimane usando il vecchio nastro modulare — non e' bello ma regge i 1000 pezzi se aggiungiamo un operatore in postazione di controllo. Costo stimato: 8k extra ingegneria, 12k operatore temporaneo. In 4 settimane abbiamo prototipo, in 8 produzione validata.",
    "Su sicurezza non barattiamo: qualsiasi modifica al layout richiede nuova valutazione rischi macchine e re-marking CE se tocchiamo le protezioni perimetrali. Lo metto sul piano dal giorno zero, non come afterthought. Mi prendo io la responsabilita' di portare il RSPP in riunione mercoledi'.",
    "Marco, capisco che sei scettico. Proponi tu un criterio di go/no-go: se ti porto un piano dettagliato entro venerdi' con budget firmato dal CFO e timeline validata da Produzione, ci diamo 2 settimane per il pilot. Se non regge, torniamo al disegno originale a volumi ridotti. Concludi.",
  ];

  // Build a synthetic l2_conversation submitted_payload directly (l2-converse requires a candidate JWT;
  // for Stage D validation we exercise the scoring branch, not the converse engine).
  const transcript: any[] = [
    { role: "counterpart", text: "Allora, mi serve capire come pensi di gestire il raddoppio volumi con il fornitore in ritardo. Sono scettico.", turn: -1 },
  ];
  for (let i = 0; i < candidateMessages.length; i++) {
    transcript.push({ role: "candidate", text: candidateMessages[i], turn: i });
    const isCurveball = i === 1;
    transcript.push({
      role: "counterpart",
      text: i === 0
        ? "Ok, ma il fornitore principale ci ha appena confermato 8 settimane di ritardo. Cosa fai?"
        : i === 1
          ? "[CURVEBALL] La Direzione ha appena annunciato che il volume sale ancora: 1200 pezzi, non 1000. Hai 90 secondi."
          : i === 2
            ? "E sulla sicurezza? Non mi raccontare che la valutazione la facciamo a fine progetto."
            : "Ok. Ti aspetto venerdi'.",
      turn: i,
      curveball: isCurveball,
    });
  }

  const submittedPayload = {
    format: "l2_conversation",
    opening_line: transcript[0].text,
    transcript,
    curveball_fired: true,
    last_turn_index: candidateMessages.length - 1,
    reason: "concludi_signal",
  };
  log.push({ stage: "synthetic_payload_built", candidate_turns: candidateMessages.length });

  // INSERT the submission directly as 'submitted' (mirrors what useL2ConverseDraft.submit() ends up writing)
  const { data: insertedSub, error: insertErr } = await service
    .from("challenge_submissions")
    .insert({
      invitation_id: INV,
      status: "submitted",
      submitted_payload: submittedPayload,
      signals_version: "v1",
    })
    .select("id")
    .single();
  report.submit_insert_error = insertErr?.message || null;
  report.submission_id = insertedSub?.id || null;

  await service.from("challenge_invitations").update({ status: "completed", responded_at: new Date().toISOString() }).eq("id", INV);

  if (insertErr) {
    return new Response(JSON.stringify({ error: "submit_insert_failed", report, log }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }


  // Invoke analyze-open-answer (l2_conversation branch)
  const invokeOnce = async (label: string) => {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/analyze-open-answer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        format: "l2_conversation",
        invitation_id: INV,
        challenge_id: CHAL,
        language: "it",
      }),
    });
    const text = await r.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 400) }; }
    return { label, status: r.status, body };
  };

  const first = await invokeOnce("first_invoke");
  report.first_invoke = { status: first.status, returned_status: first.body?.status, error: first.body?.error, model: first.body?.signals_payload?.model };

  // Read DB state after first invoke
  const { data: subAfter } = await service
    .from("challenge_submissions")
    .select("status, signals_payload, submitted_payload, signals_version")
    .eq("invitation_id", INV)
    .single();

  const sp = subAfter?.signals_payload as any;
  const { data: trajRows } = await service
    .from("pillar_trajectory_log")
    .select("id, drive_delta, computational_power_delta, communication_delta, creativity_delta, knowledge_delta, source_type, source_entity_id")
    .eq("source_entity_id", INV)
    .eq("source_type", "l2_challenge");

  const { data: rubricRow } = await service
    .from("business_challenges")
    .select("config_json")
    .eq("id", CHAL)
    .single();
  const rubricCfg: any[] = (rubricRow?.config_json as any)?.l2_simulation?.rubric || [];

  // criterion_id round-trip check (recomputed locally)
  async function sha1Hex12(s: string) {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
  }
  const expectedIds = new Set<string>();
  for (const r of rubricCfg) expectedIds.add(await sha1Hex12(`${r.primary_pillar}|${r.criterion}`));
  const breakdownIds: string[] = Array.isArray(sp?.rubric_breakdown) ? sp.rubric_breakdown.map((b: any) => String(b.criterion_id)) : [];
  const allRoundTrip = breakdownIds.length === expectedIds.size && breakdownIds.every(id => expectedIds.has(id));

  // Non-integer delta check
  const deltaIsFractional = (trajRows || []).some(r =>
    [r.drive_delta, r.computational_power_delta, r.communication_delta, r.creativity_delta, r.knowledge_delta]
      .some(v => v !== null && Number(v) !== Math.trunc(Number(v))));

  // Re-invoke for idempotency
  const second = await invokeOnce("second_invoke");
  const { data: trajRows2 } = await service
    .from("pillar_trajectory_log")
    .select("id")
    .eq("source_entity_id", INV)
    .eq("source_type", "l2_challenge");

  // Re-fetch profile for archetype + scores
  const { data: profilePost } = await service
    .from("profiles")
    .select("user_id, ximatar_name, pillar_scores")
    .eq("user_id", profilePre!.user_id)
    .single();

  report.assertions = {
    a_status_and_shape: {
      submitted_status: subAfter?.status,
      submitted_format: (subAfter?.submitted_payload as any)?.format,
      signals_format: sp?.format,
      has_pillar_impact: !!sp?.pillar_impact,
      pillar_impact_keys: sp?.pillar_impact ? Object.keys(sp.pillar_impact).sort() : [],
      has_rubric_breakdown: Array.isArray(sp?.rubric_breakdown),
      rubric_breakdown_len: sp?.rubric_breakdown?.length,
      confidence: sp?.confidence,
      summary_len: sp?.summary?.length,
      model: sp?.model,
      nudge_skipped: sp?.nudge_skipped,
      flags: sp?.flags,
    },
    b_criterion_id_round_trip: { ok: allRoundTrip, expected_ids: [...expectedIds], got_ids: breakdownIds },
    c_one_trajectory_row: { count_after_first: trajRows?.length, ids: trajRows?.map(r => r.id) },
    d_non_integer_delta: { ok: deltaIsFractional, sample: trajRows?.[0] },
    e_idempotent_reinvoke: {
      second_status: second.status,
      second_returned_status: second.body?.status,
      trajectory_count_after_second: trajRows2?.length,
      same_count: trajRows?.length === trajRows2?.length,
    },
    f_archetype_unchanged: {
      pre: profilePre?.ximatar_name,
      post: profilePost?.ximatar_name,
      unchanged: profilePre?.ximatar_name === profilePost?.ximatar_name,
    },
    h_model_used: {
      model_in_signals: sp?.model,
      first_invoke_model: first.body?.signals_payload?.model,
      first_invoke_error: first.body?.error,
    },
    pillar_scores_pre: profilePre?.pillar_scores,
    pillar_scores_post: profilePost?.pillar_scores,
  };

  return new Response(JSON.stringify(report, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
