#!/usr/bin/env bash
# Consistent SQLite backup. Usage: scripts/backup-db.sh <directory>
set -euo pipefail

DEST="${1:-}"
if [[ -z "$DEST" ]]; then
  echo "Usage: scripts/backup-db.sh <directory>" >&2
  exit 1
fi
if [[ "$DEST" == *"'"* ]]; then
  echo "Backup directory cannot contain a single quote" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="${MERIDIAN_SQLITE:-$ROOT/data/meridian.db}"
if [[ ! -f "$DB" ]]; then
  echo "Database not found: $DB" >&2
  exit 1
fi
if [[ "$DB" == *"'"* ]]; then
  echo "Database path cannot contain a single quote" >&2
  exit 1
fi

mkdir -p "$DEST"
STAMP="$(date -u +%Y%m%dT%H%M%S%NZ)"
OUT="$DEST/meridian-$STAMP.db"
if [[ -e "$OUT" ]]; then
  OUT="$DEST/meridian-${STAMP}-$$.db"
fi

node "$ROOT/scripts/vacuum-into.mjs" "$DB" "$OUT"

echo "Wrote $OUT"

mapfile -t FILES < <(ls -1t "$DEST"/meridian-*.db 2>/dev/null || true)
if ((${#FILES[@]} > 14)); then
  for old in "${FILES[@]:14}"; do
    rm -f "$old"
  done
fi
