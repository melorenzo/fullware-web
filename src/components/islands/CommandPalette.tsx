import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { whatsappLink } from '../../data/site'

interface Action {
  id: string
  label: string
  hint: string
  keywords: string
  run: () => void
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function go(path: string) {
  window.location.href = path
}

const actions: Action[] = [
  { id: 'inicio', label: 'Ir a Inicio', hint: '/', keywords: 'home home fullware', run: () => go('/') },
  {
    id: 'servicios',
    label: 'Ver servicios',
    hint: '/#servicios',
    keywords: 'servicios automatizacion ia',
    run: () => go('/#servicios'),
  },
  {
    id: 'proyectos',
    label: 'Ver proyectos',
    hint: '/proyectos',
    keywords: 'proyectos casos trabajos',
    run: () => go('/proyectos'),
  },
  { id: 'blog', label: 'Leer el blog', hint: '/blog', keywords: 'blog notas articulos', run: () => go('/blog') },
  {
    id: 'contacto',
    label: 'Ir a contacto',
    hint: '/#contacto',
    keywords: 'contacto consola escribir',
    run: () => go('/#contacto'),
  },
  {
    id: 'matias',
    label: 'Ver portfolio de Matías',
    hint: '/matias',
    keywords: 'matias lorenzo portfolio sobre',
    run: () => go('/matias'),
  },
  {
    id: 'juego',
    label: 'Jugar al solitario',
    hint: '/juego',
    keywords: 'juego solitario cartas jugar',
    run: () => go('/juego'),
  },
  {
    id: 'sofi',
    label: 'Hablar con SOFI',
    hint: 'asistente',
    keywords: 'sofi ia asistente chat',
    run: () => window.dispatchEvent(new CustomEvent('fullware:sofi')),
  },
  {
    id: 'whatsapp',
    label: 'Abrir WhatsApp',
    hint: 'wa.me',
    keywords: 'whatsapp waha contacto',
    run: () => window.open(whatsappLink('Hola Fullware, vengo desde la paleta de comandos.'), '_blank', 'noopener'),
  },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const previousFocus = useRef<Element | null>(null)

  const filtered = useMemo(() => {
    const term = normalize(query.trim())
    if (!term) return actions
    return actions.filter((action) => normalize(`${action.label} ${action.hint} ${action.keywords}`).includes(term))
  }, [query])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActive(0)
    if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus()
  }, [])

  const execute = useCallback(
    (action: Action) => {
      close()
      action.run()
    },
    [close],
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => {
          if (!current) previousFocus.current = document.activeElement
          return !current
        })
        return
      }

      if (event.key === 'Escape') {
        setOpen((current) => {
          if (current) {
            setQuery('')
            setActive(0)
            if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus()
          }
          return false
        })
      }
    }

    function onOpenEvent() {
      previousFocus.current = document.activeElement
      setOpen(true)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('fullware:palette', onOpenEvent)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('fullware:palette', onOpenEvent)
    }
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  function onDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => (filtered.length ? (current + 1) % filtered.length : 0))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => (filtered.length ? (current - 1 + filtered.length) % filtered.length : 0))
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const action = filtered[active]
      if (action) execute(action)
      return
    }

    if (event.key === 'Tab') {
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'input, button, a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        className="h-fit w-full max-w-lg overflow-hidden rounded-lg border border-line bg-surface shadow-2xl"
        onKeyDown={onDialogKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="font-mono text-xs text-neon" aria-hidden="true">
            &gt;
          </span>
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={filtered[active] ? `palette-${filtered[active].id}` : undefined}
            aria-label="Buscar una acción"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar acción..."
            className="w-full border-0 bg-transparent p-0 font-mono text-sm text-text outline-none placeholder:text-muted/70"
            autoComplete="off"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">esc</kbd>
        </div>

        <ul id="palette-list" role="listbox" aria-label="Acciones" className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center font-mono text-xs text-muted">
              sin resultados, probá con otra palabra
            </li>
          )}

          {filtered.map((action, index) => (
            <li
              key={action.id}
              id={`palette-${action.id}`}
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => execute(action)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded px-3 py-2.5 ${
                index === active ? 'bg-bg text-neon' : 'text-text'
              }`}
            >
              <span className="text-sm">{action.label}</span>
              <span className="font-mono text-[10px] text-muted">{action.hint}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-line px-4 py-2 font-mono text-[10px] text-muted">
          <span>↑↓ navegar · enter ejecutar</span>
          <span>ctrl k</span>
        </div>
      </div>
    </div>
  )
}
