export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Fullware — Notas de campo</title>
    <description>Notas sobre automatización, IA, servidores y aprendizajes.</description>
    <link>https://blog.fullware.com.ar/</link>
    <language>es-ar</language>
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
