import type { Kline } from '../types'

/**
 * Format price with appropriate decimal places
 */
export function fmtPrice(p: number | null | undefined): string {
  if (p == null || isNaN(p)) return '—'
  if (p >= 1000)
    return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (p >= 1) return p.toFixed(4)
  return p.toFixed(6)
}

/**
 * Format volume to K/M/B
 */
export function fmtVol(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  return v.toFixed(0)
}

/**
 * Pad number to 2 digits
 */
export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Deterministic pseudo-random from seed (0~1)
 */
export function rand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

/**
 * Calculate simple moving average
 */
export function calcMA(data: Kline[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close
    return sum / period
  })
}
