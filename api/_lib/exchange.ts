import ccxt from 'ccxt'

/**
 * Shared ccxt Binance exchange instance.
 * Initialized at module scope to leverage Vercel cold-start caching.
 */
export const exchange = new ccxt.binance({
  options: { defaultType: 'spot' },
  timeout: 15000,
})

/**
 * Ensure markets are loaded (lazy init on first request).
 * Markets are cached in the exchange instance across invocations.
 */
let marketsLoaded = false

export async function ensureMarkets(): Promise<void> {
  if (!marketsLoaded) {
    await exchange.loadMarkets()
    marketsLoaded = true
  }
}
