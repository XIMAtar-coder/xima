# Fase 1bis — Consolidamento percorso CV guest

## Cosa ho trovato (DB + codice)

**Utente test 3cf0c80e-f576-4ca0-b1fb-80bf1d82ec69 (profiles.id 4fc6c6ff…):**
- `profiles.cv_scores = {}` — non popolato davvero, è un oggetto vuoto.
- `cv_identity_analysis` 0 righe, `cv_credentials` 0 righe, nessun consenso `cv_processing`.

**Causa reale (peggio del previsto):** in `/ximatar-journey` step 1 ci sono **due uploader CV** che fanno cose diverse:

| Uploader | File | Cosa fa davvero | Consenso |
|---|---|---|---|
| `GuestCvUpload` (nostro, in cima) | `GuestCvUpload.tsx` | Chiama `analyze-cv-guest`, salva `guest_cv_*` in sessionStorage → al register `syncGuestCvToProfile` scrive `cv_identity_analysis` + `cv_credentials` + `user_consents.cv_processing` | Opzione A — "il file non viene conservato" |
| `BaselineAssessment` (preesistente, sotto) | `BaselineAssessment.tsx` linee 46–73 | **Non analizza nulla.** Fa solo `sessionStorage.setItem('xima_pending_cv', base64)`. La chiave `xima_pending_cv` **non è letta da nessuna parte** (verificato con ripgrep: solo BaselineAssessment scrive, nessun lettore). È un dead-end. | "Conferma di Conservazione Dati / conservato in modo sicuro" — bugia: niente viene conservato |

L'utente ha usato l'uploader del BaselineAssessment (più visibile, integrato col field selector). Risultato: zero analisi CV, zero righe DB, zero consenso registrato → buco di compliance.

`Register.tsx` chiama già `syncGuestCvToProfile` (riga 148) ma resta no-op senza `guest_cv_analysis` in sessionStorage.

## Decisione di consolidamento

Tengo **un solo uploader**, integrato nel BaselineAssessment (mantiene `FieldSelector` + progressione + bottoni Skip/Continue richiesti dal flusso), e **rimuovo il GuestCvUpload standalone**. La logica di analisi/persistenza diventa quella del percorso GuestCvUpload (analyze-cv-guest → sessionStorage `guest_cv_*` → syncGuestCvToProfile al register), con consenso Opzione A.

## Mappa prima → dopo

```
PRIMA                                          DOPO
─────                                          ────
/ximatar-journey step 1                        /ximatar-journey step 1
 ├─ <GuestCvUpload/> (analizza, Opt. A)         └─ <BaselineAssessment/>
 └─ <BaselineAssessment/>                            ├─ FieldSelector
      ├─ FieldSelector                               ├─ Upload CV (PDF)
      ├─ Upload CV → base64 in xima_pending_cv      ├─ Consenso UNICO Opzione A
      ├─ Consenso "conservato in modo sicuro"       ├─ POST /analyze-cv-guest (auth user OK pass-through)
      └─ Skip / Continue                             ├─ Salva guest_cv_* in sessionStorage
                                                     └─ Skip / Continue

/register (invariato)
 └─ syncGuestAssessmentToProfile + syncGuestCvToProfile
      ↳ ora gira sempre quando l'utente carica un CV
```

## File toccati

