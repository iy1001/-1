import ccxt from 'ccxt'

/**
 * Shared ccxt Binance exchange instance.
 * Initialized at module scope to leverage Vercel cold-start caching.
 * No proxy needed — Vercel functions run in the cloud and can reach Binance directly.
 */
export const exchange = new ccxt.binance({
  options: { defaultType: 'spot' },
  timeout: 15000,
})
