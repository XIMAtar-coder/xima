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
  const normalizedLocale = ['en', 'it', 'es'].includes(locale) ? locale : 'it';
  const targetLanguage = LANGUAGE_NAMES[normalizedLocale];
  return `Write ALL text values in ${targetLanguage}. JSON keys remain English.`;
}

// =====================================================
// Mindset block validation (additive)
// =====================================================

const CANONICAL_GESTURES = [
  { id: 'jump', emoji: '🏃' },
  { id: 'delegate', emoji: '🤝' },
  { id: 'wait', emoji: '⏳' },
  { id: 'smooth', emoji: '🕊️' },
];

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateMindsetBlock(parsed: unknown): Record<string, unknown> | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as Record<string, any>;
  if (p.experience !== 'mindset') return null;

  // instinct_cards: exactly 3
  if (!Array.isArray(p.instinct_cards) || p.instinct_cards.length !== 3) return null;
  const cards = p.instinct_cards.map((c: any, i: number) => {
    if (!c || typeof c !== 'object') return null;
    if (!nonEmptyString(c.prompt)) return null;
    const a = c.a, b = c.b;
    if (!a || !b || !nonEmptyString(a.label) || !nonEmptyString(a.facet) || !nonEmptyString(b.label) || !nonEmptyString(b.facet)) return null;
    return {
      id: `c${i + 1}`,
      prompt: String(c.prompt).trim(),
      a: { label: String(a.label).trim(), facet: String(a.facet).trim() },
      b: { label: String(b.label).trim(), facet: String(b.facet).trim() },
    };
  });
  if (cards.some((c: any) => c === null)) return null;

  // day
  const day = p.day;
  if (!day || typeof day !== 'object') return null;
  if (!nonEmptyString(day.clock) || !nonEmptyString(day.title)) return null;

  // gestures: backfill canonical ids/emojis from model output by index
  if (!Array.isArray(day.gestures) || day.gestures.length !== 4) return null;
  const gestures = CANONICAL_GESTURES.map((canon, i) => {
    const g = day.gestures[i];
    if (!g || !nonEmptyString(g.label)) return null;
    return { id: canon.id, emoji: canon.emoji, label: String(g.label).trim() };
  });
  if (gestures.some((g) => g === null)) return null;

  // items: exactly 4
  if (!Array.isArray(day.items) || day.items.length !== 4) return null;
  const items = day.items.map((it: any, i: number) => {
    if (!it || typeof it !== 'object') return null;
    if (!nonEmptyString(it.source) || !nonEmptyString(it.body)) return null;
    if (String(it.body).trim().length < 40) return null;
    return { id: `d${i + 1}`, source: String(it.source).trim(), body: String(it.body).trim() };
  });
  if (items.some((it: any) => it === null)) return null;

  // guide
  const guide = p.guide;
  if (!guide || typeof guide !== 'object') return null;
  if (!nonEmptyString(guide.intro) || !nonEmptyString(guide.debrief_instruction) || !nonEmptyString(guide.resolve_line)) return null;
  const itemIds = items.map((it: any) => it.id);
  const debriefFocus = nonEmptyString(guide.debrief_focus) && itemIds.includes(guide.debrief_focus) ? guide.debrief_focus : 'd1';

  return {
    experience: 'mindset',
    instinct_cards: cards,
    day: { clock: String(day.clock).trim(), title: String(day.title).trim(), gestures, items },
    guide: {
      name: nonEmptyString(guide.name) ? String(guide.name).trim() : 'Aria',
      intro: String(guide.intro).trim(),
      debrief_focus: debriefFocus,
      debrief_instruction: String(guide.debrief_instruction).trim(),
      resolve_line: String(guide.resolve_line).trim(),
    },
  };
}

interface MindsetContextInput {
  scenario: string;
  roleTitle: string;
  displayIndustry: string;
  companyName: string;
  teamCulture: string;
  operatingStyle: string;
  coreValues: string;
  taskDescription: string;
  requiredSkills: string;
  experienceLevel: string;
  workModel: string;
  promptLang: string;
  langInstruction: string;
  locale: string;
  correlationId: string;
}

