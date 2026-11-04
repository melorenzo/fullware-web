# Fullware

Sitio del negocio Fullware: automatización, agentes de IA, bots de WhatsApp (WAHA), tableros, DevOps y capacitación.

Astro 7 (output estático) + React en islas + TypeScript estricto + Tailwind v4.
API propia en `api/` con Hono + SQLite (better-sqlite3) + zod.
Deploy con Docker Compose + Caddy (HTTPS automático) en servidor propio.

## Desarrollo

```bash
npm install
cp .env.example .env   # completar valores
npm run dev            # http://localhost:4321
```

La API en otra terminal:

```bash
cd api
npm install
npm run dev            # http://localhost:3000
```

Astro proxya `/api/*` a `localhost:3000` en desarrollo, así que la consola de contacto y SOFI funcionan en local.

## Checks

```bash
npm run check
npm run build
cd api && npm run typecheck
```

## Deploy

El paquete de deploy se genera con `scripts/package.sh` en `fullware-web-deploy.tar.gz`.
En el servidor:

```bash
tar xzf fullware-web-deploy.tar.gz
cd fullware-web
cp .env.example .env    # completar tokens y secretos
./deploy.sh
```

`deploy.sh` construye las imágenes, levanta el compose, espera `/api/health` y verifica HTTPS y el 404.

Variables imprescindibles en `.env`:

- `PUBLIC_SITE_URL`, `PUBLIC_WHATSAPP_NUMBER`, `PUBLIC_CONTACT_EMAIL`
- `WAHA_URL`, `WAHA_API_KEY`, `WAHA_SESSION`, `WAHA_NOTIFY_CHAT_ID`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `SOFI_API_URL`, `SOFI_API_KEY`, `SOFI_MODEL`
- `IP_HASH_SALT`, `SOFI_COOKIE_SECRET` (strings largos y distintos)

Sin WAHA ni Telegram configurados, las consultas se guardan igual en SQLite (`data/fullware.sqlite`) y no se pierde ningún lead.
Sin proveedor de IA configurado, SOFI responde con un mensaje de derivación y **no** descuenta preguntas.

## Estructura

```
src/
  components/        componentes Astro + islands/ (React)
  content/blog/      posts
  data/              servicios, proyectos, configuración del sitio
  pages/             index, proyectos, blog, juego, matias, 404
  styles/global.css  tokens y estilos base
api/                 Hono + SQLite
Caddyfile            estáticos + proxy /api + 404
docker-compose.yml   web + api
```

## Pendientes de contenido

- Foto de Matías (`public/matias.jpg`): hoy hay un placeholder con iniciales.
- Logo definitivo: hoy se usa el logo tipográfico `FULLWARE_`.
- Métricas reales por proyecto (`result` en `src/data/projects.ts`).
- Primer post del blog (hay uno en borrador en `src/content/blog/hola-mundo.md`).
- Código original del solitario, si se quiere reemplazar el actual (hecho desde cero en este repo).
