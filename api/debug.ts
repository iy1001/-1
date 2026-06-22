import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Debug endpoint to diagnose Binance API connectivity from Vercel.
 * REMOVE after debugging.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const results: Record<string, unknown> = {}

  // Test 1: Basic fetch to Binance klines
  try {
    const resp = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=1', {
      signal: AbortSignal.timeout(10_000),
    })
    results.binanceKlines = {
      status: resp.status,
      statusText: resp.statusText,
      headers: Object.fromEntries(resp.headers.entries()),
      body: (await resp.text()).slice(0, 500),
    }
  } catch (err) {
    results.binanceKlines = { error: (err as Error).message, name: (err as Error).name }
  }

  // Test 2: Basic fetch to Binance ticker
  try {
    const resp = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
      signal: AbortSignal.timeout(10_000),
    })
    results.binanceTicker = {
      status: resp.status,
      body: (await resp.text()).slice(0, 500),
    }
  } catch (err) {
    results.binanceTicker = { error: (err as Error).message, name: (err as Error).name }
  }

  // Test 3: Fetch to a known-working endpoint
  try {
    const resp = await fetch('https://httpbin.org/get', {
      signal: AbortSignal.timeout(5_000),
    })
    results.httpbin = { status: resp.status }
  } catch (err) {
    results.httpbin = { error: (err as Error).message }
  }

  // Test 4: Check Node.js version and environment
  results.env = {
    nodeVersion: process.version,
    platform: process.platform,
    region: process.env.VERCEL_REGION || 'unknown',
  }

  res.json(results)
}
