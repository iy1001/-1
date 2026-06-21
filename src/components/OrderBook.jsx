import { colors, fonts } from '../theme'
import { fmtPrice, rand } from '../utils/helpers'

/* ═══════════════════ ORDER BOOK MINI ═══════════════════ */
export default function OrderBook({ klines }) {
  if (!klines || klines.length === 0) return null

  const last = klines[klines.length - 1]
  const price = last.close
  const spread = price * 0.0003

  /* Generate mock order book data */
  const asks = Array.from({ length: 8 }, (_, i) => ({
    price: price + spread * (i + 1),
    amount: (rand(i * 13 + 1) * 2 + 0.1).toFixed(4),
    pct: rand(i * 7 + 3) * 80 + 10,
  })).reverse()

  const bids = Array.from({ length: 8 }, (_, i) => ({
    price: price - spread * (i + 1),
    amount: (rand(i * 11 + 5) * 2 + 0.1).toFixed(4),
    pct: rand(i * 9 + 2) * 80 + 10,
  }))

  const up = last.close >= last.open

  return (
    <div style={styles.container}>
      <div style={styles.title}>Order Book</div>

      <div style={styles.table}>
        {/* Header */}
        <div style={styles.headerRow}>
          <span>Price</span>
          <span>Amount</span>
        </div>

        {/* Asks (sells) */}
        {asks.map((a, i) => (
          <div key={'a' + i} style={styles.row}>
            <div style={{ ...styles.bar, width: `${a.pct}%`, background: colors.down + '12' }} />
            <span style={{ ...styles.priceCell, color: colors.down, position: 'relative' }}>
              {fmtPrice(a.price)}
            </span>
            <span style={{ ...styles.amountCell, position: 'relative' }}>{a.amount}</span>
          </div>
        ))}

        {/* Spread / current price */}
        <div style={{ ...styles.spreadRow, color: up ? colors.up : colors.down }}>
          ${fmtPrice(price)}
        </div>

        {/* Bids (buys) */}
        {bids.map((b, i) => (
          <div key={'b' + i} style={styles.row}>
            <div style={{ ...styles.bar, width: `${b.pct}%`, background: colors.up + '12' }} />
            <span style={{ ...styles.priceCell, color: colors.up, position: 'relative' }}>
              {fmtPrice(b.price)}
            </span>
            <span style={{ ...styles.amountCell, position: 'relative' }}>{b.amount}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════ STYLES ═══════════════════ */
const styles = {
  container: {
    padding: '12px 12px',
    borderTop: `1px solid ${colors.border}`,
    background: colors.bg,
    flex: 1,
  },
  title: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: 700,
    color: colors.text3,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  table: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0',
    color: colors.text3,
    fontSize: 10,
    borderBottom: `1px solid ${colors.borderLight}`,
    marginBottom: 2,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0',
    position: 'relative',
  },
  bar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  priceCell: {},
  amountCell: {
    color: colors.text2,
  },
  spreadRow: {
    padding: '5px 0',
    fontWeight: 700,
    fontSize: 13,
    textAlign: 'center',
  },
}
