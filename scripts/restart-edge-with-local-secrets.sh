#!/usr/bin/env bash
# Recreate local supabase_edge_runtime_* with EMAILIT/EASIFY from repo .env.
# Required for send-email / send-sms happy-path Vitest suites against Kong.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CONTAINER="${EDGE_CONTAINER:-supabase_edge_runtime_khadayata-local}"
NETWORK="${EDGE_NETWORK:-supabase_network_khadayata-local}"
ALIAS="${EDGE_ALIAS:-edge_runtime}"
IMAGE_TAG="${EDGE_IMAGE_TAG:-khadayata-edge-local:secrets}"

need() { grep -m1 "^$1=" .env | cut -d= -f2-; }
EMAILIT="$(need EMAILIT_API_KEY)"
EASIFY="$(need EASIFY_API_TOKEN)"
FROM="$(need EASIFY_FROM_NUMBER)"

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "Container $CONTAINER not found" >&2
  exit 1
fi

docker inspect "$CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' > /tmp/edge-env-base.txt
grep -v -E '^(EMAILIT_API_KEY|EASIFY_API_TOKEN|EASIFY_FROM_NUMBER)=' /tmp/edge-env-base.txt > /tmp/edge-env-secrets.txt
printf 'EMAILIT_API_KEY=%s\nEASIFY_API_TOKEN=%s\nEASIFY_FROM_NUMBER=%s\n' \
  "$EMAILIT" "$EASIFY" "$FROM" >> /tmp/edge-env-secrets.txt

docker commit "$CONTAINER" "$IMAGE_TAG"
docker stop "$CONTAINER"
BAK="${CONTAINER}_bak_$(date +%s)"
docker rename "$CONTAINER" "$BAK"

docker run -d \
  --name "$CONTAINER" \
  --env-file /tmp/edge-env-secrets.txt \
  --network "$NETWORK" \
  --network-alias "$ALIAS" \
  -v supabase_edge_runtime_khadayata-local:/root/.cache/deno \
  -v "$ROOT/supabase/functions:/Users/roshanshah/Projects/khadayata/supabase/functions:ro" \
  --entrypoint sh \
  "$IMAGE_TAG" \
  -c 'exec edge-runtime start --main-service=/root --port=8081 --policy=per_worker'

sleep 3
docker logs "$CONTAINER" 2>&1 | tail -8
docker exec "$CONTAINER" sh -c 'echo EMAILIT=${EMAILIT_API_KEY:+set} EASIFY=${EASIFY_API_TOKEN:+set}'
echo "Old container kept as $BAK — remove when healthy: docker rm -f $BAK"
