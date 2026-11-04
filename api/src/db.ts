import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { env } from './env.js'

mkdirSync(dirname(env.DB_PATH), { recursive: true })

export const db = new Database(env.DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('busy_timeout = 3000')

db.exec(`
  CREATE TABLE IF NOT EXISTS sofi_usage (
    key TEXT NOT NULL,
    day TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (key, day)
  );

  CREATE TABLE IF NOT EXISTS sofi_global (
    day TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    need TEXT,
    contact TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contact_hits (
    key TEXT NOT NULL,
    hour TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (key, hour)
  );
`)

export interface ContactInput {
  name: string
  need: string
  contact: string
}

export function saveContact(input: ContactInput) {
  db.prepare('INSERT INTO contacts (name, need, contact) VALUES (?, ?, ?)').run(
    input.name,
    input.need,
    input.contact,
  )
}
