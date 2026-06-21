import { useEffect, useRef } from 'react'
import { INTERVALS, SEED_PRICES } from '../theme'
import { rand } from './helpers'

const WS_BASE = 'wss://stream.binance.com:9443/ws'
const API_BASE = ''

/**
 * Fetch kline data via ccxt backend proxy
 */
export async function fetchKlines(symbol, interval, limit = 120) {
  // ccxt uses format like "BTC/USDT", Binance WS uses "BTCUSDT"
  const ccxtSymbol = symbol.includes('/') ? symbol : symbol.replace('USDT', '/USDT')
  const res = await fetch(`${API_BASE}/api/klines?symbol=${ccxtSymbol}&interval=${interval}&limit=${limit}`, {
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return await res.json()
}

/**
 * Fetch ticker via ccxt backend proxy
 */
export async function fetchTicker(symbol) {
  const ccxtSymbol = symbol.includes('/') ? symbol : symbol.replace('USDT', '/USDT')
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

  for (let i = count - 1; i >= 0; i--) {
    const s = i * 17 + symbol.charCodeAt(0) + (interval.charCodeAt(0) || 0)
    const r1 = rand(s)
    const r2 = rand(s + 1)
    const r3 = rand(s + 2)
    const r4 = rand(s + 3)

    const vol = price * 0.003
    const trend = (r1 - 0.47) * vol * 2.5
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
 * Fetch klines with automatic fallback to mock data
 */
export async function loadKlines(symbol, interval, limit = 120) {
  try {
    return await fetchKlines(symbol, interval, limit)
  } catch {
    return generateKlines(symbol, interval, limit)
  }
}

/**
 * WebSocket hook for real-time kline updates from Binance.
 * Calls onUpdate(newKlines) whenever a candle ticks or a new candle opens.
 * Auto-reconnects on disconnect.
 */
export function useKlineWebSocket(symbol, interval, klines, onUpdate) {
  const onUpdateRef = useRef(onUpdate)
  const klinesRef = useRef(klines)

  useEffect(() => {
    onUpdateRef.current = onUpdate
  })

  useEffect(() => {
    klinesRef.current = klines
  }, [klines])

  useEffect(() => {
    if (!klines || klines.length === 0) return

    // Binance WS uses format "btcusdt@kline_1h"
    const wsSymbol = symbol.replace('/', '').toLowerCase()
    const stream = `${wsSymbol}@kline_${interval}`
    let ws = null
    let reconnectTimer = null
    let alive = true

    function connect() {
      ws = new WebSocket(`${WS_BASE}/${stream}`)

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
        } catch { /* ignore */ }
      }

      ws.onclose = () => {
        if (alive) reconnectTimer = setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      alive = false
      clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [symbol, interval])
}