async function generateMindsetBlock(ctx: MindsetContextInput): Promise<Record<string, unknown> | null> {
  const systemPrompt = `Sei "Aria", una guida calda e non giudicante. Devi creare il contenuto MINDSET per un candidato che affronterà il ruolo qui sotto, NELLO STESSO MONDO dello scenario L1.

Lo scenario L1 (per ancorare tono, attori, strumenti, vincoli):
<<< ${ctx.scenario} >>>

CONTESTO RUOLO: ${ctx.roleTitle} — ${ctx.displayIndustry}
Azienda: ${ctx.companyName} · Cultura: ${ctx.teamCulture} · Stile: ${ctx.operatingStyle}
Valori: ${ctx.coreValues}
Mansione: ${ctx.taskDescription}
Competenze: ${ctx.requiredSkills} · Livello: ${ctx.experienceLevel} · Modalità: ${ctx.workModel}

REGOLE FONDAMENTALI:
- TUTTO il contenuto deve essere SPECIFICO per questo ruolo e settore. MAI generico da ufficio. Esempio: per un Geometra in cantiere il lunedì è un VERO cantiere (ponteggi, DL, ASL, fornitori, betoniere, verbale, computo metrico), non una riunione in open space. Per un Lead Engineer automotive il lunedì parla di BMS, CAN, OEM, ISO 26262.
- 3 instinct_cards: dilemmi di pancia, due opzioni brevi e tangibili nel mondo del ruolo.
- Le "facet" sono etichette UMANE e CORTE (2–4 parole), es. "Propensione all'azione", "Prudente, basso rischio", "Decide d'istinto", "Cerca consenso", "Focus sul risultato", "Focus sulle persone", "Pragmatico", "Visione lunga". Mai sigle psicometriche, mai numeri.
- day.clock: orario di inizio plausibile per il ruolo ("7:30" cantiere, "8:45" ufficio, "6:00" reparto produttivo…).
- day.title: il giorno (es. "Lunedì in cantiere", "Lunedì in reparto", "Lunedì al desk").
- 4 day.items: dilemmi REALI del lunedì del ruolo, con attori e oggetti concreti (fornitore X, ispettore Y, email del DL, sample QA scartato, sprint planning, etc.). source = chi/cosa porta l'evento ("DL", "WhatsApp capo squadra", "Email cliente", "Slack #qa"). body = 1–3 frasi descrittive, niente domande, almeno 40 caratteri.
- 4 gesture FISSI in ordine: ids "jump"/"delegate"/"wait"/"smooth", emoji "🏃"/"🤝"/"⏳"/"🕊️", label localizzata e calda (es. "Ci salto dentro", "Delego e seguo", "Aspetto e osservo", "Smusso e medio").
- guide.intro: 1–2 frasi calde, niente giudizio. guide.debrief_focus = "d1". guide.debrief_instruction: calda, mai punitiva, invita a raccontare il perché. guide.resolve_line: 1 frase che riconosce lo stile senza dare un voto.
- Lingua: ${ctx.promptLang}. ${ctx.langInstruction}. JSON keys in inglese.

Restituisci SOLO JSON valido con ESATTAMENTE questa forma (nessun commento, nessun testo extra):
{
  "experience": "mindset",
  "instinct_cards": [
    {"id":"c1","prompt":"…","a":{"label":"…","facet":"…"},"b":{"label":"…","facet":"…"}},
    {"id":"c2","prompt":"…","a":{"label":"…","facet":"…"},"b":{"label":"…","facet":"…"}},
    {"id":"c3","prompt":"…","a":{"label":"…","facet":"…"},"b":{"label":"…","facet":"…"}}
  ],
  "day": {
    "clock":"…","title":"…",
    "gestures":[
      {"id":"jump","emoji":"🏃","label":"…"},
      {"id":"delegate","emoji":"🤝","label":"…"},
      {"id":"wait","emoji":"⏳","label":"…"},
      {"id":"smooth","emoji":"🕊️","label":"…"}
    ],
    "items":[
      {"id":"d1","source":"…","body":"…"},
      {"id":"d2","source":"…","body":"…"},
      {"id":"d3","source":"…","body":"…"},
      {"id":"d4","source":"…","body":"…"}
    ]
  },
  "guide":{"name":"Aria","intro":"…","debrief_focus":"d1","debrief_instruction":"…","resolve_line":"…"}
}`;

  const userPrompt = `Genera il blocco MINDSET per "${ctx.roleTitle}" (${ctx.displayIndustry}), ancorato allo scenario sopra. Rispondi SOLO con il JSON.`;

  try {
    const model = getModelForFunction('generate-challenge');
    const resp = await callAnthropicApi({
      system: systemPrompt,
      userMessage: userPrompt,
      correlationId: ctx.correlationId,
      functionName: 'generate-challenge',
      model,
      inputSummary: `l1_mindset_gen:locale=${ctx.locale},role=${ctx.roleTitle.slice(0, 40)}`,
      temperature: 0.85,
      maxTokens: 1800,
    });
    const jsonStr = extractJsonFromAiContent(resp.content);
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    const validated = validateMindsetBlock(parsed);
    if (!validated) {
      console.warn('[generate-challenge] mindset block failed validation', JSON.stringify({
        correlation_id: ctx.correlationId,
        preview: typeof parsed === 'object' ? JSON.stringify(parsed).slice(0, 200) : String(parsed).slice(0, 200),
      }));
      return null;
    }
    return validated;
  } catch (e) {
    console.warn('[generate-challenge] mindset generation failed (non-blocking):', e instanceof Error ? e.message : String(e));
    return null;
  }
}

