/**
 * l2-converse — Stage B: live adversarial counterpart runtime.
 *
 * Turn-indexing contract (locked):
 *   - opening_line is owned by Stage C's UI and seeded server-side once at turn = -1
 *     on the first call (turn_index === 0). Never re-generated.
 *   - turn_index is 0-based and equals the candidate's reply count for THIS call:
 *     first reply = 0, second = 1, ..., max 7th = 6.
 *   - curveball.trigger_turn is 0-based on candidate replies. trigger_turn = 4 fires
 *     when turn_index === 4 (i.e. the 5th candidate reply). Strict `>=` so a missed
 *     trigger fires on the next real turn.
 *   - latest_candidate_message is ALWAYS non-null. Empty/null → 400 EMPTY_MESSAGE.
 *     There is no "opener" call to this function.
 *
 * Storage: writes to challenge_submissions.draft_payload with format='l2_conversation'.
 * status stays 'draft' until Stage C flips to 'submitted' with submitted_payload.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicApi, AnthropicError, getModelForFunction } from "../_shared/anthropicClient.ts";
import { generateCorrelationId } from "../_shared/aiClient.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/errors.ts";
import { emitAuditEvent } from "../_shared/auditEvents.ts";

const MAX_CANDIDATE_TURNS = 7; // hard cap: turn_index 0..6 inclusive
const CONCLUDI_RE = /\bconcludi(amo)?\b/i;

interface ConverseRequest {
  challenge_id: string;
  invitation_id: string;
  latest_candidate_message: string;
  turn_index: number;
}

interface TranscriptEntry {
  role: "counterpart" | "candidate";
  text: string;
  turn: number; // -1 = opener, 0..6 = candidate reply / counterpart response pair
  curveball?: boolean;
  degraded?: boolean;
}

interface DraftPayload {
  format: "l2_conversation";
  opening_line: string;
  transcript: TranscriptEntry[];
  curveball_fired: boolean;
  last_turn_index: number;
  done?: boolean;
  reason?: "concludi_signal" | "max_turns";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fallbackLine(stance: string | undefined): string {
  const s = (stance || "").toLowerCase();
  if (s.includes("ostil")) return "Va bene, ma non mi hai ancora detto come risolvi il problema concreto. Sii specifico.";
  if (s.includes("scett")) return "Capisco, ma ho bisogno di numeri e di una proposta più chiara prima di andare avanti.";
  return "Ok, andiamo avanti. Cosa proponi nel concreto, con tempi e responsabilità?";
}

function sanitizeReply(text: string): string {
  // Strip code fences, leading role labels, and any system/meta tags the model may echo.
  let t = (text || "").trim();
  t = t.replace(/^```[a-z]*\n?|```$/gi, "").trim();
  t = t.replace(/^(marco|counterpart|assistant|system)\s*[:：-]\s*/i, "").trim();
  t = t.replace(/<\/?(system|instruction|rubric|spec)[^>]*>/gi, "").trim();
  return t;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse(405, "METHOD_NOT_ALLOWED", "POST only");

  const correlationId = generateCorrelationId();

  let body: ConverseRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Body must be valid JSON");
  }

  const { challenge_id, invitation_id, latest_candidate_message, turn_index } = body || ({} as ConverseRequest);

  // Validation
  if (!challenge_id || !UUID_RE.test(challenge_id)) return errorResponse(400, "INVALID_CHALLENGE_ID", "challenge_id must be a UUID");
  if (!invitation_id || !UUID_RE.test(invitation_id)) return errorResponse(400, "INVALID_INVITATION_ID", "invitation_id must be a UUID");
  if (typeof turn_index !== "number" || !Number.isInteger(turn_index) || turn_index < 0 || turn_index > MAX_CANDIDATE_TURNS - 1) {
    return errorResponse(400, "INVALID_TURN_INDEX", `turn_index must be integer in [0, ${MAX_CANDIDATE_TURNS - 1}]`);
  }
  const msg = typeof latest_candidate_message === "string" ? latest_candidate_message.trim() : "";
  if (!msg) return errorResponse(400, "EMPTY_MESSAGE", "latest_candidate_message must be a non-empty string");
  if (msg.length > 4000) return errorResponse(400, "MESSAGE_TOO_LONG", "latest_candidate_message must be <= 4000 chars");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Load challenge + l2_simulation spec
  const { data: challenge, error: chErr } = await supabase
    .from("business_challenges")
    .select("id, level, config_json, hiring_goal_id, business_id")
    .eq("id", challenge_id)
    .maybeSingle();
  if (chErr || !challenge) return errorResponse(404, "CHALLENGE_NOT_FOUND", "Challenge not found");
  if (challenge.level !== 2) return errorResponse(409, "NOT_L2_CHALLENGE", "l2-converse only runs on level=2 challenges");

  const spec = (challenge.config_json as any)?.l2_simulation;
  if (!spec || !spec.counterpart || !spec.scenario) {
    return errorResponse(409, "L2_SPEC_MISSING", "config_json.l2_simulation not provisioned");
  }
  const opening_line: string = spec.counterpart.opening_line || "";
  const counterpartName: string = spec.counterpart.name || "Counterpart";
  const counterpartRole: string = spec.counterpart.role || "";
  const stance: string = spec.counterpart.stance || "ostile";
  const curveballTriggerTurn: number | null =
    typeof spec.curveball?.trigger_turn === "number" ? spec.curveball.trigger_turn : null;
  const curveballEvent: string = spec.curveball?.event || "";

  // Load invitation → candidate
  const { data: invitation, error: invErr } = await supabase
    .from("challenge_invitations")
    .select("id, challenge_id, candidate_profile_id, business_id, hiring_goal_id, status")
    .eq("id", invitation_id)
    .maybeSingle();
  if (invErr || !invitation) return errorResponse(404, "INVITATION_NOT_FOUND", "Invitation not found");
  if (invitation.challenge_id !== challenge_id) {
    return errorResponse(409, "INVITATION_CHALLENGE_MISMATCH", "Invitation does not belong to this challenge");
  }

  // Load existing draft submission for this invitation, if any
  const { data: existingSub } = await supabase
    .from("challenge_submissions")
    .select("id, status, draft_payload")
    .eq("invitation_id", invitation_id)
    .eq("challenge_id", challenge_id)
    .maybeSingle();

  if (existingSub && existingSub.status === "submitted") {
    return errorResponse(409, "ALREADY_SUBMITTED", "Conversation already submitted");
  }

  // Reconstruct transcript
  const existingDraft: Partial<DraftPayload> | null =
    existingSub?.draft_payload && (existingSub.draft_payload as any).format === "l2_conversation"
      ? (existingSub.draft_payload as DraftPayload)
      : null;

  let transcript: TranscriptEntry[] = existingDraft?.transcript ? [...existingDraft.transcript] : [];
  let curveball_fired = !!existingDraft?.curveball_fired;

  if (existingDraft?.done) {
    return errorResponse(409, "CONVERSATION_DONE", "Conversation already ended");
  }

  // Seed opener on first call
  if (transcript.length === 0) {
    if (turn_index !== 0) {
      return errorResponse(409, "TURN_INDEX_MISMATCH", "First call must have turn_index=0", {
        expected: 0,
        got: turn_index,
      });
    }
    transcript.push({ role: "counterpart", text: opening_line, turn: -1 });
  }

  // Verify turn_index matches expected (candidate reply count so far)
  const candidateRepliesSoFar = transcript.filter((t) => t.role === "candidate").length;
  if (turn_index !== candidateRepliesSoFar) {
    return errorResponse(409, "TURN_INDEX_MISMATCH", "turn_index does not match server state", {
      expected: candidateRepliesSoFar,
      got: turn_index,
    });
  }

  // Append candidate turn
  transcript.push({ role: "candidate", text: msg, turn: turn_index });

  // Determine if curveball should fire on this generation
  const shouldFireCurveball =
    !curveball_fired && curveballTriggerTurn !== null && turn_index >= curveballTriggerTurn && !!curveballEvent;

  // Determine if candidate signaled concludi → counterpart produces a closing line
  const candidateConcludi = CONCLUDI_RE.test(msg);
  // Will we hit max_turns after this counterpart reply?
  const willHitMaxTurns = turn_index >= MAX_CANDIDATE_TURNS - 1;
  const closing = candidateConcludi || willHitMaxTurns;

  // Build prompt
  const transcriptForPrompt = transcript
    .map((t) => `${t.role === "counterpart" ? counterpartName : "Candidato"}: ${t.text}`)
    .join("\n");

  const system = `Sei ${counterpartName}, ${counterpartRole}.
Stance: ${stance}.
Lingua: italiano. Tono coerente con la stance, professionale ma diretto.
Resta SEMPRE nel personaggio. Non sei un assistente AI, non spiegare regole, non citare la rubric.
Risposte brevi: 1–3 frasi, massimo ~70 parole. Una sola voce, niente meta-commenti.
Contesto scenario: ${spec.scenario}
${shouldFireCurveball ? `\nEVENTO DA INTRODURRE ORA, intrecciato naturalmente nella tua risposta (NON come elenco, NON come notifica esterna staccata):\n${curveballEvent}` : ""}
${closing ? `\nQuesto è il tuo turno finale: chiudi la conversazione in 1–2 frasi coerenti con la stance, senza promesse irrealistiche.` : ""}`;

  const userMessage = `Conversazione finora:\n${transcriptForPrompt}\n\nProduci SOLO la prossima battuta di ${counterpartName}, senza prefissi né virgolette.`;

  let replyText: string;
  let degraded = false;

  try {
    const result = await callAnthropicApi({
      system,
      userMessage,
      correlationId,
      functionName: "l2-converse",
      model: getModelForFunction("l2-converse"),
      maxTokens: 350,
      temperature: 0.85,
      inputSummary: `challenge=${challenge_id} turn=${turn_index} curveball=${shouldFireCurveball} closing=${closing}`,
    });
    replyText = sanitizeReply(result.content);
    if (!replyText) {
      replyText = fallbackLine(stance);
      degraded = true;
    }
  } catch (e) {
    const code = e instanceof AnthropicError ? e.errorCode : "MODEL_ERROR";
    console.error(`[l2-converse] model failure (${code}):`, e instanceof Error ? e.message : e);
    replyText = fallbackLine(stance);
    degraded = true;
    emitAuditEvent({
      actorType: "system",
      action: "challenge.l2_degraded",
      entityType: "challenge_submission",
      entityId: invitation_id,
      correlationId,
      metadata: { challenge_id, invitation_id, turn_index, error_code: code },
    });
  }

  // Append counterpart turn
  const counterpartEntry: TranscriptEntry = {
    role: "counterpart",
    text: replyText,
    turn: turn_index,
    ...(shouldFireCurveball && !degraded ? { curveball: true } : {}),
    ...(degraded ? { degraded: true } : {}),
  };
  transcript.push(counterpartEntry);

  // Only consume curveball if it was actually woven into a real (non-degraded) reply
  if (shouldFireCurveball && !degraded) curveball_fired = true;

  const done = closing && !degraded ? true : false;
  const reason: DraftPayload["reason"] | undefined = done
    ? candidateConcludi
      ? "concludi_signal"
      : "max_turns"
    : undefined;

  const draftPayload: DraftPayload = {
    format: "l2_conversation",
    opening_line,
    transcript,
    curveball_fired,
    last_turn_index: turn_index,
    ...(done ? { done: true, reason } : {}),
  };

  // Upsert draft submission
  if (existingSub) {
    const { error: upErr } = await supabase
      .from("challenge_submissions")
      .update({ draft_payload: draftPayload, updated_at: new Date().toISOString() })
      .eq("id", existingSub.id);
    if (upErr) {
      console.error("[l2-converse] draft update failed:", upErr.message);
      return errorResponse(500, "DRAFT_PERSIST_FAILED", upErr.message);
    }
  } else {
    const { error: insErr } = await supabase.from("challenge_submissions").insert({
      invitation_id,
      challenge_id,
      candidate_profile_id: invitation.candidate_profile_id,
      business_id: invitation.business_id ?? challenge.business_id,
      hiring_goal_id: invitation.hiring_goal_id ?? challenge.hiring_goal_id,
      status: "draft",
      draft_payload: draftPayload,
    });
    if (insErr) {
      console.error("[l2-converse] draft insert failed:", insErr.message);
      return errorResponse(500, "DRAFT_PERSIST_FAILED", insErr.message);
    }
  }

  emitAuditEvent({
    actorType: "candidate",
    actorId: invitation.candidate_profile_id ?? null,
    action: done ? "challenge.l2_turn_final" : "challenge.l2_turn",
    entityType: "challenge_submission",
    entityId: invitation_id,
    correlationId,
    metadata: {
      challenge_id,
      turn_index,
      curveball_fired_now: shouldFireCurveball && !degraded,
      degraded,
      done,
      reason,
    },
  });

  return jsonResponse({
    reply: replyText,
    turn_index,
    curveball_fired,
    curveball_fired_this_turn: shouldFireCurveball && !degraded,
    done,
    reason: reason ?? null,
    degraded,
    correlation_id: correlationId,
  });
});
