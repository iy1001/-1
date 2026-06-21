import { useState, useEffect, useCallback } from 'react'
import { colors, fonts, COINS } from '../theme'
import { loadKlines, useKlineWebSocket } from '../utils/api'
import KlineChart from './KlineChart'
import CoinHeader from './CoinHeader'
import Watchlist from './Watchlist'

/* ═══════════════════ DASHBOARD ═══════════════════ */
export default function Dashboard() {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [interval, setInterval] = useState('1h')
  const [klines, setKlines] = useState(null)
  const [showMA7, setShowMA7] = useState(true)
  const [showMA25, setShowMA25] = useState(true)
  const [favorites, setFavorites] = useState([])

  const coin = COINS.find((c) => c.symbol === symbol) || COINS[0]

  useEffect(() => {
    let cancelled = false
    setKlines(null)

    loadKlines(symbol, interval).then((data) => {
      if (!cancelled) setKlines(data)
    })

    return () => { cancelled = true }
  }, [symbol, interval])

  /* Real-time WebSocket updates */
  const handleWSUpdate = useCallback((newKlines) => {
    setKlines(newKlines)
  }, [])

  const toggleFav = useCallback((sym) => {
    setFavorites((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    )
  }, [])

  useKlineWebSocket(symbol, interval, klines, handleWSUpdate)

  return (
    <div style={styles.root}>
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <div style={styles.statusDot} />
          <span style={styles.topTitle}>Trading Dashboard</span>
        </div>
        <div style={styles.topDate}>
          {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>

      <div style={styles.content}>
        <Watchlist
          selected={symbol}
          onSelect={setSymbol}
          favorites={favorites}
          onToggleFav={toggleFav}
        />

        <div style={styles.main}>
          <CoinHeader
            coin={coin}
            klines={klines}
            interval={interval}
            onChangeInterval={setInterval}
            showMA7={showMA7}
            onToggleMA7={() => setShowMA7(!showMA7)}
            showMA25={showMA25}
            onToggleMA25={() => setShowMA25(!showMA25)}
          />

          <div style={styles.chartArea}>
            <KlineChart klines={klines} showMA7={showMA7} showMA25={showMA25} />
          </div>
        </div>
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
    flexDirection: 'column',
    background: colors.bg,
    fontFamily: fonts.sans,
    overflow: 'hidden',
  },
  topBar: {
    padding: '8px 20px',
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: colors.bg,
    flexShrink: 0,
  },
  topLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: colors.up,
    boxShadow: `0 0 6px ${colors.up}80`,
  },
  topTitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: 700,
    color: colors.text1,
    letterSpacing: '-0.02em',
  },
  topDate: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.text3,
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
    minHeight: 0,
  },
}
