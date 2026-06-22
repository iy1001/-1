import { useEffect, useRef, useState } from 'react'
import { INTERVALS, SEED_PRICES, COINS } from '../theme'
import { rand } from './helpers'

const WS_BASE = 'wss://stream.binance.com:9443/ws'
const API_BASE = ''

/**
 * Convert BTCUSDT → BTC/USDT for ccxt
 */
function toCcxtSymbol(symbol) {
  if (symbol.includes('/')) return symbol
  return symbol.slice(0, -4) + '/' + symbol.slice(-4)
}

/**
 * Fetch kline data via ccxt backend proxy
 */
export async function fetchKlines(symbol, interval, limit = 120) {
  const ccxtSymbol = toCcxtSymbol(symbol)
  const res = await fetch(
    `${API_BASE}/api/klines?symbol=${ccxtSymbol}&interval=${interval}&limit=${limit}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

/**
 * Fetch ticker via ccxt backend proxy
 */
export async function fetchTicker(symbol) {
  const ccxtSymbol = toCcxtSymbol(symbol)
  const res = await fetch(`${API_BASE}/api/ticker?symbol=${ccxtSymbol}`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

/**
 * Generate mock kline data (fallback when backend unavailable)
 */
export function generateKlines(symbol, interval, count = 120) {
  const ms = INTERVALS.find((i) => i.value === interval)?.ms || 60_000
  let price = SEED_PRICES[symbol] || 100
  const out = []
  const now = Date.now()

  // Hash full interval string so "1m" and "1h" produce different seeds
  let ivHash = 0
  for (let c = 0; c < interval.length; c++) {
    ivHash = ivHash * 31 + interval.charCodeAt(c)
  }

  // Scale per-candle volatility by interval duration (1m ≈ 0.08%, 1h ≈ 0.3%)
  const volScale = Math.sqrt(ms / 3_600_000) * 0.003

  for (let i = count - 1; i >= 0; i--) {
    const s = i * 17 + symbol.charCodeAt(0) * 7 + ivHash
    const r1 = rand(s)
    const r2 = rand(s + 1)
    const r3 = rand(s + 2)
    const r4 = rand(s + 3)

    const vol = price * volScale
    const trend = (r1 - 0.5) * vol * 2.5
    const open = price
    const close = price + trend
    const high = Math.max(open, close) + r2 * vol
    const low = Math.min(open, close) - r3 * vol
    const volume = (r4 * 800 + 100) * (price / 100)

    out.push({ time: now - i * ms, open, high, low, close, volume })
    price = close
  }

  return out
}

/**
 * Fetch klines with automatic fallback to mock data.
 * Returns { data, isMock } so UI can show an indicator.
 */
export async function loadKlines(symbol, interval, limit = 120) {
  try {
    const data = await fetchKlines(symbol, interval, limit)
    return { data, isMock: false }
  } catch {
    return { data: generateKlines(symbol, interval, limit), isMock: true }
  }
}

/* ═══════════════════ WEBSOCKET HELPERS ═══════════════════ */

/**
 * Exponential backoff reconnect: 1s → 2s → 4s → 8s → 30s max
 */
function createReconnect() {
  let delay = 1000
  return {
    next() {
      const d = delay
      delay = Math.min(delay * 2, 30000)
      return d
    },
    reset() {
      delay = 1000
    },
  }
}

/* ═══════════════════ KLINE WEBSOCKET ═══════════════════ */

/**
 * WebSocket hook for real-time kline updates from Binance.
 * Returns connection status: 'connected' | 'reconnecting' | 'disconnected'
 */
export function useKlineWebSocket(symbol, interval, klines, onUpdate) {
  const onUpdateRef = useRef(onUpdate)
  const klinesRef = useRef(klines)
  const [wsStatus, setWsStatus] = useState('disconnected')

  // Always-fresh ref for callback (runs every render intentionally)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  })

  useEffect(() => {
    klinesRef.current = klines
  }, [klines])

  useEffect(() => {
    if (!klines || klines.length === 0) {
      setWsStatus('disconnected')
      return
    }

    const wsSymbol = symbol.replace('/', '').toLowerCase()
    const stream = `${wsSymbol}@kline_${interval}`
    let ws = null
    let reconnectTimer = null
    let alive = true
    const backoff = createReconnect()

    function connect() {
      setWsStatus('reconnecting')
      ws = new WebSocket(`${WS_BASE}/${stream}`)

      ws.onopen = () => {
        setWsStatus('connected')
        backoff.reset()
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          const k = msg.k
          if (!k) return

          const candle = {
            time: k.t,
            open: +k.o,
            high: +k.h,
            low: +k.l,
            close: +k.c,
            volume: +k.v,
          }

          const prev = klinesRef.current
          if (!prev || prev.length === 0) return

          const last = prev[prev.length - 1]

          if (candle.time === last.time) {
            const updated = [...prev]
            updated[updated.length - 1] = candle
            klinesRef.current = updated
            onUpdateRef.current(updated)
          } else if (candle.time > last.time) {
            const updated = [...prev.slice(1), candle]
            klinesRef.current = updated
            onUpdateRef.current(updated)
          }
        } catch (err) {
          console.warn('[ws] parse error:', err.message)
        }
      }

      ws.onclose = () => {
        if (alive) {
          setWsStatus('reconnecting')
          reconnectTimer = setTimeout(connect, backoff.next())
        }
      }

      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      alive = false
      clearTimeout(reconnectTimer)
      setWsStatus('disconnected')
      ws?.close()
    }
  }, [symbol, interval])

  return wsStatus
}

/* ═══════════════════ TICKER WEBSOCKET ═══════════════════ */

/**
 * WebSocket hook for real-time ticker prices for all watchlist coins.
 * Subscribes to Binance combined miniTicker stream.
 * Returns { tickers: { BTCUSDT: { price, change }, ... }, status }
 */
export function useTickerWebSocket() {
  const [tickers, setTickers] = useState({})
  const [status, setStatus] = useState('disconnected')

  useEffect(() => {
    // Combined stream: wss://stream.binance.com:9443/stream?streams=btcusdt@miniTicker/ethusdt@miniTicker/...
    const streams = COINS.map((c) => c.symbol.toLowerCase() + '@miniTicker').join('/')
    const COMBINED_WS = 'wss://stream.binance.com:9443/stream'
    let ws = null
    let reconnectTimer = null
    let alive = true
    const backoff = createReconnect()

    function connect() {
      setStatus('reconnecting')
      ws = new WebSocket(`${COMBINED_WS}?streams=${streams}`)

      ws.onopen = () => {
        setStatus('connected')
        backoff.reset()
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          // Combined stream wraps payload in { stream, data }
          const d = msg.data
          if (!d || !d.s) return
          setTickers((prev) => ({
            ...prev,
            [d.s]: {
              price: +d.c,
              open24h: +d.o,
              high24h: +d.h,
              low24h: +d.l,
              change: ((+d.c - +d.o) / +d.o) * 100,
              volume: +d.v,
            },
          }))
        } catch (err) {
          console.warn('[ticker-ws] parse error:', err.message)
        }
      }

      ws.onclose = () => {
        if (alive) {
          setStatus('reconnecting')
          reconnectTimer = setTimeout(connect, backoff.next())
        }
      }

      ws.onerror = () => ws?.close()
    }

    connect()

    return () => {
      alive = false
      clearTimeout(reconnectTimer)
      setStatus('disconnected')
      ws?.close()
    }
  }, [])

  return { tickers, status }
}
