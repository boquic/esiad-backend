#!/usr/bin/env bash
# Runner de las pruebas k6 vía Docker (no requiere instalar k6).
# Uso desde la raíz del repo:
#   bash k6/run.sh performance
#   bash k6/run.sh stress
#   bash k6/run.sh concurrency
#   BASE_URL=http://host.docker.internal:8080 bash k6/run.sh performance
set -eu

# Evita que Git Bash (MSYS) en Windows reescriba las rutas tipo /scripts a
# rutas Windows (C:/Program Files/Git/scripts/...).
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

SCRIPT="${1:-performance}"
BASE_URL="${BASE_URL:-http://host.docker.internal:8080}"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "== k6: $SCRIPT contra $BASE_URL =="
docker run --rm -i \
  -e BASE_URL="$BASE_URL" \
  -v "$DIR:/scripts" \
  grafana/k6 run "/scripts/${SCRIPT}.js"
