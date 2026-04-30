import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicApi, AnthropicError, getModelForFunction } from "../_shared/anthropicClient.ts";
import { extractJsonFromAiContent, generateCorrelationId } from "../_shared/aiClient.ts";
import { corsHeaders, errorResponse, jsonResponse, unauthorizedResponse, forbiddenResponse } from "../_shared/errors.ts";
import { emitAuditEventWithMetric } from "../_shared/auditEvents.ts";
import { XIMATAR_PROFILES } from "../_shared/ximatarTaxonomy.ts";
import { checkDatabaseFirst, depositInference } from "../_shared/intelligenceEngine.ts";

// =====================================================
// Types
// =====================================================

interface GenerateChallengeRequest {
  mode: 'xima_core';
  locale?: string;
  business_id?: string;
  hiring_goal_id?: string;
  challenge_id?: string;
  // Legacy fields for backward compatibility
  context?: {
    companyIndustry?: string;
    companySize?: string;
    companyMaturity?: string;
    decisionStyle?: string;
    roleTitle?: string;
    functionArea?: string;
    experienceLevel?: string;
    taskDescription?: string;
  };
  // Legacy non-xima_core fields
  task_description?: string;
  role_title?: string;
  experience_level?: string;
  work_model?: string;
  country?: string;
}

interface XimaCoreResult {
  scenario: string;
  business_type: string;
  context_tag: string;
  context_snapshot: Record<string, unknown>;
  evaluation_lens: {
    drive_signals: string[];
    computational_power_signals: string[];
    communication_signals: string[];
    creativity_signals: string[];
    knowledge_signals: string[];
  };
  expected_tensions: string[];
  estimated_time_minutes: number;
}

// =====================================================
// Constants
// =====================================================

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', it: 'Italian', es: 'Spanish' };

// =====================================================
// Validation
// =====================================================

function validateXimaCoreResult(parsed: unknown): XimaCoreResult | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.scenario !== "string" || obj.scenario.length < 50 || obj.scenario.length > 1200) return null;
  if (typeof obj.business_type !== "string" || obj.business_type.length === 0) return null;
  if (typeof obj.context_tag !== "string" || obj.context_tag.length === 0) return null;

  const lens = obj.evaluation_lens;
  if (!lens || typeof lens !== "object") return null;
  const l = lens as Record<string, unknown>;
  const pillarFields = ["drive_signals", "computational_power_signals", "communication_signals", "creativity_signals", "knowledge_signals"];
  for (const f of pillarFields) {
    if (!Array.isArray(l[f]) || (l[f] as unknown[]).length < 1) return null;
  }

  if (!Array.isArray(obj.expected_tensions) || (obj.expected_tensions as unknown[]).length < 1) return null;

  const time = obj.estimated_time_minutes;
  if (typeof time !== "number" || time < 5 || time > 60) return null;

  return {
    scenario: String(obj.scenario),
    business_type: String(obj.business_type),
    context_tag: String(obj.context_tag),
    context_snapshot: typeof obj.context_snapshot === "object" && obj.context_snapshot !== null ? obj.context_snapshot as Record<string, unknown> : {},
    evaluation_lens: {
      drive_signals: (l.drive_signals as unknown[]).map(String),
      computational_power_signals: (l.computational_power_signals as unknown[]).map(String),
      communication_signals: (l.communication_signals as unknown[]).map(String),
      creativity_signals: (l.creativity_signals as unknown[]).map(String),
      knowledge_signals: (l.knowledge_signals as unknown[]).map(String),
    },
    expected_tensions: (obj.expected_tensions as unknown[]).map(String),
    estimated_time_minutes: Math.round(time),
  };
}

function getLanguageInstruction(locale: string): string {
  const normalizedLocale = ['en', 'it', 'es'].includes(locale) ? locale : 'en';
  const targetLanguage = LANGUAGE_NAMES[normalizedLocale];
  return `Write ALL text values in ${targetLanguage}. JSON keys remain English.`;
}

