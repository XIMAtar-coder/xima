import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { 
  validateString, 
  validateOptionalEnum, 
  ValidationError,
  handleValidationError 
} from "../_shared/validation.ts";
import { callAiGateway, generateCorrelationId, AiGatewayError } from "../_shared/aiClient.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/errors.ts";

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', it: 'Italian', es: 'Spanish' };
const SUPPORTED_LOCALES = ['en', 'it', 'es'] as const;
const MAX_TEXT_LENGTH = 10000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = req.headers.get('x-correlation-id') || generateCorrelationId();

  try {
    // Authenticate request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized');
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError) {
      return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized');
    }

    const body = await req.json();
    
    const text = validateString(body.text, 'text', { minLength: 1, maxLength: MAX_TEXT_LENGTH });
    const normalizedLocale = validateOptionalEnum(body.targetLocale, SUPPORTED_LOCALES, 'en');
    const targetLanguage = LANGUAGE_NAMES[normalizedLocale];

    if (normalizedLocale === 'en') {
      return jsonResponse({ translatedText: text });
    }

    const systemPrompt = `You are a professional translator. Translate the following text to ${targetLanguage}.

STRICT RULES:
- You MUST respond ONLY in ${targetLanguage}.
- Do NOT include any English words unless they are proper nouns, brand names, technical terms that are universally used in English (like "API", "CEO", "KPI"), or product names.
- Do NOT add bilingual text or translations in parentheses.
- Preserve the original meaning, tone, and structure.
- If the text contains JSON-like structures, translate only the human-readable values, not keys.
- Keep formatting (bullet points, line breaks) intact.
- Return ONLY the translated text, no explanations or commentary.`;

    try {
      const aiResp = await callAiGateway({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        correlationId,
        functionName: 'translate-content',
      });

      const translatedText = aiResp.content.trim() || text;

      console.log(JSON.stringify({
        type: 'success', correlation_id: correlationId,
        function_name: 'translate-content',
        target_locale: normalizedLocale,
        output_length: translatedText.length,
      }));

      return jsonResponse({ translatedText });
    } catch (e) {
      if (e instanceof AiGatewayError) {
        if (e.statusCode === 429 || e.statusCode === 402) return e.toResponse();
      }
      // Fallback: return original text
      return jsonResponse({ translatedText: text });
    }

  } catch (error) {
    if (error instanceof ValidationError) {
      return handleValidationError(error, corsHeaders);
    }
    console.error(JSON.stringify({
      type: 'unhandled_error', correlation_id: correlationId,
      function_name: 'translate-content',
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
    return errorResponse(500, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Unknown error');
  }
});
