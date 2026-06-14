# Fase 2.1c — Unificazione rotte goal

## Occorrenze trovate (`/business/goals`)

**Registrazione rotte (`src/App.tsx`, 6 rotte):**
- `/business/goals/:goalId/shortlist` → `GoalShortlistPage`
- `/business/goals/:goalId/candidates` → `GoalCandidates`
- `/business/goals/:goalId/challenges` → `GoalChallenges`
- `/business/goals/:goalId/settings` → `GoalSettings`
- `/business/goals/:goalId/decision-pack` → `GoalDecisionPack`
- `/business/goals/:goalId/challenges/:challengeId/responses` → `ChallengeResponses`

Nota: non esiste oggi una rotta `/business/goals/:id/edit` registrata (solo un `navigate` ad essa nel dropdown della overview card → quel link è già "morto", andrà comunque rimappato al nuovo prefisso).
Nessuna rotta "bare" `/business/goals` esistente.

**Target di navigazione (`navigate` / `Link to` / `window.location.href`):**
- `src/pages/business/HiringGoalCreate.tsx:231`
- `src/pages/business/GoalShortlistPage.tsx:72`
- `src/pages/business/GoalSettings.tsx:35, 45`
- `src/pages/business/GoalDecisionPack.tsx:156`
- `src/pages/business/GoalChallenges.tsx:79, 375`
- `src/pages/business/GoalCandidates.tsx:172, 427`
- `src/pages/business/Dashboard.tsx:214`
- `src/pages/business/CreateXimaCoreChallenge.tsx:308, 508, 535, 794`
- `src/pages/business/CreateChallenge.tsx:399, 426`
- `src/pages/business/ChallengeTypeSelector.tsx:134`
- `src/pages/business/ChallengeResponses.tsx:112, 355, 366`
- `src/components/business/BusinessCommandCenter.tsx:67, 118`
- `src/components/business/GoalContextHeader.tsx:85`
- `src/components/business/ActiveChallengesOverview.tsx:127`
- `src/components/business/HiringGoalOverviewCard.tsx:76, 85, 98` (incluso Edit)

## Modifiche

1. **`src/App.tsx`**: rinominare le 6 rotte da `/business/goals/...` → `/business/hiring-goals/...` (parametri `:goalId` e `:challengeId` invariati). Aggiungere 6 redirect dalle vecchie rotte:
   ```tsx
   <Route path="/business/goals/:goalId/shortlist" element={<Navigate to="/business/hiring-goals/:goalId/shortlist" replace />} />
   ```
   Poiché `<Navigate to>` non interpola i params, useremo un piccolo componente wrapper `GoalsRedirect` che legge `useParams` + `useLocation` e fa `<Navigate to={\`/business/hiring-goals/...\`} replace />` per ogni sotto-rotta. In alternativa più semplice: una singola route catch-all `/business/goals/*` con wrapper che ricostruisce il path preservando il resto. Useremo il catch-all wrapper per coprire anche eventuali link futuri (incluso `/:id/edit`).

2. **Tutti i file elencati sopra**: sostituire stringhe `/business/goals/` con `/business/hiring-goals/`. Nessun cambio di parametri o logica.

3. **`HiringGoalOverviewCard.tsx`** (Edit): il target diventa `/business/hiring-goals/${goal.id}/edit` (la rotta concreta verrà aggiunta in futuro; oggi resta non registrata come prima, ma coerente col nuovo prefisso).

## Out of scope
- Logica delle pagine goal (invariata).
- Nuove rotte (es. `:id/edit`) non vengono create.
- Altre voci sidebar / pagine non goal.

## Verifica
- `rg "/business/goals" src/` deve restituire solo le 6 entry di redirect in `App.tsx` (o nessuna, se uso il catch-all wrapper).
- Edit nella overview card naviga a `/business/hiring-goals/:id/edit`.
- Vecchi URL `/business/goals/:id/shortlist` (etc.) redirigono al nuovo path con replace.
