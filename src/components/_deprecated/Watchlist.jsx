import { colors, fonts, COINS, SEED_PRICES } from '../theme'
import { fmtPrice, rand } from '../utils/helpers'

/* ═══════════════════ STAR ICON ═══════════════════ */
function StarIcon({ filled }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? '#FFD600' : 'none'}
      stroke={filled ? '#FFD600' : '#C4C4C4'}
      strokeWidth="2"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

/* ═══════════════════ WATCHLIST ═══════════════════ */
export default function Watchlist({ selected, onSelect, favorites, onToggleFav }) {
  return (
    <div style={styles.sidebar}>
      <div style={styles.title}>Watchlist</div>
      <div style={styles.list}>
        {COINS.map((coin) => {
          const active = coin.symbol === selected
          const sp = SEED_PRICES[coin.symbol] || 100
          const r = rand(coin.symbol.charCodeAt(0) + 7)
          const change = (r - 0.45) * 8
          const up = change >= 0

          return (
            <div
              key={coin.symbol}
              onClick={() => onSelect(coin.symbol)}
              style={{
                ...styles.item,
                background: active ? colors.surface : 'transparent',
                borderLeft: active ? `3px solid ${colors.ma25}` : '3px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = colors.hover
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent'
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFav(coin.symbol)
                }}
                style={styles.starBtn}
              >
                <StarIcon filled={favorites.includes(coin.symbol)} />
              </button>

              <span style={styles.icon}>{coin.icon}</span>

              <div style={styles.info}>
                <div style={styles.base}>{coin.base}</div>
              </div>

              <div style={styles.prices}>
                <div style={styles.price}>${fmtPrice(sp)}</div>
                <div style={{ ...styles.change, color: up ? colors.up : colors.down }}>
                  {up ? '+' : ''}
                  {change.toFixed(2)}%
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════ STYLES ═══════════════════ */
const styles = {
  sidebar: {
    width: 210,
    borderRight: `1px solid ${colors.border}`,
    background: colors.bg,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflow: 'hidden',
  },
  title: {
    padding: '14px 16px 10px',
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: 700,
    color: colors.text3,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 6px 8px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.12s',
  },
  starBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    fontSize: 15,
    width: 24,
    textAlign: 'center',
    color: colors.text2,
    fontWeight: 600,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  base: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: 600,
    color: colors.text1,
  },
  prices: {
    textAlign: 'right',
  },
  price: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: 500,
    color: colors.text1,
  },
  change: {
    fontFamily: fonts.mono,
    fontSize: 10,
    marginTop: 1,
  },
}
