-- XIMA — Ottimizzazione RLS: wrap di auth.uid()/auth.jwt() in (select ...)
-- Fix advisor "auth_rls_initplan": Postgres valuta la funzione UNA volta per query
-- invece che per ogni riga. SEMANTICAMENTE IDENTICA: non cambia quali righe sono visibili,
-- cambia solo la performance a scala.
--
-- Sicurezza/robustezza:
--  * Usa ALTER POLICY → modifica SOLO l'espressione USING/WITH CHECK; ruoli, comando e nome
--    restano invariati (nessuna finestra in cui la policy "sparisce").
--  * Tutto in un'unica transazione: se anche una sola ALTER fallisce, rollback totale.
--  * Tocca solo le policy che contengono auth.uid()/auth.jwt() NON già wrappati.
--
-- DOPO l'applicazione: testare i flussi chiave (admin/ruoli, business dashboard, profilo candidato,
-- messaggi) e ri-eseguire l'advisor di performance per confermare il calo di auth_rls_initplan.
DO $$
DECLARE
  r record;
  new_qual text;
  new_check text;
  stmt text;
  cnt int := 0;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual       IS NOT NULL AND qual       ~ 'auth\.(uid|jwt)\(\)' AND qual       !~ '\(\s*select\s+auth\.(uid|jwt)\(\)')
        OR (with_check IS NOT NULL AND with_check ~ 'auth\.(uid|jwt)\(\)' AND with_check !~ '\(\s*select\s+auth\.(uid|jwt)\(\)')
      )
  LOOP
    new_qual  := r.qual;
    new_check := r.with_check;
    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual,  'auth\.uid\(\)',  '(select auth.uid())',  'g');
      new_qual := regexp_replace(new_qual,  'auth\.jwt\(\)',  '(select auth.jwt())',  'g');
    END IF;
    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, 'auth\.uid\(\)',  '(select auth.uid())',  'g');
      new_check := regexp_replace(new_check, 'auth\.jwt\(\)',  '(select auth.jwt())',  'g');
    END IF;
    IF r.qual IS NOT NULL AND r.with_check IS NOT NULL THEN
      stmt := format('ALTER POLICY %I ON public.%I USING (%s) WITH CHECK (%s)',
                     r.policyname, r.tablename, new_qual, new_check);
    ELSIF r.qual IS NOT NULL THEN
      stmt := format('ALTER POLICY %I ON public.%I USING (%s)',
                     r.policyname, r.tablename, new_qual);
    ELSE
      stmt := format('ALTER POLICY %I ON public.%I WITH CHECK (%s)',
                     r.policyname, r.tablename, new_check);
    END IF;
    EXECUTE stmt;
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE 'RLS policies ottimizzate: %', cnt;
END $$;