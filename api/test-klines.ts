import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Minimal klines test — no _lib imports.
 * Used to isolate FUNCTION_INVOCATION_FAILED cause.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const symbol = (typeof req.query.symbol === 'string' ? req.query.symbol : 'BTCUSDT').replace('/', '')
    const interval = typeof req.query.interval === 'string' ? req.query.interval : '1h'
    const limit = parseInt(typeof req.query.limit === 'string' ? req.query.limit : '3') || 3

    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) })

    if (!resp.ok) {
      res.status(resp.status).json({ error: `Binance ${resp.status}`, body: await resp.text() })
      return
    }

    const raw = await resp.json() as Array<Array<string | number>>
    const klines = raw.map((k) => ({
      time: Number(k[0]),
      open: parseFloat(String(k[1])),
      high: parseFloat(String(k[2])),
      low: parseFloat(String(k[3])),
      close: parseFloat(String(k[4])),
      volume: parseFloat(String(k[5])),
    }))

    res.json(klines)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message, stack: (err as Error).stack })
  }
}
