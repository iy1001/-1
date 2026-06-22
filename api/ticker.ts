import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cache } from './_lib/cache'
import { exchange, ensureMarkets } from './_lib/exchange'
import { validateTickerParams } from './_lib/validate'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const validation = validateTickerParams(
    req.query as Record<string, string | string[] | undefined>
  )
  if (!validation.ok) {
    res.status(400).json({ error: validation.error })
    return
  }

  const { symbol } = validation

  try {
    const cacheKey = `ticker:${symbol}`
    const cached = cache.get(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }

    await ensureMarkets()
    const ticker = await exchange.fetchTicker(symbol)
    const result = {
      symbol: ticker.symbol,
      last: ticker.last ?? 0,
      high: ticker.high ?? 0,
      low: ticker.low ?? 0,
      change: ticker.change ?? 0,
      percentage: ticker.percentage ?? 0,
      volume: ticker.baseVolume ?? 0,
    }

    cache.set(cacheKey, result, 10_000) // 10s TTL
    res.json(result)
  } catch (err) {
    console.error('[ticker] error:', (err as Error).message)
    res.status(502).json({ error: 'Failed to fetch ticker data' })
  }
}
