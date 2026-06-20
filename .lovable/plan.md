# PoC RAG matching — Piano finale (v3)

Recepisce l'addendum. Conferma tutto il v2 (dry_run, task_type+fallback, troncamento ~2000 tok pre-hash, vector(1536)+HNSW, `poc_match_runs`, CSV md5, RLS admin) e aggiunge / chiarisce i tre punti seguenti.

## A. Doppia modalità (re-rank + discovery)

Tab PoC con toggle modalità, salvata in `poc_match_runs.mode` (`'rerank' | 'discovery'`).

- **(a) Re-rank baseline** — flusso v2: chiama `generate-shortlist` in `dry_run`, ottiene set `B`, ensure embedding di `B`, poi `poc-match` con `candidate_ids = B`. Mostra overlap top-K, delta rank medio, Precision@K vs baseline.
- **(b) Discovery** — `poc-match` con `candidate_ids = NULL`: rank semantico su TUTTO il pool embeddato. UI affianca top-10 baseline vs top-10 semantica; badge **"NUOVO"** sui candidati semantici non presenti nella top-10 baseline. Conta `novelty_count` salvato nel run.

`poc-embed` scope `candidates`:
- default `candidate_limit = 80` (parametrico, 1–500), per dare un pool reale alla discovery oltre `B`.
- selezione invariata: chi ha `user_ai_context` OR `assessment_results`, `ORDER BY profiles.updated_at DESC`.
- in modalità (a) la tab embedda comunque on-the-fly i candidati di `B` mancanti dal campione (unione `B ∪ sample`).

## B. Gate RPC `poc_search_candidates` — **OPZIONE A**

Applico l'opzione consigliata. La funzione resta `LANGUAGE sql STABLE SECURITY DEFINER`, ma:

```sql
REVOKE EXECUTE ON FUNCTION public.poc_search_candidates(uuid, int, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.poc_search_candidates(uuid, int, uuid[]) TO service_role;
```

Nessun client (JWT anon/authenticated) può invocarla via PostgREST. L'unico caller è l'edge `poc-match`, che:
1. valida JWT,
2. verifica `has_role(user_id, 'admin')` con service-role client,
3. invoca `poc_search_candidates(...)` con service-role client.

Stesso pattern di gating delle `admin_*` RPC già in uso.

## C. Fonte pillar — **profiles.pillar_scores (jsonb)**

`profiles` ha già `pillar_scores jsonb` e `pillars jsonb` (oltre a `strongest_pillar`, `weakest_pillar`, `pillar_vector`). Uso `profiles.pillar_scores` come fonte primaria per la riga `Pillars: K=.. C=.. Comp=.. Cr=.. D=..` (zero pivot, zero join).

Fallback (se `profiles.pillar_scores` è null/vuoto): pivot da `pillar_scores` long-format sull'ultimo `assessment_result_id`:

```sql
SELECT ps.pillar, ps.score
FROM assessment_results ar
JOIN pillar_scores ps ON ps.assessment_result_id = ar.id
WHERE ar.user_id = :uid
ORDER BY ar.computed_at DESC
LIMIT 5;
```

poi pivot in-memory in `{K,C,Comp,Cr,D}`.

## D. Privacy — scrub PII dai jsonb prima della concatenazione

In `_shared/pocDocBuilder.ts`, helper `scrubPII(json)` che rimuove ricorsivamente chiavi case-insensitive matching:
`name, full_name, first_name, last_name, ximatar_name, email, phone, telephone, mobile, address, linkedin, github, url, website, dob, birthdate, fiscal_code, ssn`.

Applicato a: `cv_credentials_summary`, `cv_identity_summary`, `assessment_summary`, `challenge_history_summary`, `growth_summary`, `matching_preferences`, `l3_summary`, `cv_identity_analysis`, `assessment_cv_analysis`. **NON** uso `user_ai_context.cv_extracted_text` (PII grezza).
`profiles.ximatar_name` resta nel doc (pseudonimo, non-PII).

## Doc candidato finale — campi esatti

