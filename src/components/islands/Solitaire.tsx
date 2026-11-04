import { useMemo, useState } from 'react'

const SUITS = ['S', 'H', 'D', 'C'] as const
type Suit = (typeof SUITS)[number]

const SUIT_GLYPH: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' }
const SUIT_NAME: Record<Suit, string> = {
  S: 'espadas',
  H: 'corazones',
  D: 'diamantes',
  C: 'tréboles',
}
const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

interface Card {
  id: string
  suit: Suit
  rank: number
  faceUp: boolean
}

interface GameState {
  stock: Card[]
  waste: Card[]
  foundations: Record<Suit, Card[]>
  tableau: Card[][]
  moves: number
}

type Selection =
  | { type: 'waste' }
  | { type: 'tableau'; col: number; index: number }
  | { type: 'foundation'; suit: Suit }

const isRed = (suit: Suit) => suit === 'H' || suit === 'D'

function makeDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank += 1) {
      deck.push({ id: `${suit}${rank}`, suit, rank, faceUp: false })
    }
  }
  return deck
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function newGame(): GameState {
  const deck = shuffle(makeDeck())
  const tableau: Card[][] = Array.from({ length: 7 }, () => [])

  for (let pass = 0; pass < 7; pass += 1) {
    for (let col = pass; col < 7; col += 1) {
      const card = deck.pop()
      if (!card) continue
      tableau[col].push({ ...card, faceUp: pass === col })
    }
  }

  return {
    stock: deck.map((card) => ({ ...card, faceUp: false })),
    waste: [],
    foundations: { S: [], H: [], D: [], C: [] },
    tableau,
    moves: 0,
  }
}

function clone(state: GameState): GameState {
  return {
    stock: state.stock.map((card) => ({ ...card })),
    waste: state.waste.map((card) => ({ ...card })),
    foundations: {
      S: state.foundations.S.map((card) => ({ ...card })),
      H: state.foundations.H.map((card) => ({ ...card })),
      D: state.foundations.D.map((card) => ({ ...card })),
      C: state.foundations.C.map((card) => ({ ...card })),
    },
    tableau: state.tableau.map((column) => column.map((card) => ({ ...card }))),
    moves: state.moves,
  }
}

function isRun(cards: Card[]): boolean {
  return cards.every((card, index) => {
    if (!card.faceUp) return false
    const next = cards[index + 1]
    if (!next) return true
    return next.rank === card.rank - 1 && isRed(next.suit) !== isRed(card.suit)
  })
}

function canDropOnTableau(card: Card, column: Card[]): boolean {
  const top = column[column.length - 1]
  if (!top) return card.rank === 13
  return top.faceUp && top.rank === card.rank + 1 && isRed(top.suit) !== isRed(card.suit)
}

function canDropOnFoundation(card: Card, foundation: Card[]): boolean {
  const top = foundation[foundation.length - 1]
  if (!top) return card.rank === 1
  return top.rank === card.rank - 1
}

function cardLabel(card: Card): string {
  return `${RANK_LABEL[card.rank]} de ${SUIT_NAME[card.suit]}`
}

