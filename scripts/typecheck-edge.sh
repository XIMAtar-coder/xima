#!/usr/bin/env bash
# Edge functions run on Deno and sit outside tsconfig.app.json, so `npm run
# typecheck` never sees them. A plain tsc pass over them is noisy (Deno globals
# and URL imports are unknown to it), but a few diagnostics are real regardless
# of runtime — and one of them, TS2588 "assignment to constant", took the L1
# scorer down with an HTTP 500 on 2026-09-05. This fails only on those.
set -uo pipefail
files=$(ls supabase/functions/*/index.ts supabase/functions/_shared/*.ts | grep -v '\.test\.')
out=$(npx tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --skipLibCheck \
  --allowImportingTsExtensions --noResolve --isolatedModules $files 2>&1 || true)
# TS2588 const assignment · TS2540 readonly assignment · TS2451 redeclared block var · TS1xxx syntax
real=$(echo "$out" | grep -E "error TS(2588|2540|2451|1[0-9]{3}):" || true)
if [ -n "$real" ]; then echo "$real"; echo "edge typecheck: FAILED"; exit 1; fi
echo "edge typecheck: ok ($(echo "$out" | grep -c 'error TS' ) runtime-typing diagnostics ignored)"
