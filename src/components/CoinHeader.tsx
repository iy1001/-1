import { colors, fonts, INTERVALS, SEED_PRICES } from '../theme'
import { fmtPrice, fmtVol } from '../utils/helpers'
import type { Coin, Kline } from '../types'

/* ═══════════════════ PROPS ═══════════════════ */
interface CoinHeaderProps {
  coin: Coin
  klines: Kline[] | null
  interval: string
  onChangeInterval: (interval: string) => void
  showMA7: boolean
  onToggleMA7: () => void
  showMA25: boolean
  onToggleMA25: () => void
}

/* ═══════════════════ COIN HEADER ═══════════════════ */
export default function CoinHeader({
  coin,
  klines,
  interval,
  onChangeInterval,
  showMA7,
  onToggleMA7,
  showMA25,
  onToggleMA25,
}: CoinHeaderProps) {
  const last = klines?.[klines.length - 1]
  const price = last?.close ?? SEED_PRICES[coin.symbol] ?? 0
  const open = klines?.[0]?.open ?? price
  const change = ((price - open) / open) * 100
  const up = change >= 0

  const high24 = klines ? Math.max(...klines.map((k) => k.high)) : 0
  const low24 = klines ? Math.min(...klines.map((k) => k.low)) : 0
  const vol24 = klines ? klines.reduce((s, k) => s + k.volume, 0) : 0

  return (
    <div style={styles.header}>
      {/* Coin identity */}
      <div style={styles.coinId}>
        <div style={styles.coinIcon}>{coin.icon}</div>
        <div>
          <div style={styles.coinName}>
            {coin.base}
            <span style={styles.coinPair}> / USDT</span>
          </div>
          <div style={styles.coinSub}>{coin.name}</div>
        </div>
      </div>

      {/* Price */}
      <div style={styles.priceBlock}>
        <div style={{ ...styles.price, color: up ? colors.up : colors.down }}>
          ${fmtPrice(price)}
        </div>
        <div style={{ ...styles.change, color: up ? colors.up : colors.down }}>
          {up ? '+' : ''}
          {change.toFixed(2)}%
        </div>
      </div>

      {/* Stats */}
      <div style={styles.stats}>
        <div>
          <span style={styles.statLabel}>24h H </span>
          <span style={styles.statValue}>${fmtPrice(high24)}</span>
        </div>
        <div>
          <span style={styles.statLabel}>24h L </span>
          <span style={styles.statValue}>${fmtPrice(low24)}</span>
        </div>
        <div>
          <span style={styles.statLabel}>24h Vol </span>
          <span style={styles.statValue}>{fmtVol(vol24)}</span>
        </div>
      </div>

      {/* Intervals */}
      <div style={styles.intervals}>
        {INTERVALS.map((iv) => (
          <button
            key={iv.value}
            onClick={() => onChangeInterval(iv.value)}
            style={{
              ...styles.intervalBtn,
              background: interval === iv.value ? colors.text1 : 'transparent',
              color: interval === iv.value ? '#FFF' : colors.text2,
            }}
          >
            {iv.label}
          </button>
        ))}
      </div>

      {/* MA toggles */}
      <div style={styles.maToggles}>
        {(
          [
            { label: 'MA7', color: colors.ma7, on: showMA7, toggle: onToggleMA7 },
            { label: 'MA25', color: colors.ma25, on: showMA25, toggle: onToggleMA25 },
          ] as const
        ).map((m) => (
          <button
            key={m.label}
            onClick={m.toggle}
            style={{
              ...styles.maBtn,
              border: m.on ? `1.5px solid ${m.color}` : '1.5px solid transparent',
              background: m.on ? m.color + '18' : colors.surface,
              color: m.on ? m.color : colors.text3,
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════ STYLES ═══════════════════ */
const styles = {
  header: {
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 28,
    flexWrap: 'wrap' as const,
    borderBottom: `1px solid ${colors.border}`,
    background: colors.bg,
    flexShrink: 0,
  },
  coinId: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  coinIcon: {
    fontSize: 26,
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: colors.surface,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.text2,
    fontWeight: 700,
  },
  coinName: {
    fontFamily: fonts.sans,
    fontSize: 17,
    fontWeight: 700,
    color: colors.text1,
    letterSpacing: '-0.02em',
  },
  coinPair: {
    color: colors.text3,
    fontWeight: 400,
  },
  coinSub: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.text3,
  },
  priceBlock: {},
  price: {
    fontFamily: fonts.mono,
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  change: {
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  stats: {
    display: 'flex',
    gap: 20,
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  statLabel: { color: colors.text3 },
  statValue: { color: colors.text1 },
  intervals: {
    display: 'flex',
    gap: 2,
    marginLeft: 'auto',
  },
  intervalBtn: {
    padding: '5px 11px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  maToggles: {
    display: 'flex',
    gap: 10,
  },
  maBtn: {
    padding: '4px 10px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontSize: 12,
    fontFamily: fonts.mono,
    fontWeight: 600,
  },
}