// =====================================================
// PART 5 — Blind-scope sanitizer.
// Strips company name / known aliases / third-party names from candidate-facing strings.
// Business-side payloads keep the unredacted scenario.
// =====================================================
function buildBlindSanitizer(forbiddenTerms: string[]): (s: string) => string {
  const cleaned = Array.from(new Set(
    forbiddenTerms
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t) => t.length >= 3),
  ));
  if (cleaned.length === 0) return (s) => s;
  // Sort by length desc so longer matches win.
  cleaned.sort((a, b) => b.length - a.length);
  const escaped = cleaned.map((t) => t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
  const re = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
  return (s) => (typeof s === 'string' ? s.replace(re, "un'azienda del settore") : s);
}

function sanitizeMindsetBlock(mindset: Record<string, unknown> | null, scrub: (s: string) => string, correlationId: string): Record<string, unknown> | null {
  if (!mindset) return mindset;
  let hits = 0;
  const count = (orig: string, next: string) => { if (orig !== next) hits++; return next; };
  const m: any = JSON.parse(JSON.stringify(mindset));
  if (m.guide) {
    if (typeof m.guide.intro === 'string') m.guide.intro = count(m.guide.intro, scrub(m.guide.intro));
    if (typeof m.guide.debrief_instruction === 'string') m.guide.debrief_instruction = count(m.guide.debrief_instruction, scrub(m.guide.debrief_instruction));
    if (typeof m.guide.resolve_line === 'string') m.guide.resolve_line = count(m.guide.resolve_line, scrub(m.guide.resolve_line));
  }
  if (Array.isArray(m.instinct_cards)) {
    for (const c of m.instinct_cards) {
      if (typeof c.prompt === 'string') c.prompt = count(c.prompt, scrub(c.prompt));
    }
  }
  if (m.day) {
    if (typeof m.day.title === 'string') m.day.title = count(m.day.title, scrub(m.day.title));
    if (Array.isArray(m.day.items)) {
      for (const it of m.day.items) {
        if (typeof it.body === 'string') it.body = count(it.body, scrub(it.body));
        if (typeof it.source === 'string') it.source = count(it.source, scrub(it.source));
      }
    }
  }
  if (hits > 0) {
    console.warn('[generate-challenge] blind-scope sanitizer redacted candidate-facing strings', JSON.stringify({ correlation_id: correlationId, hits }));
  }
  return m;
}