// =====================================================
// Main handler
// =====================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = req.headers.get('x-correlation-id') || generateCorrelationId();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return unauthorizedResponse();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return unauthorizedResponse('Authentication failed');

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const hasBusiness = roles?.some(r => r.role === 'business');
    const hasAdmin = roles?.some(r => r.role === 'admin');
    if (!hasBusiness && !hasAdmin) return forbiddenResponse('Business role required to generate challenges');

    const body: GenerateChallengeRequest = await req.json();

    // Legacy mode support
    if (body.mode !== 'xima_core' && body.task_description) {
      return await handleLegacyGeneration(body, user.id, correlationId);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch company context from DB
    const businessId = body.business_id || user.id;
    const [companyProfileRes, businessProfileRes, userProfileRes] = await Promise.all([
      supabaseAdmin.from('company_profiles').select('summary, summary_override, operating_style, operating_style_override, communication_style, communication_style_override, pillar_vector, ideal_ximatar_profile_ids, values, values_override, company_culture, culture_insights, industry_focus').eq('company_id', businessId).maybeSingle(),
      supabaseAdmin.from('business_profiles').select('company_name, snapshot_industry, manual_industry, company_size, team_culture, hiring_approach, growth_stage, metadata, strategic_focus').eq('user_id', businessId).maybeSingle(),
      supabaseAdmin.from('profiles').select('preferred_lang, content_language').eq('user_id', user.id).maybeSingle(),
    ]);

    const companyProfile = companyProfileRes.data;
    const businessProfile = businessProfileRes.data;
    const profileLocale = String(userProfileRes.data?.preferred_lang || userProfileRes.data?.content_language || '').split('-')[0];
    const requestedLocale = String(body.locale || '').split('-')[0];
    const locale = ['en', 'it', 'es'].includes(requestedLocale) ? requestedLocale : ['en', 'it', 'es'].includes(profileLocale) ? profileLocale : 'en';

    let goal: any = null;
    if (body.hiring_goal_id) {
      const { data } = await supabaseAdmin
        .from('hiring_goal_drafts')
        .select('id, role_title, task_description, experience_level, function_area, work_model, country, required_skills, nice_to_have_skills')
        .eq('id', body.hiring_goal_id)
        .eq('business_id', businessId)
        .maybeSingle();
      goal = data;
    }

    const rawIndustry = businessProfile?.manual_industry || businessProfile?.snapshot_industry || companyProfile?.industry_focus || body.context?.companyIndustry || 'Business context';
    const industry = rawIndustry;
    const industryLabels: Record<string, string> = {
      'real_estate': 'Edilizia / Immobiliare',
      'construction': 'Edilizia',
      'technology': 'Tecnologia',
      'tech': 'Tecnologia',
      'software': 'Software / IT',
      'automotive': 'Automotive',
      'healthcare': 'Sanità',
      'health': 'Sanità',
      'finance': 'Finanza',
      'financial_services': 'Servizi Finanziari',
      'consulting': 'Consulenza',
      'manufacturing': 'Manifatturiero',
      'energy': 'Energia',
      'retail': 'Commercio',
      'education': 'Istruzione',
      'logistics': 'Logistica / Trasporti',
      'food': 'Alimentare',
      'pharma': 'Farmaceutico',
      'pharmaceutical': 'Farmaceutico',
      'media': 'Media',
      'hospitality': 'Hospitality / Turismo',
      'legal': 'Legale',
      'agriculture': 'Agricoltura',
      'telecom': 'Telecomunicazioni',
      'insurance': 'Assicurazioni',
      'nonprofit': 'No Profit',
    };
    const displayIndustry = industryLabels[String(rawIndustry).toLowerCase()] || rawIndustry;
    const roleTitle = String(goal?.role_title || body.context?.roleTitle || 'Professional role');
    const contextTag = `${roleTitle} · ${displayIndustry}`;
    const contextPayload = {
      company_name: businessProfile?.company_name || null,
      industry,
      company_size: businessProfile?.company_size || null,
      team_culture: businessProfile?.team_culture || companyProfile?.company_culture || null,
      hiring_approach: businessProfile?.hiring_approach || null,
      growth_stage: businessProfile?.growth_stage || null,
      dna_pillars: companyProfile?.pillar_vector || null,
      strategic_focus: businessProfile?.strategic_focus || null,
      company_summary: companyProfile?.summary_override || companyProfile?.summary || null,
      core_values: companyProfile?.values_override || companyProfile?.values || null,
      operating_style: companyProfile?.operating_style_override || companyProfile?.operating_style || body.context?.decisionStyle || null,
      communication_style: companyProfile?.communication_style_override || companyProfile?.communication_style || null,
      culture_insights: companyProfile?.culture_insights || null,
      role_title: roleTitle,
      task_description: goal?.task_description || body.context?.taskDescription || null,
      function_area: goal?.function_area || body.context?.functionArea || null,
      experience_level: goal?.experience_level || body.context?.experienceLevel || null,
      required_skills: goal?.required_skills || null,
      nice_to_have_skills: goal?.nice_to_have_skills || null,
      work_model: goal?.work_model || null,
      country: goal?.country || null,
      preferred_language: locale,
      context_tag: contextTag,
      generated_at: new Date().toISOString(),
    };
    const langInstruction = getLanguageInstruction(locale);

    // Per-locale strings for the prompt itself.
    const promptLang = locale === 'it' ? 'Italiano' : locale === 'es' ? 'Español' : 'English';
    const companyName = businessProfile?.company_name || 'Non specificato';
    const teamCulture = (businessProfile?.team_culture || companyProfile?.company_culture || 'Non specificato') as string;
    const operatingStyle = (companyProfile?.operating_style_override || companyProfile?.operating_style || body.context?.decisionStyle || 'Non specificato') as string;
    const coreValuesRaw = companyProfile?.values_override || companyProfile?.values;
    const coreValues = Array.isArray(coreValuesRaw) ? (coreValuesRaw as unknown[]).map(String).join(', ') : (typeof coreValuesRaw === 'string' ? coreValuesRaw : 'Non specificato');
    const taskDescription = goal?.task_description || body.context?.taskDescription || 'Non specificato';
    const requiredSkillsRaw = goal?.required_skills;
    const requiredSkills = Array.isArray(requiredSkillsRaw) ? (requiredSkillsRaw as unknown[]).map(String).join(', ') : 'Non specificato';
    const experienceLevel = goal?.experience_level || body.context?.experienceLevel || 'Non specificato';
    const workModel = goal?.work_model || 'Non specificato';

    // Diagnostic log of context being sent to Claude (no PII beyond company name).
    console.log('[generate-challenge] Context being sent to Claude:', JSON.stringify({
      companyName,
      industry,
      roleTitle,
      taskDescription: typeof taskDescription === 'string' ? taskDescription.substring(0, 100) : null,
      requiredSkillsCount: Array.isArray(requiredSkillsRaw) ? requiredSkillsRaw.length : 0,
      locale,
      hasCompanyContext: !!(companyProfile || businessProfile),
      hasRoleContext: !!goal,
    }, null, 2));

    const systemPrompt = `Sei l'architetto delle XIMA Challenge. Crea scenari realistici per valutazioni comportamentali.

REGOLA FONDAMENTALE: Lo scenario DEVE descrivere una situazione CONCRETA e SPECIFICA per il settore e il ruolo indicati. MAI scrivere scenari generici "da ufficio". Il candidato deve riconoscere il proprio mondo lavorativo leggendo lo scenario.

ESEMPI DI SCENARI ECCELLENTI (il tuo output deve avere questo livello di specificità):

ESEMPIO 1 — Capocantiere, settore edile:
"Arrivi in cantiere lunedì mattina e trovi il ponteggio del fronte sud parzialmente smontato: il subappaltatore ha ritirato tre operai dopo una disputa sul compenso delle ore extra. Il direttore lavori ti chiama per informarti che l'ispezione ASL è stata anticipata a giovedì. Il progettista strutturale segnala via email che i carichi sul solaio del terzo piano superano i limiti previsti dal calcolo originale e chiede una verifica immediata. Hai quattro operai disponibili, di cui uno al primo cantiere. Il committente ha già minacciato penali per ogni giorno di ritardo oltre la data contrattuale."

ESEMPIO 2 — Lead Engineer, settore automotive:
"Il tuo team di sei ingegneri sta sviluppando il firmware per un nuovo modulo di gestione batteria. A tre settimane dalla milestone di validazione, il fornitore del BMS comunica che il protocollo CAN è stato aggiornato e non è retrocompatibile. Il cliente OEM vuole mantenere la data di consegna. Due dei tuoi ingegneri senior sono impegnati su un altro progetto critico. Il test di sicurezza funzionale ISO 26262 richiede documentazione aggiornata che nessuno ha ancora iniziato. Il tuo responsabile ti chiede un piano d'azione entro domani."

ESEMPIO 3 — Responsabile HR, settore consulenza:
"Stai gestendo il processo di selezione per una posizione senior che il partner ha definito urgente. Dopo due mesi hai tre finalisti, ma il partner cambia idea sui requisiti e vuole qualcuno con esperienza internazionale — nessuno dei tre ce l'ha. Un candidato ti scrive dicendo di aver ricevuto un'offerta da un concorrente e ti dà 48 ore per rispondere. Il budget per la posizione è stato tagliato del 15% rispetto all'offerta inizialmente approvata. La hiring manager insiste che vuole incontrare almeno altri due candidati prima di decidere."

NOTA: questi sono ESEMPI dello stile. Il TUO scenario deve essere completamente diverso, inventato da zero per il contesto specifico sotto.

CONTESTO AZIENDA:
- Nome: ${companyName}
- Settore: ${displayIndustry}
- Cultura: ${teamCulture}
- Stile operativo: ${operatingStyle}
- Valori: ${coreValues}

RUOLO DA ASSUMERE:
- Titolo: ${roleTitle}
- Descrizione: ${taskDescription}
- Competenze richieste: ${requiredSkills}
- Livello: ${experienceLevel}
- Modalità: ${workModel}

ISTRUZIONI:
1. Scrivi UNO scenario di 80-150 parole SPECIFICO per il ruolo e settore sopra.
2. Includi: nomi di oggetti, strumenti, normative, situazioni REALI del settore.
3. Includi: almeno 2 attori specifici (colleghi, fornitori, clienti, ispettori) con ruoli concreti.
4. Includi: almeno 1 vincolo tecnico specifico del settore.
5. Includi: pressione temporale concreta (una scadenza specifica, non generica).
6. NON usare frasi generiche come "un progetto importante", "stakeholder esterni", "risorse limitate".
7. Lingua: ${promptLang}. ${langInstruction}
8. NON includere domande.
9. NON rivelare il nome dell'azienda.

Restituisci SOLO JSON valido:
{
  "scenario": "testo dello scenario specifico per il ruolo",
  "business_type": "etichetta breve settore",
  "context_tag": "${roleTitle} · ${displayIndustry}",
  "context_snapshot": {},
  "evaluation_lens": {
    "drive_signals": ["segnale1", "segnale2"],
    "computational_power_signals": ["segnale1", "segnale2"],
    "communication_signals": ["segnale1", "segnale2"],
    "creativity_signals": ["segnale1", "segnale2"],
    "knowledge_signals": ["segnale1", "segnale2"]
  },
  "expected_tensions": ["tensione1", "tensione2"],
  "estimated_time_minutes": 40
}`;

    const userPrompt = `Genera uno scenario L1 per il ruolo di "${roleTitle}" nel settore "${displayIndustry}". Lo scenario DEVE contenere riferimenti concreti a strumenti, normative, situazioni e attori tipici di questo specifico settore — come negli esempi sopra. Rispondi SOLO con il JSON.`;

    // ---- Intelligence Engine: check challenge pattern library first (FREE) ----
    const targetPillar = companyProfile?.pillar_vector
      ? Object.entries(companyProfile.pillar_vector as Record<string, number>).sort((a, b) => b[1] - a[1])[0]?.[0]
      : undefined;
    try {
      if (typeof checkDatabaseFirst === "function" && !body.hiring_goal_id) {
        const dbDecision = await checkDatabaseFirst("challenge", undefined, targetPillar);
        if (dbDecision.source === "database") {
          const validated = validateXimaCoreResult(dbDecision.data);
          if (validated) {
            console.log(`[intelligence] Challenge served from pattern library (confidence: ${dbDecision.confidence})`);

            if (body.challenge_id) {
              const supabaseAdmin2 = createClient(supabaseUrl, supabaseServiceKey);
              await supabaseAdmin2.from("business_challenges").update({
                evaluation_lens: validated.evaluation_lens,
                expected_tensions: validated.expected_tensions,
                context_snapshot: validated.context_snapshot,
              }).eq("id", body.challenge_id);
            }

            return jsonResponse({ ...validated, used_fallback: false, _intelligence: { source: "database", confidence: dbDecision.confidence } });
          }
        }
      }
    } catch (e) {
      console.warn("[generate-challenge] Pattern check failed:", e instanceof Error ? e.message : e);
    }

    try {
      const aiResp = await callAnthropicApi({
        system: systemPrompt,
        userMessage: userPrompt,
        correlationId,
        functionName: 'generate-challenge',
        inputSummary: `l1_gen:locale=${locale},has_company=${!!companyProfile},has_goal=${!!body.hiring_goal_id}`,
        temperature: 0.8,
        maxTokens: 2048,
      });

      const jsonStr = extractJsonFromAiContent(aiResp.content);
      const parsed = JSON.parse(jsonStr);

      // QUALITY CHECK: detect when the model echoed the prompt template instead of generating actual content.
      const META_MARKERS = [
        'realistic role-specific',
        'A realistic',
        'IL TESTO DELLO SCENARIO',
        'una narrazione concreta di 80-150',
        'NON una descrizione generica',
        'competing priorities, incomplete information, stakeholder pressure',
      ];
      const FALLBACK_MARKERS = [
        'Sei appena entrato in un nuovo ruolo',
        'You have just stepped into a new role',
        'You just started a new role',
        'Acabas de incorporarte',
        'Acabas de empezar',
      ];
      const looksLikeMeta = typeof parsed?.scenario === 'string' && (
        parsed.scenario.length < 80 ||
        META_MARKERS.some((m) => parsed.scenario.includes(m))
      );
      if (looksLikeMeta) {
        console.error('[generate-challenge] QUALITY CHECK FAILED: scenario appears to be meta-description, not actual narrative content. Falling back.', JSON.stringify({
          correlationId,
          scenarioPreview: String(parsed.scenario).slice(0, 200),
        }));
        const fallback = buildFallbackResponse(locale, contextTag);
        return jsonResponse({ ...fallback, used_fallback: true, is_fallback: true, fallback_reason: 'meta_description_detected' });
      }
      const isFallbackEcho = typeof parsed?.scenario === 'string' &&
        FALLBACK_MARKERS.some((m) => parsed.scenario.includes(m));
      if (isFallbackEcho) {
        console.warn('[generate-challenge] Fallback-pattern scenario detected — AI may not have used full context', JSON.stringify({
          correlationId,
          scenarioPreview: String(parsed.scenario).slice(0, 200),
        }));
        parsed.is_fallback = true;
      }

      const validated = validateXimaCoreResult(parsed);

      if (!validated) {
        console.log(JSON.stringify({ type: 'validation_fallback', correlation_id: correlationId, function_name: 'generate-challenge' }));
        const fallback = buildFallbackResponse(locale, contextTag);
        return jsonResponse({ ...fallback, used_fallback: true });
      }

      // Store evaluation_lens on the challenge
      if (body.challenge_id) {
        await supabaseAdmin.from('business_challenges').update({
          evaluation_lens: validated.evaluation_lens,
          expected_tensions: validated.expected_tensions,
          context_snapshot: validated.context_snapshot,
        }).eq('id', body.challenge_id);
      }

      // Deposit into intelligence engine
      try {
        if (typeof depositInference === "function") {
          await depositInference(user.id, "generate-challenge", validated, {
            patternType: "challenge",
            targetPillar: targetPillar || undefined,
          });
        }
      } catch (e) { console.warn("[generate-challenge] Deposit failed:", e instanceof Error ? e.message : e); }

      // Audit
      emitAuditEventWithMetric({
        actorType: "business",
        actorId: user.id,
        action: "challenge.l1_generated",
        entityType: "business_challenge",
        entityId: body.hiring_goal_id || null,
        correlationId,
        metadata: { business_type: validated.business_type, locale, used_fallback: false },
      }, "l1_challenges_generated");

      return jsonResponse({ ...validated, used_fallback: false, is_fallback: !!parsed.is_fallback });

    } catch (e) {
      if (e instanceof AnthropicError) {
        if (e.statusCode === 429) return errorResponse(429, 'RATE_LIMITED', e.message);
      }
      console.error(JSON.stringify({ type: 'ai_fallback', correlation_id: correlationId, function_name: 'generate-challenge', error: e instanceof Error ? e.message : 'Unknown' }));
      const fallback = buildFallbackResponse(locale, contextTag);
      return jsonResponse({ ...fallback, used_fallback: true, is_fallback: true });
    }

  } catch (err) {
    console.error(JSON.stringify({ type: 'unhandled_error', correlation_id: correlationId, function_name: 'generate-challenge', error: err instanceof Error ? err.message : 'Unknown error' }));
    return errorResponse(500, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error');
  }
});

