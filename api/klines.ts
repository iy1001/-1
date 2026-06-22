import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cache } from './_lib/cache'
import { fetchBinanceKlines } from './_lib/binance'
import { validateKlineParams } from './_lib/validate'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const validation = validateKlineParams(req.query as Record<string, string | string[] | undefined>)
  if (!validation.ok) {
    res.status(400).json({ error: validation.error })
    return
  }

  const { symbol, interval, limit } = validation.params

  try {
    const cacheKey = `klines:${symbol}:${interval}:${limit}`
    const cached = cache.get(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }

    const klines = await fetchBinanceKlines(symbol, interval, limit)
    cache.set(cacheKey, klines, 30_000) // 30s TTL
    res.json(klines)
  } catch (err) {
    console.error('[klines] error:', (err as Error).message)
    res.status(502).json({ error: 'Failed to fetch kline data' })
  }
}
