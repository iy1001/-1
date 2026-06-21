import { colors, fonts } from '../theme'
import { fmtPrice, fmtVol } from '../utils/helpers'

/* ═══════════════════ STATS BAR ═══════════════════ */
export default function StatsBar({ klines }) {
  if (!klines || klines.length === 0) return null

  const last = klines[klines.length - 1]
  const high = Math.max(...klines.map((k) => k.high))
  const low = Math.min(...klines.map((k) => k.low))
  const vol = klines.reduce((s, k) => s + k.volume, 0)
  const change = ((last.close - klines[0].open) / klines[0].open) * 100
  const up = change >= 0

  const items = [
    { label: 'Period High', value: '$' + fmtPrice(high), color: colors.up },
    { label: 'Period Low', value: '$' + fmtPrice(low), color: colors.down },
    { label: 'Volume', value: fmtVol(vol), color: colors.text1 },
    {
      label: 'Change',
      value: (up ? '+' : '') + change.toFixed(2) + '%',
      color: up ? colors.up : colors.down,
    },
    { label: 'Candles', value: klines.length, color: colors.text1 },
  ]

  return (
    <div style={styles.bar}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            ...styles.cell,
            borderRight: i < items.length - 1 ? `1px solid ${colors.borderLight}` : 'none',
          }}
        >
          <div style={styles.label}>{item.label}</div>
          <div style={{ ...styles.value, color: item.color }}>{item.value}</div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════ STYLES ═══════════════════ */
const styles = {
  bar: {
    display: 'flex',
    gap: 0,
    padding: '0 20px',
    borderTop: `1px solid ${colors.border}`,
    background: colors.bg,
    overflowX: 'auto',
    flexShrink: 0,
  },
  cell: {
    flex: 1,
    padding: '10px 0',
    textAlign: 'center',
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.text3,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  value: {
    fontFamily: fonts.mono,
    fontSize: 14,
    fontWeight: 600,
    marginTop: 2,
  },
}
