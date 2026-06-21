import { useState, useEffect, useRef } from 'react'
import { colors, fonts } from '../theme'
import { fmtPrice, fmtVol, pad2, calcMA } from '../utils/helpers'

/* ═══════════════════ RESIZE HOOK ═══════════════════ */
function useContainerSize(ref) {
  const [size, setSize] = useState({ width: 900, height: 460 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      setSize({ width, height: Math.max(height, 280) })
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return size
}

/* ═══════════════════ KLINE CHART ═══════════════════ */
export default function KlineChart({ klines, showMA7, showMA25 }) {
  const containerRef = useRef(null)
  const { width, height } = useContainerSize(containerRef)
  const [hoveredIdx, setHoveredIdx] = useState(null)

  /* Loading state */
  if (!klines || klines.length === 0) {
    return (
      <div ref={containerRef} style={styles.container}>
        <div style={styles.loading}>Loading chart...</div>
      </div>
    )
  }

  /* Layout */
  const PAD = { top: 28, right: 82, bottom: 38, left: 14 }
  const chartW = width - PAD.left - PAD.right
  const chartH = height - PAD.top - PAD.bottom

  /* Price range */
  const allPrices = klines.flatMap((k) => [k.high, k.low])
  let pMin = Math.min(...allPrices)
  let pMax = Math.max(...allPrices)
  const pPad = (pMax - pMin) * 0.06 || pMax * 0.01
  pMin -= pPad
  pMax += pPad
  const pRange = pMax - pMin || 1

  /* Candle geometry */
  const candleW = chartW / klines.length
  const bodyW = Math.max(1, candleW * 0.55)

  /* Map data → pixel coords */
  const toY = (price) => PAD.top + (1 - (price - pMin) / pRange) * chartH
  const pts = klines.map((k, i) => ({
    ...k,
    i,
    x: PAD.left + (i + 0.5) * candleW,
    oY: toY(k.open),
    cY: toY(k.close),
    hY: toY(k.high),
    lY: toY(k.low),
    up: k.close >= k.open,
  }))

  /* Moving average paths */
  const maPath = (values, color, show) => {
    if (!show) return null
    let started = false
    const d = values.reduce((acc, v, i) => {
      if (v == null) return acc
      const x = PAD.left + (i + 0.5) * candleW
      const y = toY(v)
      acc += (started ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1)
      started = true
      return acc
    }, '')
    return <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
  }

  /* Grid */
  const gridLines = []
  for (let i = 0; i <= 5; i++) {
    const p = pMin + (pRange * i) / 5
    gridLines.push({ y: toY(p), price: p, edge: i === 0 || i === 5 })
  }

  /* Time labels */
  const timeStep = Math.max(1, Math.floor(klines.length / 6))

  /* Mouse handling */
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const idx = Math.max(0, Math.min(klines.length - 1, Math.floor((mx - PAD.left) / candleW)))
    setHoveredIdx(idx)
  }

  const hd = hoveredIdx != null ? pts[hoveredIdx] : null
  const lastK = klines[klines.length - 1]
  const lastY = toY(lastK.close)
  const lastUp = lastK.close >= lastK.open

  return (
    <div
      ref={containerRef}
      style={styles.container}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      <svg width={width} height={height} style={{ display: 'block' }}>
        <defs>
          <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill={colors.surface} />
        <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} fill="#FFFFFF" rx="4" />

        {/* Grid lines */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={g.y} x2={PAD.left + chartW} y2={g.y}
              stroke={g.edge ? colors.border : colors.borderLight}
              strokeWidth="1"
              strokeDasharray={g.edge ? 'none' : '3,3'}
            />
            <text
              x={PAD.left + chartW + 8} y={g.y + 4}
              fill={colors.text3} fontSize="11"
              fontFamily={fonts.mono}
            >
              {fmtPrice(g.price)}
            </text>
          </g>
        ))}

        {/* Time labels */}
        {pts.map((p, i) => {
          if (i % timeStep !== 0) return null
          const d = new Date(p.time)
          return (
            <text
              key={i} x={p.x} y={height - 10}
              fill={colors.text3} fontSize="10"
              fontFamily={fonts.mono} textAnchor="middle"
            >
              {pad2(d.getHours())}:{pad2(d.getMinutes())}
            </text>
          )
        })}

        {/* MA lines (25 first, then 7 on top) */}
        {maPath(calcMA(klines, 25), colors.ma25, showMA25)}
        {maPath(calcMA(klines, 7), colors.ma7, showMA7)}

        {/* Candlesticks with neon glow */}
        <g filter="url(#neonGlow)">
          {pts.map((p) => (
            <g key={p.i}>
              <line
                x1={p.x} y1={p.hY} x2={p.x} y2={p.lY}
                stroke={p.up ? colors.up : colors.down}
                strokeWidth="1"
              />
              <rect
                x={p.x - bodyW / 2}
                y={Math.min(p.oY, p.cY)}
                width={bodyW}
                height={Math.max(Math.abs(p.cY - p.oY), 1)}
                fill={p.up ? colors.up : colors.down}
                rx={bodyW > 4 ? 1 : 0}
              />
            </g>
          ))}
        </g>

        {/* Current price dashed line */}
        <line
          x1={PAD.left} y1={lastY} x2={PAD.left + chartW} y2={lastY}
          stroke={lastUp ? colors.up : colors.down}
          strokeWidth="1" strokeDasharray="4,3" opacity="0.6"
        />
        <rect x={PAD.left + chartW + 2} y={lastY - 11} width="74" height="22" rx="4" fill={lastUp ? colors.up : colors.down} />
        <text
          x={PAD.left + chartW + 39} y={lastY + 4}
          fill="#FFF" fontSize="11" fontFamily={fonts.mono}
          textAnchor="middle" fontWeight="600"
        >
          {fmtPrice(lastK.close)}
        </text>

        {/* Crosshair */}
        {hd && (
          <g>
            <line x1={hd.x} y1={PAD.top} x2={hd.x} y2={PAD.top + chartH} stroke={colors.cross} strokeWidth="0.8" strokeDasharray="3,3" />
            <line x1={PAD.left} y1={hd.cY} x2={PAD.left + chartW} y2={hd.cY} stroke={colors.cross} strokeWidth="0.8" strokeDasharray="3,3" />
            <rect x={PAD.left + chartW + 2} y={hd.cY - 10} width="74" height="20" rx="3" fill={colors.crossBg} />
            <text x={PAD.left + chartW + 39} y={hd.cY + 4} fill="#FFF" fontSize="10" fontFamily={fonts.mono} textAnchor="middle">
              {fmtPrice(hd.close)}
            </text>
            <rect x={hd.x - 32} y={height - 28} width="64" height="18" rx="3" fill={colors.crossBg} />
            <text x={hd.x} y={height - 15} fill="#FFF" fontSize="9" fontFamily={fonts.mono} textAnchor="middle">
              {pad2(new Date(hd.time).getHours())}:{pad2(new Date(hd.time).getMinutes())}
            </text>
          </g>
        )}
      </svg>

      {/* OHLCV tooltip */}
      {hd && (
        <div style={styles.ohlcv}>
          <span>O <b style={{ color: hd.up ? colors.up : colors.down }}>{fmtPrice(hd.open)}</b></span>
          <span>H <b style={{ color: hd.up ? colors.up : colors.down }}>{fmtPrice(hd.high)}</b></span>
          <span>L <b style={{ color: hd.up ? colors.up : colors.down }}>{fmtPrice(hd.low)}</b></span>
          <span>C <b style={{ color: hd.up ? colors.up : colors.down }}>{fmtPrice(hd.close)}</b></span>
          <span>Vol <b style={{ color: colors.text1 }}>{fmtVol(hd.volume)}</b></span>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════ STYLES ═══════════════════ */
const styles = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    cursor: 'crosshair',
    overflow: 'hidden',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: colors.text3,
    fontFamily: fonts.sans,
    fontSize: 14,
  },
  ohlcv: {
    position: 'absolute',
    top: 6,
    left: 22,
    display: 'flex',
    gap: 10,
    fontSize: 11,
    fontFamily: fonts.mono,
    color: colors.text2,
    pointerEvents: 'none',
    userSelect: 'none',
    background: 'rgba(255,255,255,0.88)',
    padding: '3px 10px',
    borderRadius: 4,
  },
}
