import { z } from 'zod'

const positiveInt = (fallback: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined
    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric <= 0) return undefined
    return numeric
  }, z.number().int().positive().default(fallback))

const schema = z.object({
  PORT: positiveInt(3000),
  DB_PATH: z.string().default('./data/fullware.sqlite'),
  IP_HASH_SALT: z.string().min(8, 'IP_HASH_SALT tiene que tener al menos 8 caracteres'),
  SOFI_COOKIE_SECRET: z.string().min(8, 'SOFI_COOKIE_SECRET tiene que tener al menos 8 caracteres'),
  WAHA_URL: z.string().default(''),
  WAHA_API_KEY: z.string().default(''),
  WAHA_SESSION: z.string().default('default'),
  WAHA_NOTIFY_CHAT_ID: z.string().default(''),
  TELEGRAM_BOT_TOKEN: z.string().default(''),
  TELEGRAM_CHAT_ID: z.string().default(''),
  MAIL_WORKER_URL: z.string().default(''),
  EMAIL_WORKER_URL: z.string().default(''),
  CF_MAIL_WORKER_URL: z.string().default(''),
  MAIL_WORKER_TOKEN: z.string().default(''),
  MAIL_WORKER_TO: z.string().default(''),
  PUBLIC_CONTACT_EMAIL: z.string().default(''),
  SOFI_API_URL: z.string().default(''),
  SOFI_API_KEY: z.string().default(''),
  SOFI_MODEL: z.string().default(''),
  SOFI_DAILY_GLOBAL_CAP: positiveInt(200),
  SOFI_TEMPERATURE: z.coerce.number().default(0.4),
  SOFI_MAX_TOKENS: positiveInt(300),
  NODE_ENV: z.string().default('development'),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('Configuración inválida. Revisá el .env:')
  console.error(z.flattenError(parsed.error).fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export const isProd = env.NODE_ENV === 'production'
