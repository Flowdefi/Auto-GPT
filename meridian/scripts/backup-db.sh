#!/usr/bin/env bash
# Encrypted SQLite backup of meridian/data/meridian.db.
# Usage: scripts/backup-db.sh [directory]
# Default destination is data/backups. Keeps 14 days and at most 14 files.
# Node AES-256-GCM files (magic MDBC1) restore with:
#   export MERIDIAN_BACKUP_KEY='...'
#   node scripts/backup-crypt.mjs dec data/backups/meridian-STAMP.db.enc data/meridian.db
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:-$ROOT/data/backups}"
if [[ "$DEST" == *"'"* ]]; then
  echo "Backup directory cannot contain a single quote" >&2
  exit 1
fi

DB="${MERIDIAN_SQLITE:-${MERIDIAN_DB:-$ROOT/data/meridian.db}}"
if [[ ! -f "$DB" ]]; then
  echo "Database not found: $DB" >&2
  exit 1
fi
if [[ "$DB" == *"'"* ]]; then
  echo "Database path cannot contain a single quote" >&2
  exit 1
fi

read_env_file() {
  local file="$1" key val line
  [[ -f "$file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" == MERIDIAN_BACKUP_KEY=* || "$line" == MERIDIAN_SECRET_KEY=* ]] || continue
    key="${line%%=*}"
    val="${line#*=}"
    val="${val%\"}"
    val="${val#\"}"
    val="${val%\'}"
    val="${val#\'}"
    if [[ -z "${!key:-}" ]]; then
      printf -v "$key" '%s' "$val"
      export "$key"
    fi
  done < "$file"
}

read_env_file "$ROOT/.env.local"
read_env_file "$ROOT/.env"

PASSPHRASE="${MERIDIAN_BACKUP_KEY:-${MERIDIAN_SECRET_KEY:-}}"
if [[ -z "$PASSPHRASE" ]]; then
  echo "Set MERIDIAN_BACKUP_KEY or MERIDIAN_SECRET_KEY before backing up." >&2
  exit 1
fi
export MERIDIAN_BACKUP_KEY="$PASSPHRASE"

mkdir -p "$DEST"
chmod 700 "$DEST" 2>/dev/null || true

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PLAIN="$DEST/meridian-$STAMP.db"
if [[ -e "$PLAIN" ]]; then
  PLAIN="$DEST/meridian-${STAMP}-$$.db"
fi
OUT="$PLAIN.enc"

cleanup() {
  rm -f "$PLAIN"
}
trap cleanup EXIT

node "$ROOT/scripts/vacuum-into.mjs" "$DB" "$PLAIN"
chmod 600 "$PLAIN"

ITER=200000
if echo probe | openssl enc -aes-256-gcm -salt -pbkdf2 -iter "$ITER" -pass env:MERIDIAN_BACKUP_KEY >/dev/null 2>&1; then
  openssl enc -aes-256-gcm -salt -pbkdf2 -iter "$ITER" \
    -in "$PLAIN" -out "$OUT" -pass env:MERIDIAN_BACKUP_KEY
else
  node "$ROOT/scripts/backup-crypt.mjs" enc "$PLAIN" "$OUT"
fi
chmod 600 "$OUT"
rm -f "$PLAIN"
trap - EXIT

find "$DEST" -type f \( -name 'meridian-*.db' -o -name 'meridian-*.db.enc' \) -mtime +14 -delete 2>/dev/null || true
mapfile -t FILES < <(ls -1t "$DEST"/meridian-*.db.enc "$DEST"/meridian-*.db 2>/dev/null || true)
if ((${#FILES[@]} > 14)); then
  for old in "${FILES[@]:14}"; do
    rm -f "$old"
  done
fi

echo "$OUT"
