# Tranche 3 — Pattern `analyze-cv` async + polling (v2, correzioni recepite)

## 1. Guest: rimane SINCRONO

`analyze-cv-guest` non viene refactored. Motivo: il guest non ha sessione, `cv_uploads` ha RLS owner-scoped, e introdurre un'edge di polling guest-token-scoped aprirebbe superficie di attacco senza beneficio reale (è un flusso one-shot pre-registrazione dove l'utente sta comunque aspettando il risultato per proseguire). Lasciamo invariato: stessa risposta sincrona di oggi, stessi limiti, stesso `guest_rate_limit`.

Solo `analyze-cv` (utenti autenticati) passa al pattern async.

## 2. Stato — `cv_uploads` (riuso + colonne additive)

Migration additiva minima:

```sql
ALTER TABLE public.cv_uploads
  ADD COLUMN IF NOT EXISTS analysis_error_message text,
  ADD COLUMN IF NOT EXISTS analysis_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS analysis_completed_at timestamptz;
```

`analysis_status` esiste già. Stati usati: `pending | processing | done | error`. Nessuna nuova policy, nessun nuovo GRANT (colonne ereditano la policy owner-scoped esistente).

## 3. ID per il polling — garantito

L'edge `analyze-cv` **garantisce sempre** un `cv_upload_id` valido prima di rispondere 202:

- Se il client passa già un `cv_upload_id` (record creato dall'upload Storage): l'edge fa `UPDATE` per portarlo a `processing` e azzera `analysis_error_message`/`analysis_completed_at`.
- Se non lo passa (qualche call-site oggi non lo crea): l'edge fa `INSERT` di una riga `cv_uploads` con `user_id=auth.uid()`, riferimento al file Storage, `analysis_status='processing'`, `analysis_started_at=now()`, e restituisce l'id.

Risposta 202: `{ cv_upload_id: uuid, status: 'processing' }`. Il polling parte sempre da un id certo.

## 4. Edge `analyze-cv` — flusso

```text
POST /analyze-cv
 ├─ auth (rifiuto non-autenticati)
 ├─ rate-limit + validazione input        (invariati)
 ├─ ensure cv_uploads row (UPDATE | INSERT) → cv_upload_id
 │     SET analysis_status='processing',
 │         analysis_started_at=now(),
 │         analysis_error_message=null,
 │         analysis_completed_at=null
 ├─ return 202 { cv_upload_id, status:'processing' }
 └─ EdgeRuntime.waitUntil( runAnalysis(cv_upload_id) )
        ├─ Claude vision + reasoning                (invariati)
        ├─ upsert cv_credentials + cv_identity_analysis
        ├─ ai_invocation_log con costo              (invariato)
        ├─ success → UPDATE analysis_status='done',
        │            analysis_completed_at=now()
        └─ catch   → UPDATE analysis_status='error',
                     analysis_error_message=<msg sanitizzato ≤500ch>,
                     analysis_completed_at=now()
```

Note sui limiti di esecuzione:
- `analyze-cv` è I/O-bound (due chiamate Claude in sequenza, ~15–45s totali). Rientra nei limiti `waitUntil` del runtime Supabase (background tasks fino a diversi minuti dopo la response). Verifica empirica nel test smoke: misuriamo durata reale e logghiamo in `ai_invocation_log`.
- **Non** usiamo `setTimeout` come timeout-guard in-process (inutile se l'istanza viene riciclata). La robustezza è gestita dal punto 5.

## 5. Self-heal lato lettura (no righe bloccate)

Sia l'hook client sia (opzionalmente) una vista helper trattano come scaduto ogni record:

```text
status === 'processing' AND analysis_started_at < now() - interval '3 minutes'
   → UI lo mostra come 'error' (messaggio: "Analisi scaduta, riprova")
   → bottone "Riprova" → re-invoke analyze-cv (che fa UPDATE a processing e riparte)
```

Implementazione: logica nell'hook `useCvAnalysisJob` (computa `isStale` da `analysis_started_at`). Nessuna riga resta "processing per sempre" dal punto di vista utente. Opzionale (in build, non bloccante): cron leggero o trigger che marca davvero `error='timeout'` le righe scadute — decidiamo se serve dopo lo smoke test.

## 6. UI — skeleton + polling

Hook nuovo `src/hooks/useCvAnalysisJob.ts`:

```text
useCvAnalysisJob(cvUploadId)
 ├─ fetch iniziale cv_uploads (status, error_message, started_at, completed_at)
 ├─ if status in {pending, processing} && !isStale:
 │     setInterval 2500ms
 ├─ stop su done | error | isStale
 ├─ isStale = processing && started_at < now()-3min  → trattato come error scaduto
 ├─ dopo 120s di polling attivo, rallenta a 10s (job continua server-side)
 └─ cleanup su unmount (clearInterval)
```

Call-site aggiornati:
- `src/components/profile/CVAnalysisCard.tsx`
- `src/components/ximatar-journey/CvAnalysisUpload.tsx`

Flusso: upload → invoke `analyze-cv` → 202 in <1s → skeleton card → hook aggiorna → su `done` fetch finale di `cv_credentials` + `cv_identity_analysis` → render. Su `error`/scaduto: banner + Riprova. L'utente può navigare via e tornare: il polling riprende dal record reale.

## 7. Invariati

- Auth, prompt, modelli, scoring, `ai_invocation_log` (token + costo): identici.
- RLS: zero policy nuove, solo 3 colonne additive su `cv_uploads`.
- `analyze-cv-guest`: nessuna modifica.
- `supabase_realtime`: non toccato.

## 8. Verifica prima di replicare sulle altre Tier A

1. Upload CV (autenticato) → risposta <1s, skeleton compare.
2. `cv_uploads.analysis_status` passa `processing → done` entro tempo reale; UI si aggiorna senza refresh.
3. Forzare errore Claude (es. file corrotto) → `error` + messaggio + Riprova funzionante.
4. Forzare stuck: chiudere manualmente la riga su `processing` con `started_at` simulato a -4 min → UI mostra "scaduta" + Riprova.
5. Navigazione via durante analisi → tornando, stato coerente, polling riprende.
6. `ai_invocation_log` contiene la riga con costo (modello claude-*), success=true/false coerente.
7. `analyze-cv-guest` continua a funzionare sincrono come prima (no regressione).

## File toccati

- Migration: 3 colonne additive su `cv_uploads`.
- `supabase/functions/analyze-cv/index.ts` — split fast-return + `runAnalysis` con `EdgeRuntime.waitUntil`, ensure-row, finalize stato.
- `src/hooks/useCvAnalysisJob.ts` — nuovo (polling + isStale).
- `src/components/profile/CVAnalysisCard.tsx` — skeleton + hook + retry.
- `src/components/ximatar-journey/CvAnalysisUpload.tsx` — skeleton + hook + retry.

NON toccati: `analyze-cv-guest`, RLS, prompt, scoring, logging costi, Realtime.

---

Alla conferma + smoke test positivo, replico il pattern (con le stesse 3 garanzie: id certo, self-heal, stato finale sempre scritto) su: `generate-l3-interview`, `analyze-l3-frames`, `generate-company-profile` + `analyze-company-profile` (riuso `company_profiles.website_scan_status`), `generate-feed-insights`. Per L3 e feed proporrò in un piano dedicato la colonna additiva minima sulla tabella di dominio corretta (no nuove tabelle).
