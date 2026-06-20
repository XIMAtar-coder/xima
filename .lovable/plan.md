# Real Health Checks — Developer & System

Sostituire il blocco "System Status" placeholder in `src/components/admin/tabs/SystemTab.tsx` (oggi 3 badge `Operational` hardcoded, righe 90-106) con check reali, admin-only.

## 1. Nuova edge function `health-ping`

`supabase/functions/health-ping/index.ts` — minima, `verify_jwt = false` di default, solo CORS + risposta:

```ts
return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

Nessun accesso DB, nessun secret. Serve solo a misurare round-trip verso il runtime edge.

## 2. Logica di check (client, dentro SystemTab)

Tre probe indipendenti lanciati in parallelo al mount e ad ogni "Refresh":

- **Database**: `supabase.rpc` non disponibile per `select 1`; uso una query leggera già autorizzata all'admin, es. `supabase.from('model_prices').select('id', { count: 'exact', head: true }).limit(1)`. Misuro `performance.now()` prima/dopo.
- **Edge Functions**: `supabase.functions.invoke('health-ping')` con timeout 5s, misuro latenza, verifico `data.ok === true`.
- **Realtime**: creo un channel temporaneo `supabase.channel('health-' + Date.now())`, `.subscribe((status) => …)` con timeout 5s. Stato `SUBSCRIBED` → ok, `CHANNEL_ERROR`/`TIMED_OUT` → down. Rimosso subito con `removeChannel`.

Classificazione comune:
- `ok`: success + latenza < 600ms
- `degraded`: success + latenza ≥ 600ms (o 800 per edge)
- `down`: errore / timeout

Stato React: `{ status, latencyMs, lastCheckedAt, error? }` per ognuno dei 3.

## 3. UI

Stessa griglia 3-col, ma badge dinamico:
- ok = emerald, degraded = amber, down = red
- riga 1: nome servizio
- riga 2: `Operational · 87ms` / `Degraded · 920ms` / `Down — timeout`
- riga 3: `checked 12s ago` (relative time, aggiornato ogni 5s con `setInterval`)

Header card: bottone "Refresh" (icona `RefreshCw`, spinner durante il check) che rilancia i 3 probe in parallelo. Auto-run una volta al mount; nessun polling automatico (evita rumore in console/billing).

## 4. Admin-only

Il tab `SystemTab` è già renderizzato solo dentro `XimaManager` che è gated admin — nessun cambio di routing necessario. La query DB usa una tabella con RLS che concede lettura a `authenticated` (model_prices è OK); se l'utente non è admin la query fallirà silenziosamente come "down", che è coerente.

## File toccati

- `supabase/functions/health-ping/index.ts` (nuovo, ~15 righe)
- `src/components/admin/tabs/SystemTab.tsx` (sostituire righe 90-106 + aggiungere stato/effetti in cima al componente)

Nessuna migration, nessun secret, nessun impatto su produzione/PoC/costi.
