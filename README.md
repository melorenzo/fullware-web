# Fullware

**Automatización, IA y servidores propios.** Sitio de Fullware: servicios, proyectos, blog, consola de contacto y SOFI, nuestro asistente de IA.

<p>
  <img alt="Astro" src="https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="Hono" src="https://img.shields.io/badge/API-Hono-E36002?logo=hono&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Deploy-Docker%20%2B%20Caddy-2496ED?logo=docker&logoColor=white">
</p>

> Sitio estático ultrarrápido, con API propia para lo que necesita estado. Sin frameworks de más, sin dependencias que no se usan.

---

## Qué hay adentro

| Sección | Qué hace |
| --- | --- |
| `/` | Home con hero, servicios, proceso, proyectos destacados y contacto |
| `/proyectos` | Casos con stack, estado y resultado |
| `/blog` | Blog integrado: trae las notas del blog oficial en vivo, con el estilo del sitio |
| `/juego` | Solitario Klondike hecho desde cero, como demo interactiva |
| `/matias` | Sobre Matías, con links a la web personal y al blog |
| `Ctrl + K` | Paleta de comandos para navegar el sitio sin mouse |
| SOFI | Chat de IA que responde sobre Fullware (NVIDIA Nemotron) |
| Consola de contacto | Flujo guiado paso a paso, con resumen antes de enviar |

Detalles que nos importan: HTML semántico, contraste AA, foco visible, `prefers-reduced-motion` respetado y diseño mobile first (probado a 375, 768 y 1280px).

## Stack

- **Frontend:** Astro 7 (`output: static`), TypeScript estricto y Tailwind v4.
- **Islas React:** solo donde hace falta interacción real (`client:load` / `client:visible`) — consola, chat, paleta y solitario.
- **API:** Hono + `better-sqlite3` + zod, en `api/`.
- **Deploy:** Docker Compose + Caddy (HTTPS automático) en servidor propio.

## Estructura

```
src/
  components/          componentes Astro
    islands/           React: CommandPalette, ContactConsole, SofiChat, Solitaire
  data/                contenido editable: site, services, projects
  pages/               index, proyectos, blog, juego, matias, 404, rss.xml
  styles/global.css    tokens de diseño y estilos base
api/
  src/                 index, contact, sofi, blog (proxy RSS), db, limits, env
scripts/package.sh     genera el tar de deploy
Caddyfile              estáticos + proxy /api + 404 propio
docker-compose.yml     web + api
deploy.sh              build, up, health check y verificación HTTPS
```

## Desarrollo local

Requisitos: Node `>= 22.23.4`.

```bash
npm install
cp .env.example .env    # completar valores
npm run dev             # http://localhost:4321
```

La API, en otra terminal:

```bash
cd api
npm install
npm run dev             # http://localhost:3000
```

Astro proxya `/api/*` a `localhost:3000`, así que la consola de contacto, SOFI y el blog funcionan igual en local que en producción.

### Checks antes de commitear

```bash
npm run check              # 0 errores, 0 warnings, 0 hints
npm run build
cd api && npm run build
```

## Variables de entorno

Todo va en `.env` (nunca commiteado). Partí de `.env.example`.

| Variable | Para qué |
| --- | --- |
| `PUBLIC_SITE_URL` | URL pública del sitio (se inlinea en el build) |
| `PUBLIC_WHATSAPP_NUMBER` | Número de WhatsApp, solo dígitos |
| `PUBLIC_CONTACT_EMAIL` | Mail de contacto público |
| `WAHA_URL` / `WAHA_API_KEY` / `WAHA_SESSION` / `WAHA_NOTIFY_CHAT_ID` | Avisos de consultas por WhatsApp |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Avisos de consultas por Telegram |
| `MAIL_WORKER_URL` / `MAIL_WORKER_TOKEN` / `MAIL_WORKER_TO` | Reenvío de consultas por el Worker de Cloudflare |
| `SOFI_API_URL` / `SOFI_API_KEY` / `SOFI_MODEL` | Proveedor de IA compatible con OpenAI |
| `SOFI_DAILY_GLOBAL_CAP` / `SOFI_TEMPERATURE` / `SOFI_MAX_TOKENS` | Límites y parámetros de SOFI |
| `IP_HASH_SALT` / `SOFI_COOKIE_SECRET` | Secretos de hashing y cookies (largos y distintos) |

**Nada se pierde:** si no hay WAHA, Telegram ni Worker configurados, las consultas quedan igual en `data/fullware.sqlite`. Si no hay proveedor de IA, SOFI deriva al contacto y **no** descuenta preguntas.

## API

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `GET` | `/api/health` | Health check (lo usa el compose) |
| `POST` | `/api/contact` | Recibe la consulta, avisa por WAHA/Telegram/Worker y guarda si falla todo |
| `POST` | `/api/sofi` | Chat de SOFI con rate limit por IP y tope global diario |
| `GET` | `/api/blog/feed` | Proxy del RSS del blog oficial (evita CORS en el navegador) |

La consola y SOFI tienen honeypot, rate limit por IP y tope global: son formularios públicos.

## Contenido editable

Nada de texto hardcodeado en los componentes. Todo vive en `src/data/`:

- `site.ts` — nombre, URL, mail, WhatsApp, redes y links del nav.
- `services.ts` — servicios que se muestran en la home.
- `projects.ts` — proyectos, stack, estado y resultado.

## Blog integrado

El blog oficial vive en [blog.fullware.com.ar](https://blog.fullware.com.ar/). `/blog` **no** duplica los posts: los trae en vivo desde el feed (vía `/api/blog/feed`, que evita el problema de CORS) y los muestra con el estilo del sitio, abriendo cada nota en el blog original.

Resultado: publicás en WordPress y la entrada aparece al instante, sin rebuild ni deploy.

## Deploy

Generás el paquete y lo llevás al servidor:

```bash
bash scripts/package.sh     # fullware-web-deploy.tar.gz
```

Allá:

```bash
tar xzf fullware-web-deploy.tar.gz
cd fullware-web
cp .env.example .env        # completar tokens y secretos
./deploy.sh
```

`deploy.sh` construye las imágenes, levanta el compose, espera `/api/health`, verifica HTTPS y que el 404 propio responda.

El paquete excluye `.env`, `node_modules`, `dist`, `.git` y los datos locales.

### Worker de mails (Cloudflare)

El Worker `mail-matydev` recibe las consultas por mail. Las rutas configuradas:

```
*.fullware.com.ar/*        → worker
matiaslorenzo.dev/*        → a borrar (dominio dado de baja)
```

Con la ruta wildcard, tanto `fullware.com.ar/api/contact` como `matiaslorenzo.fullware.com.ar/api/contact` responden con el mismo Worker.

## Pendientes

- [ ] Logo definitivo (hoy es el logotipo tipográfico `FULLWARE_`).
- [ ] Métricas y resultados reales por proyecto.
- [ ] Posts propios en `src/content/blog/` si se quiere contenido local además del blog oficial.
- [ ] Tests automatizados para la API.
