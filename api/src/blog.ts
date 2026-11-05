import { Hono } from 'hono'

export const blog = new Hono()

blog.get('/feed', async (c) => {
  try {
    const res = await fetch('https://blog.fullware.com.ar/feed/', {
      headers: {
        'User-Agent': 'Fullware-Proxy/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    })
    const xml = await res.text()
    return c.text(xml, 200, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    })
  } catch (error) {
    console.error('Error al obtener feed del blog', error)
    return c.text('', 502)
  }
})
