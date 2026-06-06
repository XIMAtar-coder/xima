# Fix `pg_catalog.trim(text)` does not exist

## Root cause (verified against live DB)

Two `SECURITY DEFINER` functions explicitly schema-qualify `trim()` as `pg_catalog.trim(...)`. In PostgreSQL, `pg_catalog` exposes `btrim(text)`; `trim()` is only SQL grammar that the parser rewrites to `btrim`. Schema-qualifying it bypasses that rewrite, so resolution fails at execution time with `function pg_catalog.trim(text) does not exist`.

### Submission-path offender (causes the candidate L2 toast)
`public.emit_feed_signal(...)` — invoked by trigger `trg_emit_challenge_completed` (`AFTER INSERT OR UPDATE ON public.challenge_submissions`) via `emit_challenge_completed_signal()`.

```sql
validated_source := pg_catalog.lower(pg_catalog.trim(p_source));
```

The L2 `INSERT INTO challenge_submissions(status='submitted', ...)` fires the trigger → trigger calls `emit_feed_signal('challenge_completed','candidate',...)` → `pg_catalog.trim('candidate')` fails → whole INSERT rolls back → red toast surfaces the raw Postgres error.

### Second offender (same bug, not on submission path)
`public.get_candidate_visibility()` calls `pg_catalog.TRIM(p.name)` and `pg_catalog.TRIM(p.full_name)`. This breaks the business candidate browser; fix it in the same migration since the root cause and one-line fix are identical.

## Fix — single migration, replace `pg_catalog.trim(` with `btrim(`

`CREATE OR REPLACE FUNCTION` for both functions, byte-for-byte identical bodies except:

- `emit_feed_signal`: `pg_catalog.trim(p_source)` → `btrim(p_source)`
- `get_candidate_visibility`: `pg_catalog.TRIM(p.name)` → `btrim(p.name)`, `pg_catalog.TRIM(p.full_name)` → `btrim(p.full_name)`

`btrim` lives in `pg_catalog` and is the underlying implementation of `trim()` — semantics are identical, no behavioral change.

Preserve `SECURITY DEFINER`, `SET search_path = public`, return types, language, volatility on both functions. No signature changes, no trigger changes, no schema changes, no GRANT changes.

## Validation

1. After migration, as the affected candidate, re-submit the L2 challenge → INSERT succeeds, no toast error, row lands in `challenge_submissions` with `status='submitted'`, and a `feed_items` row is emitted by `emit_feed_signal`.
2. As a business user, open the candidate browser → `get_candidate_visibility()` returns rows without error.
3. `psql` recheck:
   ```sql
   SELECT proname FROM pg_proc WHERE prosrc ILIKE '%pg_catalog.trim(%';
   ```
   should return zero rows.
4. No new Postgres ERROR entries mentioning `pg_catalog.trim`.

## Scope

- One migration: `CREATE OR REPLACE FUNCTION public.emit_feed_signal(...)`, `CREATE OR REPLACE FUNCTION public.get_candidate_visibility(...)`.
- No frontend changes.
- No trigger / RLS / schema / signature changes.

Awaiting approval to switch to build mode.
