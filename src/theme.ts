import type { Coin, Interval } from './types'

/* ═══════════════════ THEME ═══════════════════ */
export const colors = {
  bg: '#FFFFFF',
  surface: '#F7F8FA',
  surfaceAlt: '#FAFBFC',
  border: '#E8EAED',
  borderLight: '#F0F1F3',
  text1: '#1A1A2E',
  text2: '#5F6368',
  text3: '#9AA0A6',
  up: '#00E676',
  down: '#FF1744',
  ma7: '#FFD600',
  ma25: '#7C4DFF',
  cross: '#9E9E9E',
  crossBg: '#424242',
  hover: '#F5F5F5',
  accent: '#4285F4',
} as const

export const fonts = {
  sans: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
} as const

/* ═══════════════════ COINS ═══════════════════ */
export const COINS: Coin[] = [
  { symbol: 'BTCUSDT', base: 'BTC', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETHUSDT', base: 'ETH', name: 'Ethereum', icon: 'Ξ' },
  { symbol: 'SOLUSDT', base: 'SOL', name: 'Solana', icon: '◎' },
  { symbol: 'BNBUSDT', base: 'BNB', name: 'BNB', icon: '◆' },
  { symbol: 'XRPUSDT', base: 'XRP', name: 'XRP', icon: '✕' },
  { symbol: 'DOGEUSDT', base: 'DOGE', name: 'Dogecoin', icon: 'Ð' },
  { symbol: 'ADAUSDT', base: 'ADA', name: 'Cardano', icon: '₳' },
  { symbol: 'AVAXUSDT', base: 'AVAX', name: 'Avalanche', icon: '▲' },
]

/* ═══════════════════ INTERVALS ═══════════════════ */
export const INTERVALS: Interval[] = [
  { value: '1m', label: '1m', ms: 60_000 },
  { value: '5m', label: '5m', ms: 300_000 },
  { value: '15m', label: '15m', ms: 900_000 },
  { value: '30m', label: '30m', ms: 1_800_000 },
  { value: '1h', label: '1h', ms: 3_600_000 },
  { value: '4h', label: '4h', ms: 14_400_000 },
  { value: '1d', label: '1D', ms: 86_400_000 },
  { value: '1w', label: '1W', ms: 604_800_000 },
]

/* ═══════════════════ SEED PRICES ═══════════════════ */
export const SEED_PRICES: Record<string, number> = {
  BTCUSDT: 64200,
  ETHUSDT: 1730,
  SOLUSDT: 74,
  BNBUSDT: 588,
  XRPUSDT: 1.15,
  DOGEUSDT: 0.083,
  ADAUSDT: 0.162,
  AVAXUSDT: 6.3,
}
