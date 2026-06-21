import ccxt from 'ccxt'
import express from 'express'
import { HttpsProxyAgent } from 'https-proxy-agent'

const app = express()
const PORT = parseInt(process.env.PORT) || 3001
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7897'

console.log(`[server] using proxy: ${PROXY}`)
const agent = new HttpsProxyAgent(PROXY)

/* ═══════════════════ CACHE ═══════════════════ */
class MemoryCache {
  constructor(maxSize = 100) {
    this.store = new Map()
    this.maxSize = maxSize
  }

  get(key) {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    // Move to end (most recently used)
    this.store.delete(key)
    this.store.set(key, entry)
    return entry.value
  }

  set(key, value, ttlMs) {
    if (this.store.size >= this.maxSize) {
      // Evict oldest (first) entry
      const oldestKey = this.store.keys().next().value
      this.store.delete(oldestKey)
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }
}

const cache = new MemoryCache(100)

/* ═══════════════════ VALIDATION ═══════════════════ */
const VALID_INTERVALS = new Set([
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '6h',
  '12h',
  '1d',
  '1w',
])
const SYMBOL_RE = /^[A-Z]{2,10}\/[A-Z]{2,10}$/
const MAX_LIMIT = 1000

function validateKlines(req, res, next) {
  const symbol = (req.query.symbol || 'BTC/USDT').toUpperCase()
  const interval = req.query.interval || '1h'
  const limit = parseInt(req.query.limit) || 120

  if (!SYMBOL_RE.test(symbol)) return res.status(400).json({ error: 'Invalid symbol format' })
  if (!VALID_INTERVALS.has(interval)) return res.status(400).json({ error: 'Invalid interval' })
  if (limit < 1 || limit > MAX_LIMIT)
    return res.status(400).json({ error: `Limit must be 1-${MAX_LIMIT}` })

  req.query.symbol = symbol
  req.query.interval = interval
  req.query.limit = String(Math.min(limit, MAX_LIMIT))
  next()
}

function validateTicker(req, res, next) {
  const symbol = (req.query.symbol || 'BTC/USDT').toUpperCase()
  if (!SYMBOL_RE.test(symbol)) return res.status(400).json({ error: 'Invalid symbol format' })
  req.query.symbol = symbol
  next()
}

/* ═══════════════════ CORS ═══════════════════ */
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (_req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

/* ═══════════════════ REQUEST LOGGING ═══════════════════ */
app.use((req, _res, next) => {
  req._startTime = Date.now()
  _res.on('finish', () => {
    const ms = Date.now() - req._startTime
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ${_res.statusCode} ${ms}ms`
    )
  })
  next()
})

/* ═══════════════════ CCXT SETUP ═══════════════════ */
const exchange = new ccxt.binance({
  options: { defaultType: 'spot' },
  timeout: 30000,
  agent,
})

/* ═══════════════════ API ═══════════════════ */

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: Math.floor(process.uptime()) })
})

// Kline data: GET /api/klines?symbol=BTC/USDT&interval=1h&limit=120
app.get('/api/klines', validateKlines, async (req, res) => {
  try {
    const symbol = req.query.symbol
    const timeframe = req.query.interval
    const limit = parseInt(req.query.limit)

    const cacheKey = `klines:${symbol}:${timeframe}:${limit}`
    const cached = cache.get(cacheKey)
    if (cached) return res.json(cached)

    const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit)

    const klines = ohlcv.map((k) => ({
      time: k[0],
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[5],
    }))

    cache.set(cacheKey, klines, 30_000) // 30s TTL
    res.json(klines)
  } catch (err) {
    console.error('[klines] error:', err.message)
    res.status(502).json({ error: 'Failed to fetch kline data' })
  }
})

// Ticker: GET /api/ticker?symbol=BTC/USDT
app.get('/api/ticker', validateTicker, async (req, res) => {
  try {
    const symbol = req.query.symbol

    const cacheKey = `ticker:${symbol}`
    const cached = cache.get(cacheKey)
    if (cached) return res.json(cached)

    const ticker = await exchange.fetchTicker(symbol)
    const result = {
      symbol: ticker.symbol,
      last: ticker.last,
      high: ticker.high,
      low: ticker.low,
      change: ticker.change,
      percentage: ticker.percentage,
      volume: ticker.baseVolume,
    }

    cache.set(cacheKey, result, 10_000) // 10s TTL
    res.json(result)
  } catch (err) {
    console.error('[ticker] error:', err.message)
    res.status(502).json({ error: 'Failed to fetch ticker data' })
  }
})

/* ═══════════════════ START ═══════════════════ */
async function start() {
  try {
    console.log('[server] loading exchange markets...')
    await exchange.loadMarkets()
    console.log('[server] markets loaded, starting server')
  } catch (err) {
    console.warn('[server] failed to load markets, starting without them:', err.message)
  }

  app.listen(PORT, () => {
    console.log(`[server] ccxt proxy running on http://localhost:${PORT}`)
  })
}

start()
