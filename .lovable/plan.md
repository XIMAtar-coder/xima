

# Plan: Generate XIMA Investor White Paper Input Dossier

## Deliverable
Create `public/XIMA_Investor_Whitepaper_Input_v1.html` — a structured, 2-page (A4 print) technical and business briefing designed as input for a downstream AI to generate the final investor document.

## Approach
Write a single self-contained HTML file with print-optimized CSS (`@page` rules for A4, `@media print` styles), using dense bullet-point formatting to maximize information per page. All data sourced from the existing Internal System Documentation and codebase.

## Document Structure

### Page 1

**SECTION 1 — Executive Overview** (~15% of space)
- What XIMA is: psychometric hiring intelligence platform replacing CV-first screening with 5-pillar behavioral assessment
- Problem: credential bias, unstructured interviews, no behavioral signal in traditional hiring
- Solution: anonymized XIMAtar profiles (12 archetypes), cognitive pattern detection, progressive challenge pipeline
- Why it scales: field-agnostic pillar model (4 professional fields), trilingual (EN/IT/ES), industry-neutral archetypes

**SECTION 2 — Platform Architecture** (~25% of space)
- Stack table: React 18 + Vite + TS, Supabase (PostgreSQL, 78 tables, RLS), 30+ Edge Functions (Deno), Lovable AI Gateway (Gemini 2.5 Flash), i18next trilingual
- Assessment pipeline: 21 MC items (cyclic 5-pillar mapping) + 2 open answers → pillar vector → Euclidean distance XIMAtar assignment → candidate profile
- Three-level challenge system: L1 (XIMA Core mindset), L2 (role-specific simulation), L3 (standing video communication)
- Signal engine: heuristic + AI qualitative interpretation, no auto-rejection

**SECTION 3 — AI Usage** (~20% of space)
- 9 AI touchpoints: open-answer scoring, L2 signal extraction, CV analysis, challenge generation, company profile analysis, job post PDF extraction, mentor matching, translation, candidate chat
- Governance: `ai_invocation_log` table with SHA-256 prompt hashes, deterministic replay via `ai-invocation-replay` edge function, pre/post guardrails on scoring
- Guardrails: non-answer detection (trilingual regex), red-flag score capping, local heuristic fallbacks for scoring functions

### Page 2

**SECTION 4 — Psychometric Model** (~20% of space)
- 5 pillars defined with claims/non-claims
- Validation metrics: Cronbach's α 0.60–0.68, max cross-pillar r=0.34, PCA PC1=32.4%
- Scoring: MC ordinal (0-3) → pillar mean → normalize 0-100; open-answer 90/10 blend; XIMAtar via Euclidean distance to 12 canonical profiles
- Freeze protocol: content-lock hashes (djb2), runtime validation, version-gated revalidation

**SECTION 5 — Business Model & Unit Economics** (~20% of space)
- 3-tier pricing: Starter €199/mo, Growth €499/mo, Enterprise custom €1,500+
- Unit economics: ~€0.03–0.08 per assessment (AI tokens), ~€3–13 variable cost per company/month
- Breakeven: 5 companies (bootstrapped) to 15 companies (realistic)
- ARPU €349/mo, contribution margin €341/mo
- Revenue streams: company subscriptions, candidate premium tiers, mentor credits, API access, white-label (future)

**SECTION 6 — GDPR & Compliance** (~10% of space)
- Full GDPR suite: data export, account deletion, profiling opt-out, consent versioning
- XIMA as decision-support tool under Article 22 (no automated decisions)
- RLS enforcement across all 78 tables

**SECTION 7 — Market Position & Risks** (~15% of space)
- Defensibility: validated psychometric model (strong), XIMAtar brand (strong), data network effect (weak today, needs N≥500)
- Key risks: real-world validation pending (N≥300 needed), single AI provider, market adoption resistance
- Go-to-market: dual-entry funnel (PLG via candidate virality + top-down sales), Italian SMB first, enterprise at N≥500
- Next milestones: 10 paying companies, Stripe integration, 3 case studies, IRT calibration

**Footer**
- Document metadata: version, generation date, classification as "Input Dossier — Not Final Investor Document"

## Technical Details
- Print CSS: `@page { size: A4; margin: 15mm; }`, compact font sizes (9-10pt body), dense table styling
- No external dependencies — fully self-contained HTML with inline CSS
- Tone enforcement: factual, no superlatives, explicit about what is live vs. designed vs. hypothetical