1. **`src/components/ximatar-journey/BaselineAssessment.tsx`** — riscrivere `handleUpload`:
   - rimuovere il blocco base64 → `xima_pending_cv` (dead code).
   - leggere `guest_pillar_scores` / `guest_ximatar` da sessionStorage; se assenti, mostrare errore "completa prima l'assessment" e bloccare l'upload del CV (lo skip resta disponibile).
   - costruire `FormData`, chiamare `${VITE_SUPABASE_URL}/functions/v1/analyze-cv-guest` con header `x-guest-consent: 1`, anon key.
   - su success: `sessionStorage.setItem('guest_cv_filename'|'guest_cv_analysis'|'guest_cv_pillar_scores'|'guest_cv_consent', …)` come fa oggi `GuestCvUpload`.
   - sostituire le i18n keys del blocco consenso: `baseline.data_consent_title` → `guestCv.consent_title` ("Trattamento del CV"); `baseline.data_consent_text` → `guestCv.disclaimer` (Opzione A); `baseline.consent_checkbox` → `guestCv.consent_label`. Nessun nuovo file di copy — `guestCv.*` esistono già in IT/EN/ES.
   - per utenti auth (caso raro qui, già loggati che rifanno l'assessment): stesso flusso guest — l'analisi viene salvata al successivo "claim" o, se preferisci, possiamo aggiungere uno short-circuit verso `analyze-cv` autenticato. **Domanda per te:** vuoi che per gli utenti già loggati si chiami `analyze-cv` (auth) invece di `analyze-cv-guest`? Default proposto: no, manteniamo un solo path guest anche per loro (la riga `cv_identity_analysis` verrà comunque scritta via `syncGuestCvToProfile` se la chiamiamo anche post-login — vedi punto 5).

2. **`src/pages/XimatarJourney.tsx`** — rimuovere import e render di `GuestCvUpload` **e** di `CvAnalysisUpload` dallo step 1. Lo step 1 mostra solo `<BaselineAssessment/>`. (Mantengo `CvAnalysisUpload.tsx` in repo per usi futuri da `/profile`; non lo cancello.)

3. **`src/components/ximatar-journey/GuestCvUpload.tsx`** — **elimino** il file (consolidato dentro BaselineAssessment).

4. **`src/i18n/locales/{it,en,es}.json`** — niente nuove chiavi; il blocco `guestCv.*` già aggiunto in Fase 1 viene riutilizzato. Le vecchie `baseline.data_consent_*` e `baseline.consent_checkbox` restano nei file ma non vengono più referenziate (non le rimuovo per evitare regressioni se usate altrove — verifico con grep prima di scrivere).

5. **`src/utils/assessmentSync.ts`** — invariato. Già copre tutti i NOT NULL (`cv_archetype_primary`, `cv_pillar_scores`, `assessment_ximatar`, `assessment_pillar_scores`), `cv_credentials`, `profiles.cv_scores` e l'insert `user_consents` `cv_processing`.

6. **`src/pages/Register.tsx`** — invariato (già chiama `syncGuestCvToProfile`).

## Cosa NON tocco
- `analyze-cv-guest/index.ts` (Fase 1 OK, rate-limit + service_role già a posto).
- `analyze-cv/index.ts` (auth-only, invariato).
- Schema DB: nessuna migration.
- `CvAnalysisUpload.tsx` (resta disponibile per `/profile` post-login).

## Smoke test (nuovo account)
1. Logout → `/ximatar-journey` step 1: vedo **un solo** uploader dentro BaselineAssessment, consenso Opzione A.
2. Seleziono field → completo l'assessment (step 2) almeno fino a generare `guest_pillar_scores` + `guest_ximatar`. *(Nota: oggi l'ordine è step 1 = upload CV → step 2 = assessment. L'analyze-cv-guest **richiede** `guest_pillar_scores` e `guest_ximatar` in FormData. Va riconsiderato l'ordine: o (a) spostiamo l'upload CV dopo l'assessment, o (b) rendiamo opzionali quei campi nell'edge. **Domanda critica per te.**)*
3. Register → in console `[sync-cv] cv_identity_analysis claimed`.
4. DB: `SELECT * FROM cv_identity_analysis WHERE user_id=<new>` → 1 riga; `SELECT * FROM user_consents WHERE user_id=<new> AND consent_type='cv_processing'` → 1 riga; `profiles.cv_scores` non vuoto.

## Domande aperte prima di scrivere
- **Q1 (ordine step)**: oggi CV viene caricato a step 1, assessment a step 2 — ma l'edge guest richiede i pillar scores dell'assessment. Opzioni:
  - **A.** Inverti: step 1 = assessment, step 2 = (opzionale) upload CV. Più pulito, l'edge resta strict.
  - **B.** Tieni l'ordine, rendi `guest_pillar_scores`/`guest_ximatar` **opzionali** nell'edge guest. Il `cv_identity_analysis.assessment_ximatar` NOT NULL viene poi popolato al register dal sync usando i valori sessionStorage prodotti dall'assessment (eseguito dopo l'upload). Richiede di non chiamare il sync se mancano ancora — già gestito.
  - **C.** Sposta solo l'uploader CV dentro lo step 3 (ResultsComparison), dopo l'assessment.
  Default proposto: **A**, perché è coerente con il prompt dell'edge (che usa i pillar per il matching). Confermi?
- **Q2 (utenti loggati su `/ximatar-journey`)**: forziamo path guest anche per loro (semplicità) o teniamo un branch verso `analyze-cv` auth? Default: path guest unico.

Nessun file scritto. Attendo OK su Q1 e Q2 prima di procedere.
