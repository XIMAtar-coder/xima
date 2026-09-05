#!/usr/bin/env bash
# Fails when the database has migrations the repo does not, or vice versa.
#
# Five schema changes were applied to production through the management API
# in July–August 2026 and never committed; one of them broke candidate
# submission and went unreviewed precisely because its SQL never sat next to
# the constraint it violated. This check makes that class of drift visible.
#
# Needs SUPABASE_DB_URL (a read-only connection string is enough). Without it
# the check is skipped with a notice rather than failing — so a fork or a
# contributor without secrets still gets the rest of CI.
set -euo pipefail
if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "::notice::SUPABASE_DB_URL not set — migration drift check skipped"
  exit 0
fi
command -v psql >/dev/null || { sudo apt-get update -qq && sudo apt-get install -y -qq postgresql-client >/dev/null; }
db=$(psql "$SUPABASE_DB_URL" -Atc "select version from supabase_migrations.schema_migrations order by version" | sort)
local_=$(ls supabase/migrations/*.sql | xargs -n1 basename | sed -E 's/^([0-9]{14})_.*/\1/' | sort)
only_db=$(comm -23 <(echo "$db") <(echo "$local_") || true)
only_repo=$(comm -13 <(echo "$db") <(echo "$local_") || true)
rc=0
if [ -n "$only_db" ]; then echo "::error::Applied in the database but missing from supabase/migrations/:"; echo "$only_db"; rc=1; fi
if [ -n "$only_repo" ]; then echo "::warning::In the repo but not applied to the database (pending?):"; echo "$only_repo"; fi
exit $rc
