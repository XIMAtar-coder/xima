# Fase 2.1d — Edit goal status-aware (opzione C)

## Stato attuale del wizard `HiringGoalCreate.tsx`

- **Non** supporta oggi il caricamento di una bozza esistente. L'unico pre-fill è da `?from_listing=<jobPostId>` (job_posts → form). Non c'è alcuna lettura da `hiring_goal_drafts`.
- `handleSubmit` esegue sempre un `INSERT` in `hiring_goal_drafts` → ogni passaggio dal wizard crea una nuova riga.
- Niente persistenza intermedia step-per-step (la riga nasce solo al submit finale).
- Non distingue `new` vs `edit`: la modalità è implicitamente "new". Useremo la presenza di `:goalId` nella URL come unico switch.

## Modifiche

### 1. Rotta (`src/App.tsx`)
Aggiungere accanto a `/business/hiring-goals/new`:
```tsx
<Route path="/business/hiring-goals/:goalId/edit" element={<HiringGoalCreate />} />
```
Nessun nuovo componente: stesso `HiringGoalCreate`, modalità decisa dalla presenza di `:goalId`.

### 2. Wizard (`src/pages/business/HiringGoalCreate.tsx`)
- Importare `useParams`; estrarre `goalId`. `isEditMode = !!goalId`.
- Nuovo `useEffect` (quando `goalId` cambia): carica la riga da `hiring_goal_drafts` con `.eq('id', goalId).single()`, e prefilla `formData` con tutti i campi mappati uno-a-uno (gli stessi che oggi vengono scritti in `INSERT`). Gestire errore: toast + redirect a `/business/hiring-goals`.
- Hard-guard: se la riga caricata ha `status !== 'draft'`, redirect immediato a `/business/hiring-goals/${goalId}/settings` (difesa in profondità: la card già lo evita, ma evitiamo che un URL diretto bypassi la regola).
- In `handleSubmit`:
  - Se `isEditMode`: `UPDATE hiring_goal_drafts SET ... WHERE id = goalId` (stessi campi dell'insert; preservare `status` esistente a meno che `xima_hr_requested` → `status='active'` come oggi). Niente nuova riga.
  - Altrimenti: comportamento attuale (INSERT).
- Titolo pagina: variante "Modifica obiettivo" quando in edit (i18n: nuove chiavi `hiring_goal.edit_title` / `hiring_goal.edit_subtitle` in en/it/es).
- Nessuna modifica al pre-fill `from_listing`: resta usabile solo in modalità "new" (in `edit` la query string è ignorata; aggiungiamo guard `if (isEditMode) return;` nell'effetto `from_listing`).

### 3. Azione Edit (`src/components/business/HiringGoalOverviewCard.tsx`)
- Sostituire il target statico dell'item "Edit" con uno status-aware:
  ```tsx
  const editPath = goal.status === 'draft'
    ? `/business/hiring-goals/${goal.id}/edit`
    : `/business/hiring-goals/${goal.id}/settings`;
  ```
  Usato in `onClick`.

## Stats Overview
Le stats della Dashboard leggono la riga più recente in `hiring_goal_drafts`. L'UPDATE in edit non crea duplicati e aggiorna automaticamente `updated_at` se la colonna ha trigger/default (già il caso oggi). Niente regressioni attese.

## Out of scope
- Auto-save step-per-step.
- Modifica di goal con `status='active'` (per design vanno in Settings).
- Cambi al flusso `new` o al pre-fill `from_listing`.

## Verifica
- `Edit` su una bozza apre il wizard con tutti i campi precompilati; "Crea e Genera Shortlist" aggiorna la stessa riga (verificabile via `select id, updated_at, status from hiring_goal_drafts where id = ...`).
- `Edit` su un goal `active` apre `/business/hiring-goals/:id/settings`.
- `/business/hiring-goals/new` (senza `:goalId`) continua a creare una nuova riga.
- Nessuna riga duplicata in `hiring_goal_drafts` dopo un ciclo open-edit-save.
