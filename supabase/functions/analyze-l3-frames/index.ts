/**
 * WITHDRAWN — this endpoint performed a prohibited practice.
 *
 * It sent video frames from a candidate's L3 interview to a vision model and
 * asked it to report "energy level", "engagement shift", "emotional shifts
 * between questions", "potential discomfort questions", and whether the
 * candidate's visual presence was congruent with their profile.
 *
 * That is inference of emotional state from biometric data in the context of an
 * employment decision. EU AI Act Article 5(1)(f) prohibits it outright: it is
 * not a high-risk practice with a conformity route, it is a banned one, and no
 * amount of consent, disclosure or human-in-the-loop review makes it lawful.
 * The file's own header used to argue "the AI does NOT evaluate, it observes" —
 * that distinction does not exist in the prohibition, which turns on whether
 * emotion is inferred at all, not on who acts on the output.
 *
 * Removing only the offending fields was considered and rejected. The function
 * had frames and nothing else — no audio, no transcript — so once emotion and
 * affect inference are taken out, what remains is not a capability worth
 * keeping. The L3 stage itself is unaffected: candidates still record, and a
 * human reviewer still watches. What is gone is the machine claiming to read how
 * they felt while doing it.
 *
 * Kept as an explicit refusal rather than deleted, so that any caller appearing
 * later fails loudly and traceably instead of hitting a 404 that reads like a
 * deployment error. It had no callers in the app or in any other edge function
 * when it was withdrawn.
 *
 * Do not reinstate without a legal decision. If an L3 signal is genuinely
 * needed, derive it from what the candidate said — the content of their answers
 * — which is not emotion inference and is already how L1 and L2 work.
 */

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { corsHeaders, errorResponse } from "../_shared/errors.ts";

serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  console.warn(
    JSON.stringify({
      type: "withdrawn_endpoint_called",
      function_name: "analyze-l3-frames",
      reason: "emotion inference in employment — EU AI Act Art. 5(1)(f)",
    })
  );

  return errorResponse(
    410,
    "ENDPOINT_WITHDRAWN",
    "Visual emotion analysis has been removed. Inferring emotional state from a " +
      "candidate's video is prohibited in an employment context under EU AI Act " +
      "Article 5(1)(f). L3 interviews are reviewed by a human."
  );
});
