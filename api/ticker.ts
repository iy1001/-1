import type { VercelRequest, VercelResponse } from '@vercel/node'

/* ═══════════════════ INLINE CACHE ═══════════════════ */
const store = new Map<string, { value: unknown; expiresAt: number }>()
const MAX_SIZE = 100

function cacheGet(key: string): unknown | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  store.delete(key)
  store.set(key, entry)
  return entry.value
}

function cacheSet(key: string, value: unknown, ttlMs: number): void {
  if (store.size >= MAX_SIZE) {
    const oldestKey = store.keys().next().value
    if (oldestKey) store.delete(oldestKey)
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

/* ═══════════════════ INLINE VALIDATION ═══════════════════ */
const SYMBOL_RE = /^[A-Z]{2,10}\/[A-Z]{2,10}$/

function parseSymbol(query: Record<string, string | string[] | undefined>) {
  const rawSymbol = typeof query.symbol === 'string' ? query.symbol : 'BTC/USDT'
  const symbol = rawSymbol.toUpperCase()
  if (!SYMBOL_RE.test(symbol)) return { ok: false as const, error: 'Invalid symbol format' }
  return { ok: true as const, symbol }
}

/* ═══════════════════ BINANCE FETCH ═══════════════════ */
function toBinanceSymbol(symbol: string): string {
  return symbol.replace('/', '')
}

interface Ticker {
  symbol: string
  last: number
  high: number
  low: number
  change: number
  percentage: number
  volume: number
}

async function fetchTicker(symbol: string): Promise<Ticker> {
  const binanceSymbol = toBinanceSymbol(symbol)
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`

  const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!resp.ok) {
    throw new Error(`Binance ticker ${resp.status}: ${await resp.text()}`)
  }

  const data = await resp.json()
  return {
    symbol: data.symbol,
    last: parseFloat(data.lastPrice) || 0,
    high: parseFloat(data.highPrice) || 0,
    low: parseFloat(data.lowPrice) || 0,
    change: parseFloat(data.priceChange) || 0,
    percentage: parseFloat(data.priceChangePercent) || 0,
    volume: parseFloat(data.volume) || 0,
  }
}

/* ═══════════════════ HANDLER ═══════════════════ */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const validation = parseSymbol(req.query as Record<string, string | string[] | undefined>)
  if (!validation.ok) {
    res.status(400).json({ error: validation.error })
    return
  }

  const { symbol } = validation

  try {
    const cacheKey = `ticker:${symbol}`
    const cached = cacheGet(cacheKey) as Ticker | null
    if (cached) {
      res.json(cached)
      return
    }

    const result = await fetchTicker(symbol)
    cacheSet(cacheKey, result, 10_000)
    res.json(result)
  } catch (err) {
    console.error('[ticker] error:', (err as Error).message)
    res.status(502).json({ error: 'Failed to fetch ticker data' })
  }
}
