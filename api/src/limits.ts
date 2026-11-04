import { createHash, createHmac } from 'node:crypto'
import { db } from './db.js'
import { env } from './env.js'

const TIME_ZONE = 'America/Argentina/Buenos_Aires'

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const hourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  hourCycle: 'h23',
})

export function dayKey(date = new Date()): string {
  return dayFormatter.format(date)
}

export function hourKey(date = new Date()): string {
  return `${dayKey(date)}T${hourFormatter.format(date)}`
}

export function ipKey(ip: string): string {
  return createHash('sha256').update(`${ip}${env.IP_HASH_SALT}`).digest('hex')
}

export function clientIp(headers: Headers): string {
  const cloudflare = headers.get('cf-connecting-ip')
  if (cloudflare) return cloudflare.trim()

  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  return 'desconocida'
}

export function signSession(value: string): string {
  return createHmac('sha256', env.SOFI_COOKIE_SECRET).update(value).digest('hex')
}

export interface SofiUsage {
  used: number
  globalUsed: number
}

export function sofiUsage(key: string): SofiUsage {
  const day = dayKey()
  const row = db.prepare('SELECT count FROM sofi_usage WHERE key = ? AND day = ?').get(key, day) as
    | { count: number }
    | undefined
  const global = db.prepare('SELECT count FROM sofi_global WHERE day = ?').get(day) as
    | { count: number }
    | undefined

  return { used: row?.count ?? 0, globalUsed: global?.count ?? 0 }
}

const bumpUsage = db.transaction((key: string, day: string) => {
  db.prepare(
    'INSERT INTO sofi_usage (key, day, count) VALUES (?, ?, 1) ON CONFLICT(key, day) DO UPDATE SET count = count + 1',
  ).run(key, day)
  db.prepare(
    'INSERT INTO sofi_global (day, count) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET count = count + 1',
  ).run(day)
})

/** Se llama recién cuando el proveedor respondió bien. */
export function consumeSofiQuestion(key: string) {
  bumpUsage(key, dayKey())
}

export function contactAllowed(key: string): boolean {
  const hour = hourKey()
  const row = db.prepare('SELECT count FROM contact_hits WHERE key = ? AND hour = ?').get(key, hour) as
    | { count: number }
    | undefined

  if ((row?.count ?? 0) >= 5) return false

  db.prepare(
    'INSERT INTO contact_hits (key, hour, count) VALUES (?, ?, 1) ON CONFLICT(key, hour) DO UPDATE SET count = count + 1',
  ).run(key, hour)

  return true
}
