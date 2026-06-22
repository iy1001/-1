/* ═══════════════════ SHARED TYPES ═══════════════════ */

export interface Kline {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Ticker {
  price: number
  open24h: number
  high24h: number
  low24h: number
  change: number
  volume: number
}

export interface Coin {
  symbol: string
  base: string
  name: string
  icon: string
}

export interface Interval {
  value: string
  label: string
  ms: number
}

export type WsStatus = 'connected' | 'reconnecting' | 'disconnected'

export interface KlineLoadResult {
  data: Kline[]
  isMock: boolean
}

export interface TickerMap {
  [symbol: string]: Ticker
}
