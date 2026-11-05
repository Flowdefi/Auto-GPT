#!/usr/bin/env bash
# Consistent SQLite backup of meridian/data/meridian.db with 14-day retention.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="${MERIDIAN_DB:-$ROOT/data/meridian.db}"
DEST="$ROOT/data/backups"
mkdir -p "$DEST"

if [[ ! -f "$DB" ]]; then
  echo "No database at $DB" >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$DEST/meridian-$STAMP.db"

if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB" ".backup $OUT"
else
  node --experimental-sqlite "$ROOT/scripts/sqlite-backup.mjs" "$DB" "$OUT"
fi

find "$DEST" -type f -name 'meridian-*.db' -mtime +14 -delete
echo "$OUT"
