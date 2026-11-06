import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { services } from '../../data/services'
import { projects } from '../../data/projects'
import { site, whatsappLink, mailtoLink } from '../../data/site'

type LineKind = 'system' | 'user' | 'bot' | 'ok' | 'error'

interface Line {
  id: number
  kind: LineKind
  text: string
}

type Step = 'name' | 'need' | 'contact' | 'confirm' | 'sending' | 'sent'

const PHONE = site.whatsapp || 'el WhatsApp'

const COMMANDS = ['help', 'servicios', 'proyectos', 'contratar', 'whatsapp', 'clear', 'play', 'sofi', 'matias'] as const

const HELP = [
  'Comandos disponibles (con / durante el formulario):',
  '  help        esta ayuda',
  '  servicios   qué hace Fullware',
  '  proyectos   proyectos publicados',
  '  contratar   arrancar el formulario',
  '  whatsapp    abrir WhatsApp',
  '  sofi        abrir el chat de SOFI',
  '  play        jugar al solitario',
  '  matias      ir al portfolio',
  '  clear       limpiar la consola',
].join('\n')

let lineId = 0
function makeLine(kind: LineKind, text: string): Line {
  lineId += 1
  return { id: lineId, kind, text }
}

const kindClass: Record<LineKind, string> = {
  system: 'text-muted',
  user: 'text-text',
  bot: 'text-[#d4d4d4]',
  ok: 'text-neon',
  error: 'text-orange',
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function ContactConsole() {
  const [lines, setLines] = useState<Line[]>(() => [
    makeLine('system', 'fullware@contacto — consola v1.0'),
    makeLine('system', 'Escribí /help para ver los comandos. El flujo de contacto arranca solo.'),
    makeLine('bot', '¿Cómo te llamás?'),
  ])
  const [value, setValue] = useState('')
  const [step, setStep] = useState<Step>('name')
  const [draft, setDraft] = useState({ name: '', need: '', contact: '' })
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [busy, setBusy] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

  const stepRef = useRef(step)
  stepRef.current = step

  function push(kind: LineKind, text: string) {
    setLines((current) => [...current, makeLine(kind, text)])
  }

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [lines])

  function ask(stepValue: Exclude<Step, 'sending' | 'sent'>) {
    setStep(stepValue)
    if (stepValue === 'name') push('bot', '¿Cómo te llamás?')
    if (stepValue === 'need') push('bot', '¿Qué necesitás automatizar o resolver?')
    if (stepValue === 'contact') push('bot', '¿Cómo te contacto? (WhatsApp o mail)')
    if (stepValue === 'confirm') push('bot', 'Enviar? (s/n)')
  }

  function runCommand(command: string): boolean {
    switch (command) {
      case 'help':
        push('system', HELP)
        return true
      case 'servicios':
        push('system', services.map((service) => `· ${service.title}`).join('\n'))
        return true
      case 'proyectos':
        push(
          'system',
          projects.map((project) => `· ${project.name} [${project.status}]`).join('\n'),
        )
        return true
      case 'contratar':
        setDraft({ name: '', need: '', contact: '' })
        push('bot', 'Listo. ¿Cómo te llamás?')
        setStep('name')
        return true
      case 'whatsapp':
        push('ok', 'Abriendo WhatsApp...')
        window.open(whatsappLink('Hola Fullware, vengo desde la consola.'), '_blank', 'noopener')
        return true
      case 'matias':
        push('ok', 'Navegando a /matias...')
        window.location.href = '/matias'
        return true
      case 'play':
        push('ok', 'Cargando solitario...')
        window.location.href = '/juego'
        return true
      case 'sofi':
        push('ok', 'Abriendo SOFI...')
        window.dispatchEvent(new CustomEvent('fullware:sofi'))
        return true
      case 'clear':
        setLines([makeLine('system', 'Consola limpia. Escribí /help para ver los comandos.')])
        return true
      default:
        push('error', 'comando no encontrado, probá con /help')
        return true
    }
  }

  async function send() {
    setStep('sending')
    setBusy(true)
    push('system', 'Enviando...')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, website: '' }),
      })

      if (response.status === 429) {
        push('error', 'Mandaste varias consultas seguidas. Esperá un rato o escribime por WhatsApp.')
        setBusy(false)
        setStep('confirm')
        return
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const payload = (await response.json().catch(() => null)) as { delivered?: boolean } | null
      if (payload?.delivered) {
        push('ok', '✔ Mensaje enviado. Te respondo pronto.')
      } else {
        push('ok', '✔ Consulta recibida. La tengo guardada y te respondo por el contacto que dejaste.')
        push('system', 'Si es urgente, escribime directo por WhatsApp.')
      }
      push('system', '¿Querés hacer otra cosa? Probá /help o contratar.')
      setDraft({ name: '', need: '', contact: '' })
      setStep('sent')
    } catch {
      push('error', '✖ No pude enviarlo. Escribime por WhatsApp.')
      push('system', whatsappLink())
      setStep('sent')
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = value.trim()
    if (!text || busy) return

    push('user', text)
    setValue('')
    setHistory((current) => [...current, text])
    setHistoryIndex(-1)

    // Durante el formulario, un nombre como "Matías" no puede disparar el comando `matias`.
    // Por eso los comandos van con "/" mientras se completa; al terminar funcionan solos.
    const command = text.startsWith('/') ? normalize(text.slice(1)) : normalize(text)
    const commandsEnabled = text.startsWith('/') || stepRef.current === 'sent'
    if (commandsEnabled && (COMMANDS as readonly string[]).includes(command)) {
      runCommand(command)
      return
    }

    const current = stepRef.current

    if (current === 'name') {
      if (text.length < 2) {
        push('error', 'Necesito al menos 2 caracteres. ¿Cómo te llamás?')
        return
      }
      setDraft((draftValue) => ({ ...draftValue, name: text }))
      ask('need')
      return
    }

    if (current === 'need') {
      if (text.length < 5) {
        push('error', 'Contame un poco más (mínimo 5 caracteres).')
        return
      }
      setDraft((draftValue) => ({ ...draftValue, need: text }))
      ask('contact')
      return
    }

    if (current === 'contact') {
      if (text.length < 5) {
        push('error', 'Pasame un WhatsApp o un mail válido.')
        return
      }
      setDraft((draftValue) => ({ ...draftValue, contact: text }))
      const next = { ...draft, contact: text }
      push('system', `Nombre: ${next.name}\nNecesidad: ${next.need}\nContacto: ${next.contact}`)
      ask('confirm')
      return
    }

    if (current === 'confirm') {
      const answer = normalize(text)
      if (['s', 'si', 'sí', 'y', 'yes', 'dale'].includes(answer)) {
        void send()
        return
      }
      if (['n', 'no', 'nop'].includes(answer)) {
        push('system', 'Listo, no envié nada. Si querés arrancar de nuevo: contratar.')
        setStep('sent')
        return
      }
      push('error', 'Respondé s o n.')
      return
    }

    if (current === 'sent') {
      push('system', 'Si querés otra consulta, escribí contratar. O probá /help.')
      return
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!history.length) return
      const nextIndex = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1)
      setHistoryIndex(nextIndex)
      setValue(history[nextIndex])
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (historyIndex < 0) return
      const nextIndex = historyIndex + 1
      if (nextIndex >= history.length) {
        setHistoryIndex(-1)
        setValue('')
        return
      }
      setHistoryIndex(nextIndex)
      setValue(history[nextIndex])
    }
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-line bg-[#0d0d0d] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" aria-hidden="true" />
          <span className="ml-2 font-mono text-[11px] text-muted">fullware@contacto:~$</span>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted">
            {step === 'sending' ? 'enviando' : step === 'sent' ? 'listo' : 'online'}
          </span>
        </div>

        <div
          ref={scrollRef}
          className="terminal-scroll h-[340px] overflow-y-auto px-4 py-4 font-mono text-[13px] leading-relaxed sm:h-[380px]"
          onClick={() => inputRef.current?.focus()}
        >
          <div role="log" aria-live="polite" aria-relevant="additions" ref={transcriptRef}>
            {lines.map((line) => (
              <div key={line.id} className={kindClass[line.kind]}>
                {line.kind === 'user' && <span className="text-neon">$ </span>}
                <span className="whitespace-pre-wrap break-words">{line.text}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-line bg-[#0b0b0b] px-4 py-3">
          <label htmlFor="console-input" className="sr-only">
            Escribí tu mensaje o un comando
          </label>
          <div className="flex items-center gap-2 font-mono text-[13px]">
            <span className="select-none text-neon" aria-hidden="true">
              &gt;
            </span>
            <input
              id="console-input"
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={onKeyDown}
              className="w-full border-0 bg-transparent p-0 text-text caret-neon outline-none placeholder:text-muted/60"
              placeholder={busy ? 'enviando...' : 'escribí acá, o probá /help'}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={busy}
            />
          </div>
        </form>
      </div>

      <noscript>
        <div className="mt-4 rounded-lg border border-line bg-surface p-4 text-sm text-muted">
          <p>Este formulario necesita JavaScript. Escribime directo:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a className="btn btn-primary" href={whatsappLink()}>
              WhatsApp
            </a>
            <a className="btn btn-quiet" href={mailtoLink()}>
              {site.email || 'Mail'}
            </a>
          </div>
        </div>
      </noscript>

      <p className="mt-3 font-mono text-[11px] text-muted">
        {PHONE ? `también podés escribirme directo por WhatsApp` : 'configurá el WhatsApp en el .env'}
      </p>
    </div>
  )
}
