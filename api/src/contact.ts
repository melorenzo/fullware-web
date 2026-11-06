import { Hono } from 'hono'
import { z } from 'zod'
import { saveContact } from './db.js'
import { env } from './env.js'
import { clientIp, contactAllowed, ipKey } from './limits.js'

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  need: z.string().trim().min(5).max(1000),
  contact: z.string().trim().min(5).max(120),
})

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  dateStyle: 'short',
  timeStyle: 'short',
})

async function sendWaha(text: string): Promise<boolean> {
  if (!env.WAHA_URL || !env.WAHA_NOTIFY_CHAT_ID) return false

  try {
    const response = await fetch(`${env.WAHA_URL.replace(/\/$/, '')}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.WAHA_API_KEY ? { 'X-Api-Key': env.WAHA_API_KEY } : {}),
      },
      body: JSON.stringify({
        session: env.WAHA_SESSION,
        chatId: env.WAHA_NOTIFY_CHAT_ID,
        text,
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) console.error('WAHA respondió', response.status)
    return response.ok
  } catch (error) {
    console.error('WAHA falló', error)
    return false
  }
}

async function sendTelegram(text: string): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
        signal: AbortSignal.timeout(8000),
      },
    )

    if (!response.ok) console.error('Telegram respondió', response.status)
    return response.ok
  } catch (error) {
    console.error('Telegram falló', error)
    return false
  }
}

async function sendMailWorker(text: string, data: z.infer<typeof schema>): Promise<boolean> {
  const url = (env as any).MAIL_WORKER_URL || (env as any).EMAIL_WORKER_URL || (env as any).CF_MAIL_WORKER_URL
  if (!url) return false

  try {
    const response = await fetch(url.replace(/\/$/, ''), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...( (env as any).MAIL_WORKER_TOKEN ? { Authorization: `Bearer ${(env as any).MAIL_WORKER_TOKEN}` } : {} ),
      },
      body: JSON.stringify({
        name: data.name,
        need: data.need,
        contact: data.contact,
        message: text,
        subject: 'Nueva consulta en fullware.com.ar',
        to: (env as any).MAIL_WORKER_TO || (env as any).PUBLIC_CONTACT_EMAIL || undefined,
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) console.error('Mail Worker respondió', response.status)
    return response.ok
  } catch (error) {
    console.error('Mail Worker falló', error)
    return false
  }
}

export const contact = new Hono()

contact.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return c.json({ ok: false, error: 'datos inválidos' }, 400)
  }

  // Honeypot: si viene lleno, descartamos en silencio.
  const honeypot = (body as Record<string, unknown>).website
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return c.json({ ok: true })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return c.json({ ok: false, error: 'revisá los datos' }, 400)
  }

  const data = parsed.data
  const ip = clientIp(c.req.raw.headers)

  if (!contactAllowed(ipKey(ip))) {
    return c.json({ ok: false, error: 'rate_limited' }, 429)
  }

  const text = [
    'Nueva consulta en fullware.com.ar',
    '',
    `Nombre: ${data.name}`,
    `Necesidad: ${data.need}`,
    `Contacto: ${data.contact}`,
    `Fecha: ${dateFormatter.format(new Date())}`,
  ].join('\n')

  const results = await Promise.allSettled([sendWaha(text), sendTelegram(text), sendMailWorker(text, data)])
  const delivered = results.some((result) => result.status === 'fulfilled' && result.value)

  if (!delivered) {
    // Nunca perder un lead: si no salió por ningún canal, queda en SQLite.
    saveContact(data)
    console.error('Consulta guardada en SQLite: no se pudo avisar por ningún canal')
  }

  return c.json({ ok: true, delivered })
})
