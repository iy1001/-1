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
}

export const fonts = {
  sans: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
}

/* ═══════════════════ COINS ═══════════════════ */
export const COINS = [
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
export const INTERVALS = [
  { value: '1m', label: '1m', ms: 60_000 },
  { value: '1h', label: '1h', ms: 3_600_000 },
]

/* ═══════════════════ SEED PRICES ═══════════════════ */
export const SEED_PRICES = {
  BTCUSDT: 67500,
  ETHUSDT: 3550,
  SOLUSDT: 172,
  BNBUSDT: 615,
  XRPUSDT: 0.62,
  DOGEUSDT: 0.155,
  ADAUSDT: 0.46,
  AVAXUSDT: 38,
}