function buildIntroContext(args: {
  displayIndustry: string;
  companySize?: string | null;
  growthStage?: string | null;
  roleTitle: string;
  taskDescription: string;
  ralMin: number | null;
  ralMax: number | null;
  ccnl: string | null;
  currency: string;
}): Record<string, unknown> {
  const sizeLabel = args.companySize ? `, ${args.companySize}` : '';
  const stageLabel = args.growthStage ? `, in fase di ${args.growthStage}` : '';
  const desc = `Un'azienda del settore ${args.displayIndustry}${sizeLabel}${stageLabel}.`;
  const summary = (args.taskDescription && args.taskDescription !== 'Non specificato')
    ? args.taskDescription.slice(0, 240)
    : '';
  return {
    company_descriptor: desc,
    role_title: args.roleTitle || null,
    role_summary: summary || null,
    compensation: {
      ral_min: args.ralMin,
      ral_max: args.ralMax,
      ccnl: args.ccnl,
      currency: args.currency || 'EUR',
    },
    growth_line:
      'Completare questa sfida rafforza il tuo XIMAtar e rende il tuo profilo più rilevante per le aziende.',
  };
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
    const locale = ['en', 'it', 'es'].includes(requestedLocale) ? requestedLocale : ['en', 'it', 'es'].includes(profileLocale) ? profileLocale : 'it';

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
    const roleTitle = String(goal?.role_title || body.context?.roleTitle || '').trim();
    const contextTagParts = [roleTitle, displayIndustry].filter(p => p && String(p).trim().length > 0);
    const contextTag = contextTagParts.length > 0 ? contextTagParts.join(' · ') : (businessProfile?.company_name || '');
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

            const mindset = await generateMindsetBlock({
              scenario: validated.scenario,
              roleTitle, displayIndustry, companyName,
              teamCulture, operatingStyle, coreValues,
              taskDescription: typeof taskDescription === 'string' ? taskDescription : String(taskDescription ?? ''),
              requiredSkills, experienceLevel, workModel,
              promptLang, langInstruction, locale, correlationId,
            });
            return jsonResponse({ ...validated, context_tag: contextTag || validated.context_tag, used_fallback: false, _intelligence: { source: "database", confidence: dbDecision.confidence }, mindset });
          }
        }
      }
    } catch (e) {
      console.warn("[generate-challenge] Pattern check failed:", e instanceof Error ? e.message : e);
    }

    try {
      const model = getModelForFunction('generate-challenge');
      console.log('[generate-challenge] ABOUT TO CALL CLAUDE with model:', model);
      console.log('[generate-challenge] System prompt first 200 chars:', systemPrompt.substring(0, 200));
      console.log('[generate-challenge] Company context:', companyName, industry, roleTitle);

      const aiResp = await callAnthropicApi({
        system: systemPrompt,
        userMessage: userPrompt,
        correlationId,
        functionName: 'generate-challenge',
        model,
        inputSummary: `l1_gen:locale=${locale},has_company=${!!companyProfile},has_goal=${!!body.hiring_goal_id}`,
        temperature: 0.8,
        maxTokens: 2048,
      });

      const jsonStr = extractJsonFromAiContent(aiResp.content);
      const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;

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
        'prima settimana scopri che un progetto importante',
        'important project is behind schedule',
        'important initiative. The goal is clear',
        'proyecto importante va retrasado',
        'stakeholders have different expectations',
      ];
      const looksLikeMeta = typeof parsed?.scenario === 'string' && (
        parsed.scenario.length < 80 ||
        META_MARKERS.some((m) => parsed.scenario.includes(m))
      );
      if (looksLikeMeta) {
        console.error('[generate-challenge] QUALITY CHECK FAILED: scenario appears to be meta-description, not actual narrative content.', JSON.stringify({
          correlationId,
          scenarioPreview: String(parsed.scenario).slice(0, 200),
        }));
        return errorResponse(422, 'SCENARIO_QUALITY_FAILED', 'Generated scenario was too generic. Please regenerate.', { correlation_id: correlationId });
      }
      const isFallbackEcho = typeof parsed?.scenario === 'string' &&
        FALLBACK_MARKERS.some((m) => parsed.scenario.includes(m));
      if (isFallbackEcho) {
        console.error('[generate-challenge] Fallback-pattern scenario detected — AI may not have used full context', JSON.stringify({
          correlationId,
          scenarioPreview: String(parsed.scenario).slice(0, 200),
        }));
        return errorResponse(422, 'SCENARIO_FALLBACK_PATTERN', 'Generated scenario matched a generic fallback pattern. Please regenerate.', { correlation_id: correlationId });
      }

      const validated = validateXimaCoreResult(parsed);

      if (!validated) {
        console.error(JSON.stringify({
          type: 'validation_failed',
          correlation_id: correlationId,
          function_name: 'generate-challenge',
          parsed_preview: typeof parsed?.scenario === 'string' ? parsed.scenario.slice(0, 200) : String(parsed).slice(0, 200),
        }));
        return errorResponse(422, 'INVALID_AI_RESPONSE', 'Generated scenario response was invalid. Please regenerate.', { correlation_id: correlationId });
      }

      const responseIsFallback = !!parsed.is_fallback;
      console.log('[generate-challenge] Claude response received, scenario first 100 chars:', validated.scenario?.substring(0, 100));
      console.log('[generate-challenge] Is fallback?', responseIsFallback);

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

      const mindset = await generateMindsetBlock({
        scenario: validated.scenario,
        roleTitle, displayIndustry, companyName,
        teamCulture, operatingStyle, coreValues,
        taskDescription: typeof taskDescription === 'string' ? taskDescription : String(taskDescription ?? ''),
        requiredSkills, experienceLevel, workModel,
        promptLang, langInstruction, locale, correlationId,
      });

      return jsonResponse({ ...validated, context_tag: contextTag || validated.context_tag, used_fallback: false, is_fallback: responseIsFallback, mindset });

    } catch (e) {
      if (e instanceof AnthropicError) {
        if (e.statusCode === 429) return errorResponse(429, 'RATE_LIMITED', e.message);
      }
      console.error('[generate-challenge] Claude generation failed:', e);
      console.error(JSON.stringify({
        type: 'ai_generation_failed',
        correlation_id: correlationId,
        function_name: 'generate-challenge',
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      }));
      return errorResponse(502, 'AI_GENERATION_FAILED', 'Scenario generation failed. Please retry.', { correlation_id: correlationId });
    }

  } catch (err) {
    console.error(JSON.stringify({ type: 'unhandled_error', correlation_id: correlationId, function_name: 'generate-challenge', error: err instanceof Error ? err.message : 'Unknown error' }));
    return errorResponse(500, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error');
  }
});

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