export default function Solitaire() {
  const [game, setGame] = useState<GameState>(newGame)
  const [history, setHistory] = useState<GameState[]>([])
  const [selection, setSelection] = useState<Selection | null>(null)

  const won = useMemo(
    () => SUITS.every((suit) => game.foundations[suit].length === 13),
    [game.foundations],
  )

  function commit(next: GameState) {
    setHistory((current) => [...current.slice(-19), clone(game)])
    setGame(next)
    setSelection(null)
  }

  function draw() {
    const next = clone(game)
    if (next.stock.length > 0) {
      const card = next.stock.pop()
      if (card) next.waste.push({ ...card, faceUp: true })
      next.moves += 1
      commit(next)
      return
    }
    if (next.waste.length > 0) {
      next.stock = next.waste
        .slice()
        .reverse()
        .map((card) => ({ ...card, faceUp: false }))
      next.waste = []
      next.moves += 1
      commit(next)
    }
  }

  function undo() {
    const previous = history[history.length - 1]
    if (!previous) return
    setGame(previous)
    setHistory((current) => current.slice(0, -1))
    setSelection(null)
  }

  function takeSelection(state: GameState, current: Selection): Card[] | null {
    if (current.type === 'waste') {
      const card = state.waste.pop()
      return card ? [card] : null
    }

    if (current.type === 'foundation') {
      const card = state.foundations[current.suit].pop()
      return card ? [card] : null
    }

    const column = state.tableau[current.col]
    if (current.index < 0 || current.index >= column.length) return null
    return column.splice(current.index)
  }

  function moveToTableau(col: number) {
    if (!selection) {
      const column = game.tableau[col]
      const top = column[column.length - 1]
      if (!top) return

      if (!top.faceUp) {
        const next = clone(game)
        const last = next.tableau[col][next.tableau[col].length - 1]
        if (last) last.faceUp = true
        next.moves += 1
        commit(next)
        return
      }

      const start = column.length - 1
      if (!isRun(column.slice(start))) return
      setSelection({ type: 'tableau', col, index: start })
      return
    }

    const next = clone(game)
    const cards = takeSelection(next, selection)
    if (!cards?.length) {
      setSelection(null)
      return
    }

    const target = next.tableau[col]
    if (!canDropOnTableau(cards[0], target)) {
      setSelection(null)
      return
    }

    target.push(...cards.map((card) => ({ ...card, faceUp: true })))
    const source = selection.type === 'tableau' ? next.tableau[selection.col] : null
    if (source?.length) {
      const top = source[source.length - 1]
      if (top && !top.faceUp) top.faceUp = true
    }
    next.moves += 1
    commit(next)
  }

  function moveToFoundation(suit: Suit) {
    if (!selection) {
      const foundation = game.foundations[suit]
      const top = foundation[foundation.length - 1]
      if (top) setSelection({ type: 'foundation', suit })
      return
    }

    if (selection.type === 'foundation' && selection.suit === suit) {
      setSelection(null)
      return
    }

    const next = clone(game)
    const cards = takeSelection(next, selection)
    if (!cards || cards.length !== 1) {
      setSelection(null)
      return
    }

    if (!canDropOnFoundation(cards[0], next.foundations[suit])) {
      setSelection(null)
      return
    }

    next.foundations[suit].push({ ...cards[0], faceUp: true })
    const source = selection.type === 'tableau' ? next.tableau[selection.col] : null
    if (source?.length) {
      const top = source[source.length - 1]
      if (top && !top.faceUp) top.faceUp = true
    }
    next.moves += 1
    commit(next)
  }

  function selectWaste() {
    if (selection) {
      setSelection(null)
      return
    }
    if (game.waste.length) setSelection({ type: 'waste' })
  }

  function selectTableau(col: number, index: number) {
    if (selection) {
      if (selection.type === 'tableau' && selection.col === col) {
        setSelection(null)
        return
      }
      moveToTableau(col)
      return
    }

    const column = game.tableau[col]
    const card = column[index]
    if (!card) return

    if (!card.faceUp) {
      if (index === column.length - 1) {
        const next = clone(game)
        const last = next.tableau[col][next.tableau[col].length - 1]
        if (last) last.faceUp = true
        next.moves += 1
        commit(next)
      }
      return
    }

    if (!isRun(column.slice(index))) return
    setSelection({ type: 'tableau', col, index })
  }

  function restart() {
    setGame(newGame())
    setHistory([])
    setSelection(null)
  }

  return (
    <div className="select-none">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-widest text-muted">
          <span>movimientos: {game.moves}</span>
          <span className="hidden sm:inline">baraja: {game.stock.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0}
            className="btn btn-quiet px-3 py-1.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Deshacer
          </button>
          <button type="button" onClick={restart} className="btn btn-secondary px-3 py-1.5 text-[11px]">
            Nuevo juego
          </button>
        </div>
      </div>

      <div className="relative rounded-lg border border-line bg-surface p-3 sm:p-5">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          <button
            type="button"
            onClick={draw}
            aria-label={game.stock.length ? 'Robar carta' : 'Reciclar descarte'}
            className="flex h-[62px] w-full items-center justify-center rounded border border-line bg-bg font-mono text-[10px] text-muted transition-colors hover:border-neon/50 hover:text-neon sm:h-[90px] sm:text-xs"
          >
            {game.stock.length ? `▼ ${game.stock.length}` : '↻'}
          </button>

          <button
            type="button"
            onClick={selectWaste}
            aria-label={game.waste.length ? `Descarte: ${cardLabel(game.waste[game.waste.length - 1])}` : 'Descarte vacío'}
            className="flex h-[62px] w-full items-center justify-center rounded border border-dashed border-line/70 sm:h-[90px]"
          >
            {game.waste.length > 0 && (
              <span className={selection?.type === 'waste' ? 'ring-2 ring-neon rounded' : ''}>
                <CardFace card={game.waste[game.waste.length - 1]} />
              </span>
            )}
          </button>

          <div aria-hidden="true" />

          {SUITS.map((suit) => {
            const foundation = game.foundations[suit]
            const top = foundation[foundation.length - 1]
            return (
              <button
                key={suit}
                type="button"
                onClick={() => moveToFoundation(suit)}
                aria-label={top ? `Fundación ${SUIT_NAME[suit]}: ${cardLabel(top)}` : `Fundación ${SUIT_NAME[suit]} vacía`}
                className="flex h-[62px] w-full items-center justify-center rounded border border-dashed border-line/70 sm:h-[90px]"
              >
                {top ? (
                  <span className={selection?.type === 'foundation' && selection.suit === suit ? 'ring-2 ring-neon rounded' : ''}>
                    <CardFace card={top} />
                  </span>
                ) : (
                  <span className="font-mono text-sm text-line" aria-hidden="true">
                    {SUIT_GLYPH[suit]}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 sm:mt-6 sm:gap-2">
          {game.tableau.map((column, col) => (              <div
                key={col}
                className="relative"
                style={{ minHeight: `${Math.max(90, column.length * 20 + 72)}px` }}
              >
              {column.length === 0 && (
                <button
                  type="button"
                  onClick={() => moveToTableau(col)}
                  aria-label={`Columna ${col + 1} vacía`}
                  className="h-[62px] w-full rounded border border-dashed border-line/70 transition-colors hover:border-neon/50 sm:h-[90px]"
                />
              )}

              {column.map((card, index) => {
                const selected =
                  selection?.type === 'tableau' && selection.col === col && index >= selection.index
                const top = index * 20

                return (
                  <div key={card.id} className="absolute left-0 right-0" style={{ top: `${top}px` }}>
                    <button
                      type="button"
                      onClick={() => selectTableau(col, index)}
                      aria-label={card.faceUp ? cardLabel(card) : 'Carta boca abajo'}
                      className={`block w-full rounded ${selected ? 'ring-2 ring-neon' : ''}`}
                    >
                      {card.faceUp ? <CardFace card={card} /> : <CardBack />}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {won && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-lg bg-bg/90 text-center backdrop-blur-sm">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon">partida completada</p>
            <p className="text-2xl font-medium">Ganaste en {game.moves} movimientos.</p>
            <button type="button" onClick={restart} className="btn btn-primary">
              Jugar de nuevo
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 font-mono text-[11px] leading-relaxed text-muted">
        Tocá una carta para seleccionarla y después la columna o fundación destino. Las columnas vacías
        solo aceptan reyes.
      </p>
    </div>
  )
}

function CardFace({ card }: { card: Card }) {
  const color = isRed(card.suit) ? 'text-[#c81e1e]' : 'text-[#111111]'
  return (
    <span
      className={`flex h-[62px] w-full flex-col justify-between rounded border border-black/20 bg-[#f5f5f5] px-1 py-0.5 sm:h-[90px] sm:px-1.5 sm:py-1 ${color}`}
    >
      <span className="font-mono text-[10px] font-bold leading-none sm:text-xs">{RANK_LABEL[card.rank]}</span>
      <span className="self-center text-base leading-none sm:text-xl" aria-hidden="true">
        {SUIT_GLYPH[card.suit]}
      </span>
      <span className="self-end font-mono text-[10px] font-bold leading-none sm:text-xs" aria-hidden="true">
        {RANK_LABEL[card.rank]}
      </span>
    </span>
  )
}

function CardBack() {
  return (
    <span className="flex h-[62px] w-full items-center justify-center rounded border border-line bg-[#141414] sm:h-[90px]">
      <span className="h-full w-full rounded bg-[repeating-linear-gradient(45deg,#1b1b1b_0px,#1b1b1b_4px,#0f0f0f_4px,#0f0f0f_8px)] opacity-80" />
    </span>
  )
}
