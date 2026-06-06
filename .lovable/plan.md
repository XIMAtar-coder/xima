# Plan — Resilient Company-Profile Generation

Scope: `supabase/functions/generate-company-profile/index.ts` + one column migration + the three UI call sites that handle its response. No other functions or flows touched.

## Files to touch

1. `supabase/functions/generate-company-profile/index.ts` — UA, meta capture, graceful degrade.
2. New migration `supabase/migrations/<ts>_company_profiles_scan_status.sql` — add `website_scan_status` column.
3. `src/pages/business/Dashboard.tsx` — treat degraded success as success, show gentle inline note.
4. `src/pages/business/Register.tsx` — same handling (already calls the function during onboarding).
5. `src/pages/business/Settings.tsx` — same handling.
6. `src/i18n/locales/*` — 1 new string ("website scan insufficient" note), IT/EN/ES.

No edits to other edge functions, challenge flow, mindset, scoring, RLS, types, or shared modules.

## Edge function changes (additive only)

### a) Realistic headers in `fetchPage` (line 91-111)
Replace the `XIMABot` UA. New `headers`:
- `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36`
- `Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`
- `Accept-Language: it,en;q=0.8`

Keep 10s `AbortController` timeout and `redirect: "follow"` unchanged.

### b) Capture meta before stripping (new helper used inside `fetchPage`)
Before `stripHtmlToText(html)`, extract from raw HTML via small regexes:
- `<title>…</title>`
- `<meta name="description" content="…">`
- `<meta property="og:title" content="…">`
- `<meta property="og:description" content="…">`

Build a `metaPrefix` string (each on its own line, labeled `TITLE:`, `DESCRIPTION:`, `OG_TITLE:`, `OG_DESCRIPTION:`) and PREPEND it to the page `text` before the `substring(0, maxChars)` truncation. This keeps Fiocchi-style JS shells viable because the only prose lives in meta.

Also relax the `fetchAllPages` length gate (line 120 / 130) from `< 100` to `< 40` so a meta-only page still counts.

### c) Graceful degrade — replace the 400 (line 408-411)
Compute `hasUsableText = pages.some(p => p.text.length > 0)`. Compute `hasRegistrationContext = registrationContext.length > 0`. Compute `hasName = !!company_name`.

Branching:
- If `!hasUsableText && !hasRegistrationContext && !hasName` → keep a `400 INSUFFICIENT_CONTENT` (genuinely nothing).
- Otherwise → set `websiteScanStatus = hasUsableText ? 'ok' : 'insufficient'` and PROCEED to Claude.
  - If `pages` is empty/thin, set `pagesContext = "(Website content was limited or unavailable.)"` and append a clear instruction line to `userMessage`:
    > "Website content was limited or unavailable. Base the profile primarily on the self-declared registration data above. Be conservative; do not invent specifics, employee counts, founding year, locations, or values that are not explicitly stated."
  - Pass whatever pages we do have plus `registrationContext` as today.

### d) Persist scan status
Add `website_scan_status: websiteScanStatus` to the `company_profiles` upsert (line 492-511). Always 200 in the degrade path. The function already returns the stored row — keep that contract.

## Migration

```sql
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS website_scan_status text
  CHECK (website_scan_status IN ('ok','insufficient','failed'))
  DEFAULT 'ok';
```

No RLS or grant changes (column on existing table).

## UI changes

In all three call sites (Dashboard, Register, Settings):
- Treat a 200 response as success even when `data.website_scan_status === 'insufficient'`.
- When insufficient, replace the red error toast with a neutral inline note / non-destructive toast:
  > "Non siamo riusciti a leggere bene il sito — abbiamo usato i dati che hai inserito; puoi modificare il profilo."
- Keep red error banner only for actual `error` from `functions.invoke` or a non-2xx response.

Implementation detail: `Dashboard.tsx` already destructures `data`; check `data?.website_scan_status` after success and branch the toast variant. Same shape in `Register.tsx` and `Settings.tsx`. Add an i18n key `business.dashboard.profile_generated_partial` (IT/EN/ES).

## Out of scope (explicitly not changed)
- `generate-challenge`, `analyze-open-answer`, mindset flow, scoring, RLS, shared AI client, business_profiles snapshot logic, job_post_drafts insertion.
- No retries, no headless rendering, no third-party scraping service.

## Validation after build
- Manual: invoke `generate-company-profile` with Fiocchi URL → expect 200 + `website_scan_status='insufficient'` + a conservative profile derived from registration data.
- Manual: invoke with a normal site (e.g. a public SaaS landing) → expect 200 + `website_scan_status='ok'` and same quality as before.
- Manual: invoke with garbage URL and no business_profiles row → still 400 `INSUFFICIENT_CONTENT`.
