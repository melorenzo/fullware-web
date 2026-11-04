#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-fullware-web-deploy.tar.gz}"

tar --exclude='./node_modules' \
    --exclude='./dist' \
    --exclude='./.astro' \
    --exclude='./.git' \
    --exclude='./.freebuff' \
    --exclude='./.vscode' \
    --exclude='./.env' \
    --exclude='./data' \
    --exclude='./api/node_modules' \
    --exclude='./api/dist' \
    --exclude='./api/data' \
    --exclude='./*.tar.gz' \
    --exclude='./*.log' \
    -czf "$OUT" .

echo "Paquete creado: $OUT"
tar -tzf "$OUT" | wc -l | xargs echo "archivos:"
