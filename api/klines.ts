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
const VALID_INTERVALS = new Set([
  '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '1w',
])
const SYMBOL_RE = /^[A-Z]{2,10}\/[A-Z]{2,10}$/
const MAX_LIMIT = 1000

function parseQuery(query: Record<string, string | string[] | undefined>) {
  const rawSymbol = typeof query.symbol === 'string' ? query.symbol : 'BTC/USDT'
  const symbol = rawSymbol.toUpperCase()
  const interval = typeof query.interval === 'string' ? query.interval : '1h'
  const limit = parseInt(typeof query.limit === 'string' ? query.limit : '120') || 120

  if (!SYMBOL_RE.test(symbol)) return { ok: false as const, error: 'Invalid symbol format' }
  if (!VALID_INTERVALS.has(interval)) return { ok: false as const, error: 'Invalid interval' }
  if (limit < 1 || limit > MAX_LIMIT) return { ok: false as const, error: `Limit must be 1-${MAX_LIMIT}` }

  return { ok: true as const, symbol, interval, limit: Math.min(limit, MAX_LIMIT) }
}

/* ═══════════════════ BINANCE FETCH ═══════════════════ */
function toBinanceSymbol(symbol: string): string {
  return symbol.replace('/', '')
}

interface Kline {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

async function fetchKlines(symbol: string, interval: string, limit: number): Promise<Kline[]> {
  const binanceSymbol = toBinanceSymbol(symbol)
  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`

  const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!resp.ok) {
    throw new Error(`Binance klines ${resp.status}: ${await resp.text()}`)
  }

  const raw = (await resp.json()) as Array<Array<string | number>>
  return raw.map((k) => ({
    time: Number(k[0]),
    open: parseFloat(String(k[1])),
    high: parseFloat(String(k[2])),
    low: parseFloat(String(k[3])),
    close: parseFloat(String(k[4])),
    volume: parseFloat(String(k[5])),
  }))
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

  const validation = parseQuery(req.query as Record<string, string | string[] | undefined>)
  if (!validation.ok) {
    res.status(400).json({ error: validation.error })
    return
  }

  const { symbol, interval, limit } = validation

  try {
    const cacheKey = `klines:${symbol}:${interval}:${limit}`
    const cached = cacheGet(cacheKey) as Kline[] | null
    if (cached) {
      res.json(cached)
      return
    }

    const klines = await fetchKlines(symbol, interval, limit)
    cacheSet(cacheKey, klines, 30_000)
    res.json(klines)
  } catch (err) {
    console.error('[klines] error:', (err as Error).message)
    res.status(502).json({ error: 'Failed to fetch kline data' })
  }
}
