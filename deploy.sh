#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

say() { printf '\n\033[1;33m→ %s\033[0m\n' "$*"; }

if ! command -v docker >/dev/null 2>&1; then
  echo "Falta Docker en este servidor."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Falta Docker Compose v2 (plugin 'docker compose')."
  exit 1
fi

if [ ! -f .env ]; then
  echo "Falta el archivo .env."
  echo "Copiá .env.example a .env y completá los valores antes de deployar."
  exit 1
fi

if grep -q '549XXXXXXXXXX' .env; then
  echo "Aviso: PUBLIC_WHATSAPP_NUMBER todavía tiene el placeholder del .env.example."
fi

if grep -q '^PUBLIC_WHATSAPP_NUMBER=$' .env || grep -q '^PUBLIC_CONTACT_EMAIL=$' .env; then
  echo "Aviso: hay variables públicas vacías en .env (WhatsApp o mail)."
fi

DOMAIN="$(grep -E '^PUBLIC_SITE_URL=' .env | head -1 | cut -d= -f2- | sed -E 's#https?://##; s#/.*##')"
DOMAIN="${DOMAIN:-fullware.com.ar}"

mkdir -p data
if [ "$(id -u)" -eq 0 ]; then
  # La API corre como usuario node (uid 1000) dentro del contenedor.
  chown -R 1000:1000 data
fi

say "Construyendo imágenes"
docker compose build --pull

say "Levantando servicios"
docker compose up -d --remove-orphans

say "Verificando la API"
for _ in $(seq 1 30); do
  if docker compose exec -T api node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! docker compose exec -T api node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
  echo "La API no responde. Revisá: docker compose logs api"
  exit 1
fi
echo "OK /api/health"

say "Esperando certificado y HTTPS para $DOMAIN"
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null "https://$DOMAIN" 2>/dev/null; then
    break
  fi
  sleep 2
done

if curl -fsS -o /dev/null "https://$DOMAIN" 2>/dev/null; then
  echo "OK https://$DOMAIN"
  health="$(curl -fsS "https://$DOMAIN/api/health" || true)"
  echo "API pública: ${health:-sin respuesta}"
  notfound="$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/esta-ruta-no-existe" || echo 000)"
  echo "404 propio: $notfound"
else
  echo "No pude verificar HTTPS todavía. Revisá DNS y: docker compose logs web"
fi

docker compose ps

say "Deploy terminado"
