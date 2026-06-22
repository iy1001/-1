/**
 * Input validation for API query parameters.
 */

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

export interface KlineParams {
  symbol: string
  interval: string
  limit: number
}

export function validateKlineParams(
  query: Record<string, string | string[] | undefined>
): { ok: true; params: KlineParams } | { ok: false; error: string } {
  const rawSymbol = typeof query.symbol === 'string' ? query.symbol : 'BTC/USDT'
  const symbol = rawSymbol.toUpperCase()
  const interval = typeof query.interval === 'string' ? query.interval : '1h'
  const limit = parseInt(typeof query.limit === 'string' ? query.limit : '120') || 120

  if (!SYMBOL_RE.test(symbol)) return { ok: false, error: 'Invalid symbol format' }
  if (!VALID_INTERVALS.has(interval)) return { ok: false, error: 'Invalid interval' }
  if (limit < 1 || limit > MAX_LIMIT) return { ok: false, error: `Limit must be 1-${MAX_LIMIT}` }

  return { ok: true, params: { symbol, interval, limit: Math.min(limit, MAX_LIMIT) } }
}

export function validateTickerParams(
  query: Record<string, string | string[] | undefined>
): { ok: true; symbol: string } | { ok: false; error: string } {
  const rawSymbol = typeof query.symbol === 'string' ? query.symbol : 'BTC/USDT'
  const symbol = rawSymbol.toUpperCase()

  if (!SYMBOL_RE.test(symbol)) return { ok: false, error: 'Invalid symbol format' }
  return { ok: true, symbol }
}
