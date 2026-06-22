import { useState, useEffect, useCallback } from 'react'
import { COINS } from '../theme'
import { loadKlines, useKlineWebSocket, useTickerWebSocket } from '../utils/api'
import { useTheme } from '../hooks/useTheme'
import KlineChart from './KlineChart'
import CoinHeader from './CoinHeader'
import Watchlist from './Watchlist'
import type { Kline, Coin } from '../types'

const FAV_KEY = 'td_favorites'

function loadFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') as string[]
  } catch {
    return []
  }
}

/* ═══════════════════ DASHBOARD ═══════════════════ */
export default function Dashboard() {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [interval, setInterval] = useState('1h')
  const [klines, setKlines] = useState<Kline[] | null>(null)
  const [isMockData, setIsMockData] = useState(false)
  const [showMA7, setShowMA7] = useState(true)
  const [showMA25, setShowMA25] = useState(true)
  const [favorites, setFavorites] = useState<string[]>(loadFavorites)
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([])

  const { theme, toggleTheme } = useTheme()
  const coin: Coin = COINS.find((c) => c.symbol === symbol) || COINS[0]

  /* Fetch klines on symbol/interval change */
  useEffect(() => {
    let cancelled = false
    setKlines(null)

    loadKlines(symbol, interval).then(({ data, isMock }) => {
      if (!cancelled) {
        setKlines(data)
        setIsMockData(isMock)
      }
    })

    return () => {
      cancelled = true
    }
  }, [symbol, interval])

  /* Persist favorites */
  useEffect(() => {
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites))
  }, [favorites])

  /* Real-time kline WebSocket */
  const handleWSUpdate = useCallback((newKlines: Kline[]) => {
    setKlines(newKlines)
  }, [])

  const wsStatus = useKlineWebSocket(symbol, interval, klines, handleWSUpdate)

  /* Real-time ticker prices for all coins */
  const { tickers } = useTickerWebSocket()

  const addToast = useCallback((msg: string) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, msg }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  /* Toast on WS disconnection */
  useEffect(() => {
    if (wsStatus === 'disconnected') {
      addToast('WebSocket disconnected')
    }
  }, [wsStatus, addToast])

  const toggleFav = useCallback((sym: string) => {
    setFavorites((prev) => (prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]))
  }, [])

  const toggleMA7 = useCallback(() => setShowMA7((v) => !v), [])
  const toggleMA25 = useCallback(() => setShowMA25((v) => !v), [])

  return (
    <div className="dashboard-root" style={styles.root}>
      {/* Top Bar */}
      <div className="dashboard-topbar" style={styles.topBar}>
        <div style={styles.topLeft}>
          <div
            style={{
              ...styles.statusDot,
              background: wsStatus === 'connected' ? 'var(--color-up)' : 'var(--color-down)',
              boxShadow: `0 0 6px ${wsStatus === 'connected' ? 'var(--color-up)' : 'var(--color-down)'}80`,
            }}
          />
          <span style={styles.topTitle}>Trading Dashboard</span>
          {isMockData && <span style={styles.mockBadge}>SIMULATED</span>}
        </div>
        <div style={styles.topRight}>
          <span style={styles.topDate}>
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <button onClick={toggleTheme} style={styles.themeBtn} title="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="dashboard-content" style={styles.content}>
        <div className="watchlist-sidebar" style={styles.sidebarWrap}>
          <Watchlist
            selected={symbol}
            onSelect={setSymbol}
            favorites={favorites}
            onToggleFav={toggleFav}
            tickers={tickers}
          />
        </div>

        <div style={styles.main}>
          <CoinHeader
            coin={coin}
            klines={klines}
            interval={interval}
            onChangeInterval={setInterval}
            showMA7={showMA7}
            onToggleMA7={toggleMA7}
            showMA25={showMA25}
            onToggleMA25={toggleMA25}
          />

          <div style={styles.chartArea}>
            <KlineChart klines={klines} showMA7={showMA7} showMA25={showMA25} />
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════ STYLES ═══════════════════ */
const styles = {
  root: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    background: 'var(--color-bg)',
    fontFamily: 'var(--font-sans)',
    overflow: 'hidden',
    transition: 'background 0.2s, color 0.2s',
  },
  topBar: {
    padding: '8px 20px',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--color-bg)',
    flexShrink: 0,
  },
  topLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  topRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    transition: 'all 0.3s',
  },
  topTitle: {
    fontFamily: 'var(--font-sans)',
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--color-text1)',
    letterSpacing: '-0.02em',
  },
  mockBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 700,
    color: 'var(--color-badge-text)',
    background: 'var(--color-badge-bg)',
    border: '1px solid var(--color-badge-border)',
    padding: '1px 6px',
    borderRadius: 3,
    letterSpacing: '0.05em',
  },
  topDate: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--color-text3)',
  },
  themeBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: 6,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
    transition: 'border-color 0.2s',
  },
  sidebarWrap: {
    flexShrink: 0,
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    minWidth: 0,
  },
  chartArea: {
    flex: 1,
    position: 'relative' as const,
    minHeight: 0,
  },
}
