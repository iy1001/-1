import { useEffect, useRef, useState } from 'react'
import { INTERVALS, SEED_PRICES, COINS } from '../theme'
import { rand } from './helpers'
import type { Kline, KlineLoadResult, TickerMap, WsStatus } from '../types'

const WS_BASE = 'wss://stream.binance.com:9443/ws'
const API_BASE = ''

/**
 * Convert BTCUSDT → BTC/USDT for backend API
 */
function toCcxtSymbol(symbol: string): string {
  if (symbol.includes('/')) return symbol
  return symbol.slice(0, -4) + '/' + symbol.slice(-4)
}

/**
 * Fetch kline data via backend API (Binance REST proxy)
 */
export async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number = 120
): Promise<Kline[]> {
  const ccxtSymbol = toCcxtSymbol(symbol)
  const res = await fetch(
    `${API_BASE}/api/klines?symbol=${ccxtSymbol}&interval=${interval}&limit=${limit}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return (await res.json()) as Kline[]
}

/**
 * Fetch ticker via backend API (Binance REST proxy)
 */
export async function fetchTicker(symbol: string): Promise<Record<string, unknown>> {
  const ccxtSymbol = toCcxtSymbol(symbol)
  const res = await fetch(`${API_BASE}/api/ticker?symbol=${ccxtSymbol}`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return (await res.json()) as Record<string, unknown>
}

/**
 * Generate mock kline data (fallback when backend unavailable)
 */
export function generateKlines(symbol: string, interval: string, count: number = 120): Kline[] {
  const ms = INTERVALS.find((i) => i.value === interval)?.ms || 60_000
  let price = SEED_PRICES[symbol] || 100
  const out: Kline[] = []
  const now = Date.now()

  // Hash the full interval string for unique seeds across intervals
  let ivHash = 0
  for (let c = 0; c < interval.length; c++) {
    ivHash = ivHash * 31 + interval.charCodeAt(c)
  }
  // Scale volatility by interval duration (longer intervals = larger candles)
  const volScale = Math.sqrt(ms / 3_600_000) * 0.003

  for (let i = count - 1; i >= 0; i--) {
    const s = i * 17 + symbol.charCodeAt(0) + ivHash
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
export async function loadKlines(
  symbol: string,
  interval: string,
  limit: number = 120
): Promise<KlineLoadResult> {
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
    next(): number {
      const d = delay
      delay = Math.min(delay * 2, 30000)
      return d
    },
    reset(): void {
      delay = 1000
    },
  }
}

/* ═══════════════════ KLINE WEBSOCKET ═══════════════════ */

/**
 * WebSocket hook for real-time kline updates from Binance.
 * Returns connection status: 'connected' | 'reconnecting' | 'disconnected'
 */
export function useKlineWebSocket(
  symbol: string,
  interval: string,
  klines: Kline[] | null,
  onUpdate: (klines: Kline[]) => void
): WsStatus {
  const onUpdateRef = useRef(onUpdate)
  const klinesRef = useRef(klines)
  const [wsStatus, setWsStatus] = useState<WsStatus>('disconnected')

  // Always-fresh ref for callback
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
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let alive = true
    const backoff = createReconnect()

    function connect(): void {
      setWsStatus('reconnecting')
      ws = new WebSocket(`${WS_BASE}/${stream}`)

      ws.onopen = (): void => {
        setWsStatus('connected')
        backoff.reset()
      }

      ws.onmessage = (event: MessageEvent): void => {
        try {
          const msg = JSON.parse(event.data as string)
          const k = msg.k
          if (!k) return

          const candle: Kline = {
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
          console.warn('[ws] parse error:', (err as Error).message)
        }
      }

      ws.onclose = (): void => {
        if (alive) {
          setWsStatus('reconnecting')
          reconnectTimer = setTimeout(connect, backoff.next())
        }
      }

      ws.onerror = (): void => {
        ws?.close()
      }
    }

    connect()

    return () => {
      alive = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
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
 */
export function useTickerWebSocket(): { tickers: TickerMap; status: WsStatus } {
  const [tickers, setTickers] = useState<TickerMap>({})
  const [status, setStatus] = useState<WsStatus>('disconnected')

  useEffect(() => {
    const COMBINED_WS = 'wss://stream.binance.com:9443/stream'
    const streams = COINS.map((c) => c.symbol.toLowerCase() + '@miniTicker').join('/')
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let alive = true
    const backoff = createReconnect()

    function connect(): void {
      setStatus('reconnecting')
      ws = new WebSocket(`${COMBINED_WS}?streams=${streams}`)

      ws.onopen = (): void => {
        setStatus('connected')
        backoff.reset()
      }

      ws.onmessage = (event: MessageEvent): void => {
        try {
          const msg = JSON.parse(event.data as string)
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
          console.warn('[ticker-ws] parse error:', (err as Error).message)
        }
      }

      ws.onclose = (): void => {
        if (alive) {
          setStatus('reconnecting')
          reconnectTimer = setTimeout(connect, backoff.next())
        }
      }

      ws.onerror = (): void => {
        ws?.close()
      }
    }

    connect()

    return () => {
      alive = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      setStatus('disconnected')
      ws?.close()
    }
  }, [])

  return { tickers, status }
}
