import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cache } from './_lib/cache'
import { exchange, ensureMarkets } from './_lib/exchange'
import { validateKlineParams } from './_lib/validate'

interface Kline {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

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
    const cached = cache.get(cacheKey) as Kline[] | null
    if (cached) {
      res.json(cached)
      return
    }

    await ensureMarkets()
    const ohlcv = await exchange.fetchOHLCV(symbol, interval, undefined, limit)
    const klines: Kline[] = ohlcv.map((k) => ({
      time: Number(k[0]) || 0,
      open: Number(k[1]) || 0,
      high: Number(k[2]) || 0,
      low: Number(k[3]) || 0,
      close: Number(k[4]) || 0,
      volume: Number(k[5]) || 0,
    }))

    cache.set(cacheKey, klines, 30_000) // 30s TTL
    res.json(klines)
  } catch (err) {
    console.error('[klines] error:', (err as Error).message)
    res.status(502).json({ error: 'Failed to fetch kline data' })
  }
}