Header: `### Candidate profile (anonymous)`

1. **Identity (pseudonym)**: `ximatar_name`, `ximatar_level`
2. **Preferences**: `industry_preferences[]`, `work_preference`, `desired_locations[]`
3. **Pillars**: `K=.. C=.. Comp=.. Cr=.. D=..` (da `profiles.pillar_scores` o fallback)
4. **Assessment** (latest `assessment_results` by `computed_at desc`): `total_score`, `pillars`, `top3`, `rationale`, `sentiment`
5. **Credentials** (`user_ai_context.cv_credentials_summary`, scrub)
6. **Identity narrative** (`user_ai_context.cv_identity_summary`, scrub)
7. **Assessment summary** (`user_ai_context.assessment_summary`, scrub)
8. **Challenges history** (`user_ai_context.challenge_history_summary`, scrub) — opzionale
9. **Growth** (`user_ai_context.growth_summary`, scrub) — opzionale
10. **Matching preferences** (`user_ai_context.matching_preferences`, scrub)
11. **L3** (`user_ai_context.l3_summary`, scrub) — opzionale
12. **CV analysis** (`assessment_cv_analysis`: `summary`, `strengths`, `soft_skills`, `ximatar_suggestions`) — opzionale
13. **Identity analysis** (`cv_identity_analysis`: archetipi, `tension_narrative`, `*_roles[]`) — opzionale
14. **Open answers** (ultime 3 `assessment_open_responses.answer`, troncate) — opzionale

Sezioni opzionali skippate silenziosamente se assenti. Ordine fisso → hash stabile.

## RPC firma finale

```sql
CREATE OR REPLACE FUNCTION public.poc_search_candidates(
  p_goal_id uuid,
  p_k int DEFAULT 10,
  p_candidate_ids uuid[] DEFAULT NULL
) RETURNS TABLE (candidate_user_id uuid, similarity double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ce.candidate_user_id,
         1 - (ce.embedding <=> ge.embedding) AS similarity
  FROM poc_candidate_embeddings ce
  CROSS JOIN poc_goal_embeddings ge
  WHERE ge.hiring_goal_id = p_goal_id
    AND (p_candidate_ids IS NULL OR ce.candidate_user_id = ANY(p_candidate_ids))
  ORDER BY ce.embedding <=> ge.embedding
  LIMIT LEAST(GREATEST(p_k,1), 200);
$$;
REVOKE EXECUTE ON FUNCTION public.poc_search_candidates(uuid, int, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.poc_search_candidates(uuid, int, uuid[]) TO service_role;
```

## poc_match_runs — colonne aggiornate

`id, hiring_goal_id, mode ('rerank'|'discovery'), k, candidate_ids_count, top_results jsonb, baseline_results jsonb, overlap_count, novelty_count, created_by, created_at`. RLS admin-only.

## Ordine di build (dopo "approvato, costruisci")

1. Migration: `poc_candidate_embeddings`, `poc_goal_embeddings`, `poc_match_runs`, HNSW indices, RLS admin-only + GRANT, RPC `poc_search_candidates` con OPZIONE A.
2. Patch additiva `supabase/functions/generate-shortlist/index.ts`: param `dry_run` (default false) che salta l'INSERT su `shortlist_results`.
3. Edge `poc-embed` (scope `candidates`|`goals`, batch 5, retry 429×3, task_type asimmetrico+fallback, truncate→hash) + `_shared/pocDocBuilder.ts` (con scrubPII) + `_shared/truncate.ts`.
4. Edge `poc-match` (JWT+has_role admin; modes `rerank|discovery`; chiama RPC via service-role; why-chunks on-demand).
5. `src/components/admin/tabs/PocRagTab.tsx` + registrazione tab in `XimaManager.tsx`. Toggle modalità, ensure-embeddings, CSV export con `md5(user_id)`.
6. Smoke test su 1 goal active: dry_run baseline, embed 80 + ensure B, rerank+discovery, badge NUOVO visibile, run salvato.

Aspetto **"approvato, costruisci"**.
