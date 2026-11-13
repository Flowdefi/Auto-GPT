#!/usr/bin/env bash
# Nightly Graph sync. Requires a running Meridian and MERIDIAN_API_KEY.
set -euo pipefail

WORKSPACE="${1:-triton}"
BASE="${MERIDIAN_PUBLIC_URL:-http://127.0.0.1:3000}"
if [[ -z "${MERIDIAN_API_KEY:-}" ]]; then
  echo "Set MERIDIAN_API_KEY to an mk_live_ key from npm run key:create" >&2
  exit 1
fi
if [[ "$WORKSPACE" != "triton" && "$WORKSPACE" != "aether" ]]; then
  echo "Workspace must be triton or aether" >&2
  exit 1
fi

curl -fsS -X POST "$BASE/api/outlook" \
  -H "Authorization: Bearer ${MERIDIAN_API_KEY}" \
  -H "content-type: application/json" \
  -d "{\"workspaceId\":\"${WORKSPACE}\"}"
echo
