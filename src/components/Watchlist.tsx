import { useState, memo, useMemo } from 'react'
import { COINS, SEED_PRICES } from '../theme'
import { fmtPrice, fmtVol } from '../utils/helpers'
import type { TickerMap } from '../types'

/* ═══════════════════ PROPS ═══════════════════ */
interface WatchlistProps {
  selected: string
  onSelect: (symbol: string) => void
  favorites: string[]
  onToggleFav: (symbol: string) => void
  tickers: TickerMap
}

/* ═══════════════════ STAR ICON ═══════════════════ */
function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? 'var(--color-star)' : 'none'}
      stroke={filled ? 'var(--color-star)' : 'var(--color-star-empty)'}
      strokeWidth="2"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

/* ═══════════════════ WATCHLIST ITEM (memoized) ═══════════════════ */
interface WatchlistItemProps {
  coin: { symbol: string; base: string; icon: string }
  active: boolean
  isFav: boolean
  ticker: import('../types').Ticker | undefined
  onSelect: (symbol: string) => void
  onToggleFav: (symbol: string) => void
}

const WatchlistItem = memo(function WatchlistItem({
  coin,
  active,
  isFav,
  ticker,
  onSelect,
  onToggleFav,
}: WatchlistItemProps) {
  const [hovered, setHovered] = useState(false)
  const price = ticker?.price ?? SEED_PRICES[coin.symbol] ?? 0
  const change = ticker?.change ?? 0
  const up = change >= 0

  return (
    <div
      className={`watchlist-item${active ? ' active' : ''}`}
      onClick={() => onSelect(coin.symbol)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.item,
        background: active
          ? 'var(--color-surface)'
          : hovered
            ? 'var(--color-hover)'
            : 'transparent',
        borderLeft: active
          ? '3px solid var(--color-ma25)'
          : '3px solid transparent',
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFav(coin.symbol)
        }}
        style={styles.starBtn}
      >
        <StarIcon filled={isFav} />
      </button>

      <span style={styles.icon}>{coin.icon}</span>

      <div style={styles.info}>
        <div style={styles.base}>{coin.base}</div>
        {ticker && <div style={styles.vol}>{fmtVol(ticker.volume)}</div>}
      </div>

      <div style={styles.prices}>
        <div style={styles.price}>${fmtPrice(price)}</div>
        <div style={{ ...styles.change, color: up ? 'var(--color-up)' : 'var(--color-down)' }}>
          {up ? '+' : ''}
          {change.toFixed(2)}%
        </div>
      </div>
    </div>
  )
})

/* ═══════════════════ WATCHLIST ═══════════════════ */
export default function Watchlist({
  selected,
  onSelect,
  favorites,
  onToggleFav,
  tickers = {},
}: WatchlistProps) {
  // Sort: favorites first, then the rest — memoized to avoid re-sorting on every render
  const sortedCoins = useMemo(
    () =>
      [...COINS].sort((a, b) => {
        const aFav = favorites.includes(a.symbol) ? 0 : 1
        const bFav = favorites.includes(b.symbol) ? 0 : 1
        return aFav - bFav
      }),
    [favorites]
  )

  return (
    <div style={styles.sidebar}>
      <div className="watchlist-title" style={styles.title}>Watchlist</div>
      <div className="watchlist-list" style={styles.list}>
        {sortedCoins.map((coin) => (
          <WatchlistItem
            key={coin.symbol}
            coin={coin}
            active={coin.symbol === selected}
            isFav={favorites.includes(coin.symbol)}
            ticker={tickers[coin.symbol]}
            onSelect={onSelect}
            onToggleFav={onToggleFav}
          />
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════ STYLES ═══════════════════ */
const styles = {
  sidebar: {
    width: 210,
    height: '100%',
    borderRight: '1px solid var(--color-border)',
    background: 'var(--color-bg)',
    display: 'flex',
    flexDirection: 'column' as const,
    flexShrink: 0,
    overflow: 'hidden',
  },
  title: {
    padding: '14px 16px 10px',
    fontFamily: 'var(--font-sans)',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--color-text3)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
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
    textAlign: 'center' as const,
    color: 'var(--color-text2)',
    fontWeight: 600,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  base: {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-text1)',
  },
  vol: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'var(--color-text3)',
    marginTop: 1,
  },
  prices: {
    textAlign: 'right' as const,
  },
  price: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--color-text1)',
  },
  change: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    marginTop: 1,
  },
}