// =====================================================
// Fallback
// =====================================================

function buildFallbackResponse(locale: string = 'en', contextTag: string = 'Professional role · Business context'): XimaCoreResult {
  const scenario = XIMA_CORE_FALLBACK_SCENARIOS[locale] || XIMA_CORE_FALLBACK_SCENARIOS.en;
  return {
    scenario,
    business_type: 'Role-specific business context',
    context_tag: contextTag,
    context_snapshot: {},
    evaluation_lens: DEFAULT_EVALUATION_LENS,
    expected_tensions: [
      "Speed vs. quality under deadline pressure",
      "Individual initiative vs. team alignment without authority"
    ],
    estimated_time_minutes: 40,
  };
}

// =====================================================
// Legacy handler (backward compatibility)
// =====================================================

async function handleLegacyGeneration(body: GenerateChallengeRequest, userId: string, correlationId: string): Promise<Response> {
  const { task_description, role_title, experience_level, work_model, country, locale = 'en' } = body;
  if (!task_description) return errorResponse(400, 'INVALID_INPUT', 'task_description is required');

  const contextParts = [
    `Task Description: ${task_description}`,
    role_title ? `Role: ${role_title}` : '',
    experience_level ? `Experience Level: ${experience_level}` : '',
    work_model ? `Work Model: ${work_model}` : '',
    country ? `Location: ${country}` : '',
  ].filter(Boolean).join('\n');

  const langName = LANGUAGE_NAMES[locale] || 'English';

  try {
    const aiResp = await callAnthropicApi({
      system: `You are an expert HR professional creating hiring challenges. Generate a practical, skills-based challenge. Keep the tone professional. Respond in ${langName}. JSON keys in English, values in ${langName}.`,
      userMessage: `Based on this hiring context:\n${contextParts}\n\nGenerate a hiring challenge. Return ONLY JSON:\n{"title_suggestion":"string","candidate_facing_description":"string","success_criteria":["string","string","string"],"time_estimate_minutes":number}`,
      correlationId,
      functionName: 'generate-challenge',
      temperature: 0.7,
      maxTokens: 1024,
    });

    const jsonStr = extractJsonFromAiContent(aiResp.content);
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed?.title_suggestion === 'string' && Array.isArray(parsed?.success_criteria)) {
      return jsonResponse(parsed);
    }
  } catch { /* fall through to fallback */ }

  return jsonResponse({
    title_suggestion: `${role_title || 'Skills'} Challenge`,
    candidate_facing_description: task_description || '',
    success_criteria: ['Clear and structured response', 'Demonstrates relevant skills', 'Realistic approach'],
    time_estimate_minutes: 45,
    used_fallback: true,
  });
}
