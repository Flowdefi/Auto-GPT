#!/usr/bin/env bash
# Encrypted SQLite backup of meridian/data/meridian.db. Keeps 14 days.
# Node AES-256-GCM files (magic MDBC1) restore with:
#   export MERIDIAN_BACKUP_KEY='...'
#   node scripts/backup-crypt.mjs dec data/backups/meridian-STAMP.db.enc data/meridian.db
# OpenSSL enc files, on a host whose enc command accepts AES-GCM, restore with:
#   openssl enc -d -aes-256-gcm -pbkdf2 -iter 200000 \
#     -in data/backups/meridian-STAMP.db.enc -out data/meridian.db \
#     -pass env:MERIDIAN_BACKUP_KEY
# Stop the app before replacing the live database. chmod 600 the restored file.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="${MERIDIAN_DB:-$ROOT/data/meridian.db}"
DEST="$ROOT/data/backups"
ITER=200000

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
chmod 700 "$DEST"

if [[ ! -f "$DB" ]]; then
  echo "No database at $DB" >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PLAIN="$DEST/meridian-$STAMP.db"
OUT="$PLAIN.enc"

cleanup() {
  rm -f "$PLAIN"
}
trap cleanup EXIT

if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB" ".backup $PLAIN"
else
  node --experimental-sqlite "$ROOT/scripts/sqlite-backup.mjs" "$DB" "$PLAIN"
fi
chmod 600 "$PLAIN"

# OpenSSL 3's `enc` command rejects AES-GCM ("AEAD ciphers not supported").
# Use it when this host accepts it; otherwise Node AES-256-GCM with the same passphrase.
if echo probe | openssl enc -aes-256-gcm -salt -pbkdf2 -iter "$ITER" -pass env:MERIDIAN_BACKUP_KEY >/dev/null 2>&1; then
  openssl enc -aes-256-gcm -salt -pbkdf2 -iter "$ITER" \
    -in "$PLAIN" -out "$OUT" -pass env:MERIDIAN_BACKUP_KEY
else
  node "$ROOT/scripts/backup-crypt.mjs" enc "$PLAIN" "$OUT"
fi
chmod 600 "$OUT"
rm -f "$PLAIN"
trap - EXIT

find "$DEST" -type f \( -name 'meridian-*.db' -o -name 'meridian-*.db.enc' \) -mtime +14 -delete
echo "$OUT"
