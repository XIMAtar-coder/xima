#!/usr/bin/env npx tsx
/**
 * renderReviewerPack.ts
 * 
 * Build-time renderer for the XIMA External Psychometric Reviewer Pack v1.2.1.
 * Reads the i18n item bank and generates a fully self-contained HTML file.
 * 
 * Usage:  npx tsx scripts/renderReviewerPack.ts
 * Output: public/XIMA_External_Psychometric_Reviewer_Pack_v1.2.1.html
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ── Config ──────────────────────────────────────────────────────────────────
const FIELDS = ['science_tech', 'business_leadership', 'arts_creative', 'service_ops'] as const;
const LOCALES = ['en', 'it', 'es'] as const;
const LOCALE_LABELS: Record<string, string> = { en: 'English', it: 'Italiano', es: 'Español' };
const FIELD_LABELS: Record<string, string> = {
  science_tech: 'Science & Technology',
  business_leadership: 'Business & Leadership',
  // i18n key is "business_leadership" but source JSON says "business_leadership"
  arts_creative: 'Arts & Creative',
  service_ops: 'Service & Operations',
};
const PILLAR_CYCLE = ['computational_power', 'communication', 'knowledge', 'creativity', 'drive'];
const FREEZE_HASHES: Record<string, string> = { en: '11ffb15d', it: 'e7b14a09', es: 'd7d4491d' };
const MC_COUNT = 21;
const OPEN_COUNT = 2;
const OUTPUT_PATH = resolve(__dirname, '..', 'public', 'XIMA_External_Psychometric_Reviewer_Pack_v1.2.1.html');
const JSON_SOURCE_PATH = resolve(__dirname, '..', 'public', 'XIMA_External_Psychometric_Reviewer_Pack_v1.2.1_Source.json');

// ── Load locales ────────────────────────────────────────────────────────────
function loadLocale(locale: string): Record<string, any> {
  const path = resolve(__dirname, '..', 'src', 'i18n', 'locales', `${locale}.json`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// ── Escape HTML ─────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
  const locales: Record<string, any> = {};
  for (const l of LOCALES) {
    locales[l] = loadLocale(l);
  }

  let mcRendered = 0;
  let openRendered = 0;

  // Build item bank HTML
  const sections: string[] = [];

  for (const field of FIELDS) {
    sections.push(`<h2 id="field-${field}" style="page-break-before:always;margin-top:2em;border-bottom:3px solid #1a1a2e;padding-bottom:8px;">
      Field: ${esc(FIELD_LABELS[field])} <code style="font-size:0.7em;color:#888;">[${field}]</code>
    </h2>`);

    for (const locale of LOCALES) {
      const set = locales[locale].assessmentSets?.[field];
      if (!set) {
        sections.push(`<p style="color:red;">⚠ Missing assessmentSets.${field} in ${locale}.json</p>`);
        continue;
      }

      sections.push(`<h3 id="${field}-${locale}" style="margin-top:1.5em;color:#16213e;">
        ${LOCALE_LABELS[locale]} (${locale.toUpperCase()})
      </h3>`);

      const questions = set.questions || {};

      // MC items q1–q21
      for (let i = 1; i <= MC_COUNT; i++) {
        const key = `q${i}`;
        const q = questions[key];
        const pillar = PILLAR_CYCLE[(i - 1) % 5];
        if (!q) {
          sections.push(`<p style="color:red;">⚠ Missing ${key} in ${field}/${locale}</p>`);
          continue;
        }
        mcRendered++;
        const opts = (q.options || []) as string[];
        sections.push(`
          <div style="margin:12px 0;padding:12px 16px;border:1px solid #e0e0e0;border-radius:6px;background:#fafafa;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <strong>${key.toUpperCase()}</strong>
              <span style="font-size:0.8em;background:#e8eaf6;padding:2px 8px;border-radius:4px;">${esc(q.category || pillar)}</span>
            </div>
            <p style="margin:4px 0 8px;font-style:italic;">${esc(q.question)}</p>
            <ol type="A" style="margin:0;padding-left:24px;">
              ${opts.map(o => `<li style="margin:2px 0;">${esc(o)}</li>`).join('\n              ')}
            </ol>
          </div>
        `);
      }

      // Open items
      for (let i = 1; i <= OPEN_COUNT; i++) {
        const key = `open${i}`;
        const q = questions[key];
        if (!q) {
          sections.push(`<p style="color:red;">⚠ Missing ${key} in ${field}/${locale}</p>`);
          continue;
        }
        openRendered++;
        sections.push(`
          <div style="margin:12px 0;padding:12px 16px;border:1px solid #c8e6c9;border-radius:6px;background:#f1f8e9;">
            <strong>${key.toUpperCase()} — Open Response</strong>
            <p style="margin:4px 0;font-style:italic;">${esc(q.question)}</p>
          </div>
        `);
      }
    }
  }

  const totalRendered = mcRendered + openRendered;
  const expectedMC = FIELDS.length * MC_COUNT * LOCALES.length; // 252
  const expectedOpen = FIELDS.length * OPEN_COUNT * LOCALES.length; // 24
  const expectedTotal = expectedMC + expectedOpen; // 276

  // Verification
  const mcPass = mcRendered === expectedMC;
  const openPass = openRendered === expectedOpen;
  const totalPass = totalRendered === expectedTotal;

  console.log('=== XIMA Reviewer Pack Render ===');
  console.log(`MC items rendered:   ${mcRendered} / ${expectedMC}  ${mcPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Open items rendered: ${openRendered} / ${expectedOpen}  ${openPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Total rendered:      ${totalRendered} / ${expectedTotal}  ${totalPass ? '✅ PASS' : '❌ FAIL'}`);

  if (!totalPass) {
    console.error('❌ COMPLETENESS CHECK FAILED — aborting.');
    process.exit(1);
  }

  const generatedAt = new Date().toISOString();

  // Assemble full HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>XIMA External Psychometric Reviewer Pack v1.2.1</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 960px; margin: 0 auto; padding: 24px;
      color: #1a1a2e; line-height: 1.6; font-size: 14px;
    }
    h1 { color: #0f3460; border-bottom: 4px solid #0f3460; padding-bottom: 8px; }
    h2 { color: #16213e; }
    h3 { color: #533483; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-size: 13px; }
    th { background: #e8eaf6; }
    code { background: #f5f5f5; padding: 1px 4px; border-radius: 3px; font-size: 0.9em; }
    .toc a { text-decoration: none; color: #0f3460; }
    .toc a:hover { text-decoration: underline; }
    .cert-box {
      border: 2px solid #2e7d32; border-radius: 8px; padding: 16px; margin-top: 32px;
      background: #e8f5e9;
    }
    @media print {
      body { font-size: 11px; padding: 12px; }
      h2 { page-break-before: always; }
    }
  </style>
</head>
<body>

<h1>XIMA External Psychometric Reviewer Pack v1.2.1</h1>
<p><strong>Generated:</strong> ${generatedAt}<br/>
<strong>Scope:</strong> Full psychometric blueprint with verbatim trilingual item bank for external IO-psychology review.<br/>
<strong>Status:</strong> Content-locked (freeze guard active)</p>

<h2>Table of Contents</h2>
<div class="toc">
  <ol>
    <li><a href="#construct-model">Construct Model</a></li>
    <li><a href="#assessment-blueprint">Assessment Blueprint</a></li>
    <li><a href="#scoring-pipeline">Scoring Pipeline</a></li>
    <li><a href="#ximatar-assignment">XIMAtar Assignment</a></li>
    <li><a href="#item-bank">Full Verbatim Item Bank</a>
      <ul>
        ${FIELDS.map(f => `<li><a href="#field-${f}">${FIELD_LABELS[f]}</a> — ${LOCALES.map(l => `<a href="#${f}-${l}">${l.toUpperCase()}</a>`).join(' · ')}</li>`).join('\n        ')}
      </ul>
    </li>
    <li><a href="#validity">Validity Evidence</a></li>
    <li><a href="#fairness">Fairness & Bias Mitigation</a></li>
    <li><a href="#evidence-auditability">Evidence Auditability</a></li>
    <li><a href="#completeness">Completeness Certification</a></li>
  </ol>
</div>

<h2 id="construct-model" style="page-break-before:always;">1. Construct Model</h2>
<table>
  <thead><tr><th>Pillar</th><th>Definition</th><th>Boundary</th></tr></thead>
  <tbody>
    <tr><td>Computational Power</td><td>Ability to analyze data, decompose complex problems, apply systematic and quantitative reasoning, and evaluate technical solutions.</td><td>Does NOT measure raw intelligence or IQ.</td></tr>
    <tr><td>Communication</td><td>Ability to adapt messaging to diverse audiences, navigate conflict, deliver difficult information, and build alignment across stakeholders.</td><td>Does NOT measure language proficiency or grammar.</td></tr>
    <tr><td>Knowledge</td><td>Ability to acquire, validate, and apply domain expertise; evaluate conflicting information sources; and maintain intellectual rigor under uncertainty.</td><td>Does NOT measure factual recall or educational attainment.</td></tr>
    <tr><td>Creativity</td><td>Ability to generate novel solutions under constraints, reframe problems, and navigate trade-offs between innovation and feasibility.</td><td>Does NOT measure artistic talent.</td></tr>
    <tr><td>Drive</td><td>Capacity for sustained learning under friction, self-diagnosis of skill gaps, and deliberate practice. Measures Growth Velocity, not static motivation.</td><td>Does NOT measure 'grit' rhetoric or self-reported ambition.</td></tr>
  </tbody>
</table>
<p><strong>Intended use:</strong> Decision-support tool for professional development and hiring workflows. NOT a clinical diagnostic or standalone hiring filter.</p>

<h2 id="assessment-blueprint" style="page-break-before:always;">2. Assessment Blueprint</h2>
<table>
  <tr><th>Parameter</th><th>Value</th></tr>
  <tr><td>Fields</td><td>science_tech, business_leadership, arts_creative, service_ops</td></tr>
  <tr><td>Items per field</td><td>21 MC + 2 Open = 23</td></tr>
  <tr><td>Total items</td><td>92 (× 3 languages = 276 renderings)</td></tr>
  <tr><td>Languages</td><td>English, Italiano, Español</td></tr>
  <tr><td>Pillar mapping</td><td>Cyclic: pillar = PILLAR_CYCLE[(questionNumber − 1) % 5]</td></tr>
  <tr><td>Pillar cycle</td><td>computational_power → communication → knowledge → creativity → drive</td></tr>
  <tr><td>MC options</td><td>4 options per question (ordinal 0-3)</td></tr>
</table>
<p><strong>Pillar distribution per field (21 questions):</strong> Computational Power: 5 (q1,6,11,16,21), Communication: 4 (q2,7,12,17), Knowledge: 4 (q3,8,13,18), Creativity: 4 (q4,9,14,19), Drive: 4 (q5,10,15,20).</p>

<h2 id="scoring-pipeline" style="page-break-before:always;">3. Scoring Pipeline</h2>
<h3>3.1 MC Scoring</h3>
<p>Ordinal values: [0, 1, 2, 3]. Aggregation: Mean per pillar, scaled to 0–100.</p>
<p><code>pillar_score = (sum_of_ordinal_values / (count × 3)) × 100</code></p>

<h3>3.2 Open Answer Scoring</h3>
<table>
  <thead><tr><th>Dimension</th><th>Max</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td>Length</td><td>20</td><td>Word count reward for 80–250 words</td></tr>
    <tr><td>Relevance</td><td>25</td><td>Keyword overlap with field-specific vocabulary</td></tr>
    <tr><td>Structure</td><td>20</td><td>Sentence count, transitions, intro/conclusion markers</td></tr>
    <tr><td>Specificity</td><td>20</td><td>Numbers, examples, domain-specific long words</td></tr>
    <tr><td>Action</td><td>15</td><td>Action verbs indicating implemented behavior</td></tr>
  </tbody>
</table>
<p><strong>Blending:</strong> open1 → creativity (60%) + communication (40%); open2 → drive (60%) + knowledge (40%). Open weight: 10%. Computational power remains MC-only.</p>
<p><code>blended_pillar = base_pillar × 0.90 + open_contribution × 0.10</code></p>

<h2 id="ximatar-assignment" style="page-break-before:always;">4. XIMAtar Assignment</h2>
<p>Method: Euclidean distance in 5D pillar space.<br/>
<code>distance = √((Δ_drive)² + (Δ_comp_power)² + (Δ_communication)² + (Δ_creativity)² + (Δ_knowledge)²)</code></p>
<table>
  <thead><tr><th>XIMAtar</th><th>Drive</th><th>CP</th><th>Comm</th><th>Creat</th><th>Know</th><th>Title</th></tr></thead>
  <tbody>
    <tr><td>Lion</td><td>90</td><td>60</td><td>70</td><td>55</td><td>55</td><td>The Executive Leader</td></tr>
    <tr><td>Owl</td><td>55</td><td>85</td><td>60</td><td>55</td><td>75</td><td>The Analytical Thinker</td></tr>
    <tr><td>Dolphin</td><td>60</td><td>55</td><td>85</td><td>60</td><td>60</td><td>The Team Facilitator</td></tr>
    <tr><td>Fox</td><td>65</td><td>60</td><td>75</td><td>85</td><td>55</td><td>The Strategic Opportunist</td></tr>
    <tr><td>Bear</td><td>60</td><td>65</td><td>55</td><td>50</td><td>85</td><td>The Grounded Protector</td></tr>
    <tr><td>Bee</td><td>85</td><td>80</td><td>55</td><td>50</td><td>60</td><td>The Purposeful Contributor</td></tr>
    <tr><td>Wolf</td><td>80</td><td>60</td><td>70</td><td>55</td><td>55</td><td>The Pack Strategist</td></tr>
    <tr><td>Cat</td><td>55</td><td>85</td><td>55</td><td>80</td><td>60</td><td>The Independent Specialist</td></tr>
    <tr><td>Parrot</td><td>60</td><td>55</td><td>90</td><td>70</td><td>55</td><td>The Charismatic Communicator</td></tr>
    <tr><td>Elephant</td><td>55</td><td>65</td><td>60</td><td>55</td><td>90</td><td>The Wise Mentor</td></tr>
    <tr><td>Horse</td><td>80</td><td>65</td><td>60</td><td>55</td><td>60</td><td>The Relentless Performer</td></tr>
    <tr><td>Chameleon</td><td>65</td><td>65</td><td>65</td><td>65</td><td>65</td><td>The Adaptive Generalist</td></tr>
  </tbody>
</table>

<h2 id="item-bank" style="page-break-before:always;">5. Full Verbatim Item Bank</h2>
<p>This section contains ALL ${expectedTotal} item renderings (${FIELDS.length} fields × ${MC_COUNT + OPEN_COUNT} items × ${LOCALES.length} languages), reproduced verbatim from the runtime i18n source files.</p>

${sections.join('\n')}

<h2 id="validity" style="page-break-before:always;">6. Validity Evidence</h2>
<h3>Claims (supported by current evidence)</h3>
<ul>
  <li>Internal construct separation: 5 principal components with PC1 explaining 32.4% of variance (N=5000 synthetic)</li>
  <li>Maximum cross-pillar correlation: r=0.34 (CP–Knowledge), below 0.55 risk threshold</li>
  <li>All 12 archetypes meet separation targets (&gt;20 pts) and confusion thresholds (&lt;15%)</li>
  <li>Social desirability mitigation via Cognitive Tension methodology (no gradient options)</li>
  <li>Drive questions constrained to measure Growth Velocity under friction, not static motivation</li>
  <li>Content-lock freeze guard prevents unauthorized modification of assessment items</li>
</ul>
<h3>Non-claims (require additional data collection)</h3>
<ul>
  <li>No predictive validity claim (requires longitudinal criterion data, N≥500)</li>
  <li>No IRT calibration (requires N≥300 per item for 2PL model)</li>
  <li>No clinical diagnostic claim — this is a professional development tool</li>
  <li>No test-retest reliability data yet (requires N≥200, 2–4 week interval)</li>
  <li>No DIF analysis yet (requires N≥200 per demographic subgroup)</li>
  <li>No convergent/discriminant validity with established instruments (e.g., Big Five, CPI)</li>
</ul>

<h2 id="fairness" style="page-break-before:always;">7. Fairness & Bias Mitigation</h2>
<ul>
  <li><strong>Social desirability:</strong> All MC options encode "Cognitive Tension" — meaningful trade-offs between two legitimate strategies. No option is universally "best".</li>
  <li><strong>Language risk:</strong> Assessment delivered in 3 languages (EN/IT/ES). Translation equivalence has NOT been formally tested via back-translation. Known limitation.</li>
  <li><strong>Monitoring:</strong> Zero-PII telemetry captures anonymized pillar distributions by locale, field, and ximatar archetype. 730-day retention.</li>
</ul>

<h2 id="evidence-auditability" style="page-break-before:always;">8. Evidence Auditability</h2>
<h3>Freeze Content Lock</h3>
<table>
  <tr><th>Locale</th><th>djb2 Hash</th></tr>
  <tr><td>EN</td><td><code>${FREEZE_HASHES.en}</code></td></tr>
  <tr><td>IT</td><td><code>${FREEZE_HASHES.it}</code></td></tr>
  <tr><td>ES</td><td><code>${FREEZE_HASHES.es}</code></td></tr>
</table>
<p>Mechanism: djb2 hash of deterministic recursive serialization of all assessmentSets content per locale. Production: throws fatal Error on mismatch. Development: logs error.</p>

<h3>AI Governance</h3>
<p>All AI invocations logged in <code>ai_invocation_log</code>: provider, model, prompt hash (SHA-256), temperature, latency, status. No raw text stored (GDPR).</p>

<h3>Evidence Ledger</h3>
<p><code>assessment_evidence_ledger</code>: SHA-256 content hash, content length, quality label, key reasons, red flags. 730-day retention. GDPR unlinking via ON DELETE SET NULL.</p>

<hr/>
<div class="cert-box" id="completeness">
  <h2 style="margin-top:0;color:#2e7d32;">✅ Completeness Certification</h2>
  <table>
    <tr><th>Metric</th><th>Expected</th><th>Rendered</th><th>Status</th></tr>
    <tr><td>MC items (4 fields × 21 × 3 langs)</td><td>${expectedMC}</td><td>${mcRendered}</td><td>${mcPass ? '✅ PASS' : '❌ FAIL'}</td></tr>
    <tr><td>Open items (4 fields × 2 × 3 langs)</td><td>${expectedOpen}</td><td>${openRendered}</td><td>${openPass ? '✅ PASS' : '❌ FAIL'}</td></tr>
    <tr><td>Total item blocks</td><td>${expectedTotal}</td><td>${totalRendered}</td><td>${totalPass ? '✅ PASS' : '❌ FAIL'}</td></tr>
  </table>
  <p><strong>Freeze hashes (v1.2.1):</strong> EN: <code>${FREEZE_HASHES.en}</code> · IT: <code>${FREEZE_HASHES.it}</code> · ES: <code>${FREEZE_HASHES.es}</code></p>
  <p><strong>Generated at:</strong> ${generatedAt}</p>
  <p>All items rendered verbatim from <code>src/i18n/locales/{en,it,es}.json → assessmentSets.*</code>. No abbreviations, summaries, or truncations.</p>
</div>

</body>
</html>`;

  writeFileSync(OUTPUT_PATH, html, 'utf-8');
  console.log(`\n✅ HTML written to ${OUTPUT_PATH} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);

  // Update JSON source certification
  try {
    const jsonSource = JSON.parse(readFileSync(JSON_SOURCE_PATH, 'utf-8'));
    jsonSource.completeness_certification = {
      locales_fully_rendered: ['EN', 'IT', 'ES'],
      fields_fully_rendered: [...FIELDS],
      items_per_field: `${MC_COUNT} MC (q1–q${MC_COUNT}) + ${OPEN_COUNT} Open (open1, open2) = ${MC_COUNT + OPEN_COUNT} items`,
      mc_items_rendered: mcRendered,
      open_items_rendered: openRendered,
      total_items_rendered: `${totalRendered} (expected ${expectedTotal})`,
      certification: 'All items rendered verbatim from runtime i18n source. No abbreviations or summaries.',
      rendered_at: generatedAt,
      freeze_hashes_v1_2_1: { ...FREEZE_HASHES },
    };
    writeFileSync(JSON_SOURCE_PATH, JSON.stringify(jsonSource, null, 2) + '\n', 'utf-8');
    console.log(`✅ JSON source updated at ${JSON_SOURCE_PATH}`);
  } catch (e) {
    console.warn('⚠ Could not update JSON source:', e);
  }
}

main();
