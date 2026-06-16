## Piano — CTA "Crea sfida L1 / XIMA Challenge" sulla shortlist

### Entry-point riusato (nessun nuovo flusso)
Riuso l'**unico** entry-point già esistente per la creazione sfida in contesto goal:

- **Rotta**: `/business/challenges/select?goal=:goalId`
- **Componente**: `src/pages/business/ChallengeTypeSelector.tsx`

È lo stesso link già usato in `GoalChallenges.tsx` (righe 219 e 304: `Link to={`/business/challenges/select?goal=${goalId}`}`). Da lì l'utente sceglie XIMA Core (→ `/business/challenges/xima-core?goal=…`) o Custom (→ `/business/challenges/new?goal=…`). Nessun terzo builder viene introdotto.

### Modifica unica
File: `src/pages/business/GoalShortlistPage.tsx` (righe 74-85)

Affianco al bottone secondario "Candidate Pool" già presente, aggiungo un bottone **primario** ben visibile:

```tsx
<Button onClick={() => navigate(`/business/challenges/select?goal=${goalId}`)} className="gap-2">
  <Sparkles className="h-4 w-4" />
  {t('shortlist.create_l1_challenge', 'Crea sfida L1 / XIMA Challenge')}
</Button>
```

- Passa `:goalId` corrente via querystring `?goal=…` (stessa convenzione usata da `GoalChallenges` e accettata da `ChallengeTypeSelector`).
- Variante `default` (primaria) per dare maggiore prominenza rispetto a "Candidate Pool" (outline).
- Posizionato nell'header action group accanto a "Candidate Pool", a destra del titolo.

### Cosa NON faccio
- Nessuna nuova rotta, nessun nuovo componente di creazione.
- Nessuna duplicazione di logica: pura navigazione.
- Nessuna modifica a `ChallengeTypeSelector`, `CreateXimaCoreChallenge`, `CreateChallenge`.
- Nessuna modifica backend / RLS / DB.

### Verifica attesa
Click sulla CTA dalla `/business/hiring-goals/:goalId/shortlist` apre `ChallengeTypeSelector` con il goal precaricato; da lì il flusso esistente (XIMA Core o Custom) procede invariato.
