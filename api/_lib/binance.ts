/**
 * Direct Binance REST API client.
 * Bypasses ccxt to avoid loadMarkets() overhead in serverless environments.
 */

const BASE_URL = 'https://api.binance.com'

/** Convert ccxt-style "BTC/USDT" to Binance "BTCUSDT" */
export function toBinanceSymbol(symbol: string): string {
  return symbol.replace('/', '')
}

/** Binance kline raw entry: [openTime, open, high, low, close, volume, closeTime, ...] */
interface BinanceKlineRaw extends Array<string | number> {
  0: number // openTime
  1: string // open
  2: string // high
  3: string // low
  4: string // close
  5: string // volume
}

export interface BinanceKline {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export async function fetchBinanceKlines(
  symbol: string,
  interval: string,
  limit: number
): Promise<BinanceKline[]> {
  const binanceSymbol = toBinanceSymbol(symbol)
  const url = `${BASE_URL}/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`

  const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!resp.ok) {
    throw new Error(`Binance klines ${resp.status}: ${await resp.text()}`)
  }

  const raw: BinanceKlineRaw[] = await resp.json()
  return raw.map((k) => ({
    time: Number(k[0]),
    open: parseFloat(String(k[1])),
    high: parseFloat(String(k[2])),
    low: parseFloat(String(k[3])),
    close: parseFloat(String(k[4])),
    volume: parseFloat(String(k[5])),
  }))
}

export interface BinanceTicker {
  symbol: string
  last: number
  high: number
  low: number
  change: number
  percentage: number
  volume: number
}

export async function fetchBinanceTicker(symbol: string): Promise<BinanceTicker> {
  const binanceSymbol = toBinanceSymbol(symbol)
  const url = `${BASE_URL}/api/v3/ticker/24hr?symbol=${binanceSymbol}`

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
