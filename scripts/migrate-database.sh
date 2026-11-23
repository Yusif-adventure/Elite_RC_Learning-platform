#!/usr/bin/env bash
# Applies each supabase/NNN_name.sql file to the database once, in number
# order, and records it in public.schema_migrations so it never runs again.
# Each file runs in one transaction: if it fails, nothing from it is kept,
# it is not recorded, and the run stops.
#
# Needs SUPABASE_DB_URL: the Supabase "Session pooler" connection string,
# with the database password filled in.
#
# The first run records files up to MIGRATION_BASELINE (default 006) as
# already applied without running them, because those were run by hand in
# the Supabase SQL editor before this script existed. 001 in particular adds
# sample courses, which must not come back.
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to the Supabase Session pooler connection string.}"
BASELINE="${MIGRATION_BASELINE:-006}"
cd "$(dirname "$0")/.."

run_sql() {
  psql "$SUPABASE_DB_URL" --no-psqlrc --quiet -v ON_ERROR_STOP=1 "$@"
}

run_sql <<'SQL'
create table if not exists public.schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);
alter table public.schema_migrations enable row level security;
revoke all on public.schema_migrations from anon, authenticated;
SQL

shopt -s nullglob
files=(supabase/[0-9][0-9][0-9]_*.sql)
if [ "${#files[@]}" -eq 0 ]; then
  echo "No SQL files found in supabase/."
  exit 0
fi

if [ "$(run_sql -tAc "select count(*) from public.schema_migrations")" = "0" ]; then
  echo "First run: recording files up to ${BASELINE} as already applied by hand."
  for file in "${files[@]}"; do
    name="$(basename "$file")"
    number="${name%%_*}"
    if (( 10#$number <= 10#$BASELINE )); then
      run_sql -v name="$name" <<'SQL'
insert into public.schema_migrations (filename) values (:'name') on conflict do nothing;
SQL
      echo "  recorded ${name}"
    fi
  done
fi

applied="$(run_sql -tAc "select filename from public.schema_migrations")"
ran=0
for file in "${files[@]}"; do
  name="$(basename "$file")"
  if grep -qxF "$name" <<<"$applied"; then
    echo "Already applied: ${name}"
    continue
  fi
  echo "Applying: ${name}"
  { cat "$file"; printf '\ninsert into public.schema_migrations (filename) values (%s);\n' "'${name}'"; } \
    | run_sql --single-transaction -f -
  ran=$((ran + 1))
done

echo "Done. Applied ${ran} new file(s)."
