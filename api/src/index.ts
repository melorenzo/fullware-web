import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { logger } from 'hono/logger'
import { contact } from './contact.js'
import { env } from './env.js'
import { sofi } from './sofi.js'

const app = new Hono()

app.use('*', logger())

app.use(
  '*',
  bodyLimit({
    maxSize: 10 * 1024,
    onError: (c) => c.json({ ok: false, error: 'body too large' }, 413),
  }),
)

app.get('/api/health', (c) => c.json({ ok: true }))
app.route('/api/contact', contact)
app.route('/api/sofi', sofi)

app.notFound((c) => c.json({ ok: false, error: 'not found' }, 404))

app.onError((error, c) => {
  console.error('Error no manejado', error)
  return c.json({ ok: false, error: 'internal error' }, 500)
})

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Fullware API escuchando en el puerto ${info.port}`)
})
