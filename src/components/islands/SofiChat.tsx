import { useEffect, useRef, useState } from 'react'
import { whatsappLink } from '../../data/site'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

interface SofiResponse {
  answer?: string
  remaining?: number
  done?: boolean
}

const STORAGE_KEY = 'fullware:sofi'
const GREETING: Message = {
  role: 'assistant',
  text: 'Hola, soy SOFI. Tenés 3 preguntas: contame qué querés automatizar.',
}

const SUGGESTIONS = [
  '¿Qué puedo automatizar?',
  '¿Hacen bots de WhatsApp?',
  '¿Cómo trabajan?',
]

function readStored(): { messages: Message[]; remaining: number; done: boolean } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { messages?: Message[]; remaining?: number; done?: boolean }
    if (!Array.isArray(parsed.messages)) return null
    return {
      messages: parsed.messages,
      remaining: typeof parsed.remaining === 'number' ? parsed.remaining : 3,
      done: Boolean(parsed.done),
    }
  } catch {
    return null
  }
}

export default function SofiChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [remaining, setRemaining] = useState(3)
  const [done, setDone] = useState(false)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stored = readStored()
    if (stored) {
      setMessages(stored.messages.length ? stored.messages : [GREETING])
      setRemaining(stored.remaining)
      setDone(stored.done)
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, remaining, done }))
  }, [messages, remaining, done])

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, typing, open])

  useEffect(() => {
    function onOpen() {
      setOpen(true)
    }
    window.addEventListener('fullware:sofi', onOpen)
    return () => window.removeEventListener('fullware:sofi', onOpen)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function buildHistory(list: Message[]): Array<{ q: string; a: string }> {
    const pairs: Array<{ q: string; a: string }> = []
    for (let index = 0; index < list.length; index += 1) {
      const current = list[index]
      const next = list[index + 1]
      if (current?.role === 'user' && next?.role === 'assistant') {
        pairs.push({ q: current.text, a: next.text })
      }
    }
    return pairs.slice(-2)
  }

  async function ask(question: string) {
    const text = question.trim()
    if (!text || typing || done) return

    const history = buildHistory(messages)
    setMessages((current) => [...current, { role: 'user', text }])
    setInput('')
    setTyping(true)

    try {
      const response = await fetch('/api/sofi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.slice(0, 300), history }),
      })

      const data = (await response.json()) as SofiResponse

      if (!data.answer) throw new Error('sin respuesta')

      setMessages((current) => [...current, { role: 'assistant', text: data.answer as string }])
      if (typeof data.remaining === 'number') setRemaining(data.remaining)
      if (data.done || data.remaining === 0) setDone(true)
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: 'No pude conectarme con SOFI ahora. Probá la consola de contacto o escribime por WhatsApp.',
        },
      ])
    } finally {
      setTyping(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="sofi-panel"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-neon/40 bg-surface px-4 py-3 font-mono text-xs text-text shadow-lg transition-colors hover:border-neon hover:text-neon"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-neon" aria-hidden="true" />
        SOFI
        <span className="text-muted" aria-hidden="true">
          {open ? '×' : '↑'}
        </span>
      </button>

      {open && (
        <section
          id="sofi-panel"
          role="dialog"
          aria-label="Chat con SOFI"
          className="fixed inset-x-3 bottom-20 top-20 z-50 flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-2xl sm:inset-x-auto sm:bottom-20 sm:right-5 sm:top-auto sm:h-[520px] sm:w-[380px]"
        >
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="font-mono text-sm text-text">SOFI</h2>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">
                3 preguntas por visita
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-line px-2 py-1 font-mono text-xs text-muted transition-colors hover:border-neon hover:text-neon"
              aria-label="Cerrar chat de SOFI"
            >
              esc
            </button>
          </header>

          <div ref={scrollRef} className="terminal-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                  message.role === 'user'
                    ? 'ml-auto border border-neon/30 bg-neon/10 text-text'
                    : 'border border-line bg-bg text-[#d4d4d4]'
                }`}
              >
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
                  {message.role === 'user' ? 'vos' : 'sofi'}
                </span>
                <span className="whitespace-pre-wrap break-words">{message.text}</span>
              </div>
            ))}

            {typing && (
              <p className="font-mono text-xs text-muted">
                escribiendo<span className="cursor-blink text-neon">...</span>
              </p>
            )}

            {messages.length === 1 && !typing && !done && (
              <div className="space-y-2 pt-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void ask(suggestion)}
                    className="block w-full rounded border border-line bg-bg px-3 py-2 text-left text-xs text-muted transition-colors hover:border-neon/50 hover:text-neon"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-line px-4 py-3">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
              preguntas restantes: {remaining}/3
            </p>

            {done ? (
              <div className="flex flex-col gap-2">
                <a href="/#contacto" className="btn btn-secondary w-full" onClick={() => setOpen(false)}>
                  Ir a la consola
                </a>
                <a
                  href={whatsappLink('Hola Fullware, vengo desde SOFI.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary w-full"
                >
                  Seguir por WhatsApp
                </a>
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void ask(input)
                }}
                className="flex items-center gap-2"
              >
                <label htmlFor="sofi-input" className="sr-only">
                  Escribí tu pregunta para SOFI
                </label>
                <input
                  id="sofi-input"
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  maxLength={300}
                  disabled={typing}
                  placeholder="Escribí tu pregunta..."
                  className="w-full rounded border border-line bg-bg px-3 py-2 font-mono text-xs text-text outline-none placeholder:text-muted/60 focus:border-neon disabled:opacity-60"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={typing || !input.trim()}
                  className="btn btn-primary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Enviar
                </button>
              </form>
            )}
          </div>
        </section>
      )}
    </>
  )
}
