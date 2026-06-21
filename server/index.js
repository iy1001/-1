import ccxt from 'ccxt'
import express from 'express'
import { HttpsProxyAgent } from 'https-proxy-agent'

const app = express()
const PORT = parseInt(process.env.PORT) || 3001
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7897'

console.log(`[server] using proxy: ${PROXY}`)
const agent = new HttpsProxyAgent(PROXY)

/* ═══════════════════ CCXT SETUP ═══════════════════ */
const exchange = new ccxt.binance({
  options: { defaultType: 'spot' },
  timeout: 30000,
  agent,
})

/* ═══════════════════ API ═══════════════════ */

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// Kline data: GET /api/klines?symbol=BTC/USDT&interval=1h&limit=120
app.get('/api/klines', async (req, res) => {
  try {
    const symbol = req.query.symbol || 'BTC/USDT'
    const timeframe = req.query.interval || '1h'
    const limit = parseInt(req.query.limit) || 120

    const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit)

    const klines = ohlcv.map((k) => ({
      time: k[0],
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[5],
    }))

    res.json(klines)
  } catch (err) {
    console.error('[klines] error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Ticker: GET /api/ticker?symbol=BTC/USDT
app.get('/api/ticker', async (req, res) => {
  try {
    const symbol = req.query.symbol || 'BTC/USDT'
    const ticker = await exchange.fetchTicker(symbol)
    res.json({
      symbol: ticker.symbol,
      last: ticker.last,
      high: ticker.high,
      low: ticker.low,
      change: ticker.change,
      percentage: ticker.percentage,
      volume: ticker.baseVolume,
    })
  } catch (err) {
    console.error('[ticker] error:', err.message)
    res.status(500).json({ error: err.message })
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

