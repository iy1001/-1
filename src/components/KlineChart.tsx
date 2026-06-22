import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { fmtPrice, fmtVol, pad2, calcMA } from '../utils/helpers'
import { calcEMA, calcBollinger } from '../utils/indicators'
import type { Kline } from '../types'

/* ═══════════════════ RESIZE HOOK ═══════════════════ */
function useContainerSize(ref: React.RefObject<HTMLDivElement | null>): {
  width: number
  height: number
} | null {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let rafId: number | null = null
    const update = (): void => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const { width, height } = el.getBoundingClientRect()
        setSize({ width, height: Math.max(height, 280) })
      })
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      ro.disconnect()
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [ref])

  return size
}

/* ═══════════════════ PROPS ═══════════════════ */
interface KlineChartProps {
  klines: Kline[] | null
  showMA7: boolean
  showMA25: boolean
  showEMA?: boolean
  showBollinger?: boolean
  showVolume?: boolean
}

/* ═══════════════════ CONSTANTS ═══════════════════ */
const PAD = { top: 28, right: 82, bottom: 38, left: 14 }
const MIN_VISIBLE = 30
const MAX_VISIBLE = 300
const VOLUME_RATIO = 0.18 // volume sub-chart takes 18% of chart height

/* ═══════════════════ KLINE CHART ═══════════════════ */
export default function KlineChart({
  klines,
  showMA7,
  showMA25,
  showEMA = false,
  showBollinger = false,
  showVolume = true,
}: KlineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const size = useContainerSize(containerRef)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  /* ─── Zoom & Pan state ─── */
  const [visibleCount, setVisibleCount] = useState(120)
  const [panOffset, setPanOffset] = useState(0) // 0 = latest data at right edge
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartOffset = useRef(0)

  const width = size?.width ?? 0
  const height = size?.height ?? 0
  const chartW = width - PAD.left - PAD.right
  const volumeH = showVolume ? Math.floor((height - PAD.top - PAD.bottom) * VOLUME_RATIO) : 0
  const priceH = height - PAD.top - PAD.bottom - volumeH - (showVolume ? 8 : 0) // 8px gap

  /* ─── Compute visible range ─── */
  const visibleData = useMemo(() => {
    if (!klines || klines.length === 0) return null
    const total = klines.length
    const end = Math.max(0, total - panOffset)
    const start = Math.max(0, end - visibleCount)
    return { start, end: Math.min(end, total), slice: klines.slice(start, Math.min(end, total)) }
  }, [klines, visibleCount, panOffset])

  /* ─── All heavy computation memoized ─── */
  const chart = useMemo(() => {
    if (!size || !visibleData || visibleData.slice.length === 0 || chartW <= 0 || priceH <= 0)
      return null

    const data = visibleData.slice

    let minP = Infinity,
      maxP = -Infinity,
      maxVol = 0
    for (const k of data) {
      if (k.low < minP) minP = k.low
      if (k.high > maxP) maxP = k.high
      if (k.volume > maxVol) maxVol = k.volume
    }
    const pad = (maxP - minP) * 0.06 || maxP * 0.01
    const pMin = minP - pad
    const pMax = maxP + pad
    const pRange = pMax - pMin || 1

    const candleW = chartW / data.length
    const bodyW = Math.max(1, candleW * 0.55)
    const toY = (price: number): number => PAD.top + (1 - (price - pMin) / pRange) * priceH
    const volBase = PAD.top + priceH + 8 + volumeH // bottom of volume area
    const toVolY = (vol: number): number => volBase - (vol / (maxVol || 1)) * volumeH

    const pts = data.map((k, i) => ({
      ...k,
      i,
      globalI: visibleData.start + i,
      x: PAD.left + (i + 0.5) * candleW,
      oY: toY(k.open),
      cY: toY(k.close),
      hY: toY(k.high),
      lY: toY(k.low),
      volY: toVolY(k.volume),
      up: k.close >= k.open,
    }))

    const buildPath = (values: (number | null)[]): string => {
      let started = false
      return values.reduce((acc, v, i) => {
        if (v == null) return acc
        const x = PAD.left + (i + 0.5) * candleW
        const y = toY(v)
        acc += (started ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1)
        started = true
        return acc
      }, '')
    }

    // Moving averages (computed on full klines, then sliced for display)
    const fullMA7 = calcMA(klines!, 7)
    const fullMA25 = calcMA(klines!, 25)
    const sliceMA7 = fullMA7.slice(visibleData.start, visibleData.end)
    const sliceMA25 = fullMA25.slice(visibleData.start, visibleData.end)
    const ma7Path = buildPath(sliceMA7)
    const ma25Path = buildPath(sliceMA25)

    // EMA
    let ema12Path = '',
      ema26Path = ''
    if (showEMA) {
      const fullEMA12 = calcEMA(klines!, 12)
      const fullEMA26 = calcEMA(klines!, 26)
      const s12 = fullEMA12.slice(visibleData.start, visibleData.end)
      const s26 = fullEMA26.slice(visibleData.start, visibleData.end)
      ema12Path = buildPath(s12)
      ema26Path = buildPath(s26)
    }

    // Bollinger Bands
    let bollUpper = '',
      bollMiddle = '',
      bollLower = ''
    if (showBollinger) {
      const boll = calcBollinger(klines!, 20, 2)
      const su = boll.upper.slice(visibleData.start, visibleData.end)
      const sm = boll.middle.slice(visibleData.start, visibleData.end)
      const sl = boll.lower.slice(visibleData.start, visibleData.end)
      bollUpper = buildPath(su)
      bollMiddle = buildPath(sm)
      bollLower = buildPath(sl)
    }

    const gridLines: { y: number; price: number; edge: boolean }[] = []
    for (let i = 0; i <= 5; i++) {
      const p = pMin + (pRange * i) / 5
      gridLines.push({ y: toY(p), price: p, edge: i === 0 || i === 5 })
    }

    // Volume grid
    const volGrid: { y: number; vol: number }[] = [
      { y: toVolY(maxVol), vol: maxVol },
      { y: toVolY(maxVol / 2), vol: maxVol / 2 },
    ]

    const timeStep = Math.max(1, Math.floor(data.length / 6))
    const timeLabels = pts
      .filter((_, i) => i % timeStep === 0)
      .map((p) => ({
        x: p.x,
        label: `${pad2(new Date(p.time).getHours())}:${pad2(new Date(p.time).getMinutes())}`,
      }))

    const lastK = data[data.length - 1]
    const lastY = toY(lastK.close)
    const lastUp = lastK.close >= lastK.open

    return {
      pts,
      candleW,
      bodyW,
      ma7Path,
      ma25Path,
      ema12Path,
      ema26Path,
      bollUpper,
      bollMiddle,
      bollLower,
      gridLines,
      volGrid,
      timeLabels,
      lastK,
      lastY,
      lastUp,
      chartPriceH: priceH,
      volBase,
    }
  }, [size, visibleData, klines, chartW, priceH, volumeH, showEMA, showBollinger])

  /* ─── Zoom (mouse wheel) ─── */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!visibleData) return
      e.preventDefault()
      const delta = e.deltaY > 0 ? 10 : -10
      setVisibleCount((prev) => {
        const next = Math.max(MIN_VISIBLE, Math.min(MAX_VISIBLE, prev + delta))
        // Adjust pan to keep current view centered
        if (next > prev) {
          setPanOffset((p) => Math.max(0, p - (next - prev)))
        }
        return next
      })
    },
    [visibleData]
  )

  /* ─── Pan (mouse drag) ─── */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!chart) return
      isDragging.current = true
      dragStartX.current = e.clientX
      dragStartOffset.current = panOffset
    },
    [chart, panOffset]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!chart) return

      // Panning
      if (isDragging.current) {
        const dx = e.clientX - dragStartX.current
        const candlesMoved = Math.round(dx / chart.candleW)
        const maxPan = Math.max(0, (klines?.length ?? 0) - MIN_VISIBLE)
        setPanOffset(Math.max(0, Math.min(maxPan, dragStartOffset.current + candlesMoved)))
        return
      }

      // Crosshair hover
      const rect = e.currentTarget.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const idx = Math.max(
        0,
        Math.min(chart.pts.length - 1, Math.floor((mx - PAD.left) / chart.candleW))
      )
      setHoveredIdx(idx)
    },
    [chart, klines]
  )

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false
    setHoveredIdx(null)
  }, [])

  /* ─── Loading / empty state ─── */
  if (!chart) {
    return (
      <div ref={containerRef} style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.skeletonBar} />
        </div>
      </div>
    )
  }

  const {
    pts,
    bodyW,
    ma7Path,
    ma25Path,
    ema12Path,
    ema26Path,
    bollUpper,
    bollMiddle,
    bollLower,
    gridLines,
    volGrid,
    timeLabels,
    lastK,
    lastY,
    lastUp,
    chartPriceH: _priceH,
    volBase,
  } = chart
  const hd = hoveredIdx != null ? pts[hoveredIdx] : null

  return (
    <div
      ref={containerRef}
      style={{ ...styles.container, cursor: isDragging.current ? 'grabbing' : 'crosshair' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
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
        <rect x="0" y="0" width={width} height={height} fill="var(--color-surface)" />
        <rect x={PAD.left} y={PAD.top} width={chartW} height={priceH} fill="var(--color-chart-bg)" rx="4" />

        {/* Price grid lines */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={g.y}
              x2={PAD.left + chartW}
              y2={g.y}
              stroke={g.edge ? 'var(--color-border)' : 'var(--color-border-light)'}
              strokeWidth="1"
              strokeDasharray={g.edge ? 'none' : '3,3'}
            />
            <text
              x={PAD.left + chartW + 8}
              y={g.y + 4}
              fill="var(--color-text3)"
              fontSize="11"
              fontFamily="var(--font-mono)"
            >
              {fmtPrice(g.price)}
            </text>
          </g>
        ))}

        {/* Bollinger Bands */}
        {showBollinger && bollUpper && (
          <g opacity="0.4">
            <path d={bollUpper} fill="none" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="4,2" />
            <path d={bollMiddle} fill="none" stroke="var(--color-accent)" strokeWidth="1" />
            <path d={bollLower} fill="none" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="4,2" />
          </g>
        )}

        {/* EMA lines */}
        {showEMA && ema12Path && (
          <path d={ema12Path} fill="none" stroke="#FF9800" strokeWidth="1.2" opacity="0.8" />
        )}
        {showEMA && ema26Path && (
          <path d={ema26Path} fill="none" stroke="#E91E63" strokeWidth="1.2" opacity="0.8" />
        )}

        {/* MA lines */}
        {showMA25 && (
          <path
            d={ma25Path}
            fill="none"
            stroke="var(--color-ma25)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
        )}
        {showMA7 && (
          <path
            d={ma7Path}
            fill="none"
            stroke="var(--color-ma7)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
        )}

        {/* Candlesticks with neon glow */}
        <g filter="url(#neonGlow)">
          {pts.map((p) => (
            <g key={p.i}>
              <line
                x1={p.x}
                y1={p.hY}
                x2={p.x}
                y2={p.lY}
                stroke={p.up ? 'var(--color-up)' : 'var(--color-down)'}
                strokeWidth="1"
              />
              <rect
                x={p.x - bodyW / 2}
                y={Math.min(p.oY, p.cY)}
                width={bodyW}
                height={Math.max(Math.abs(p.cY - p.oY), 1)}
                fill={p.up ? 'var(--color-up)' : 'var(--color-down)'}
                rx={bodyW > 4 ? 1 : 0}
              />
            </g>
          ))}
        </g>

        {/* Current price dashed line */}
        <line
          x1={PAD.left}
          y1={lastY}
          x2={PAD.left + chartW}
          y2={lastY}
          stroke={lastUp ? 'var(--color-up)' : 'var(--color-down)'}
          strokeWidth="1"
          strokeDasharray="4,3"
          opacity="0.6"
        />
        <rect
          x={PAD.left + chartW + 2}
          y={lastY - 11}
          width="74"
          height="22"
          rx="4"
          fill={lastUp ? 'var(--color-up)' : 'var(--color-down)'}
        />
        <text
          x={PAD.left + chartW + 39}
          y={lastY + 4}
          fill="#FFF"
          fontSize="11"
          fontFamily="var(--font-mono)"
          textAnchor="middle"
          fontWeight="600"
        >
          {fmtPrice(lastK.close)}
        </text>

        {/* Volume sub-chart */}
        {showVolume && (
          <g>
            {/* Volume area background */}
            <rect
              x={PAD.left}
              y={PAD.top + priceH + 8}
              width={chartW}
              height={volumeH}
              fill="var(--color-chart-bg)"
              rx="2"
            />
            {/* Volume grid */}
            {volGrid.map((g, i) => (
              <text
                key={i}
                x={PAD.left + chartW + 8}
                y={g.y + 3}
                fill="var(--color-text3)"
                fontSize="9"
                fontFamily="var(--font-mono)"
                opacity="0.7"
              >
                {fmtVol(g.vol)}
              </text>
            ))}
            {/* Volume bars */}
            {pts.map((p) => (
              <rect
                key={p.i}
                x={p.x - bodyW / 2}
                y={p.volY}
                width={bodyW}
                height={Math.max(1, volBase - p.volY)}
                fill={p.up ? 'var(--color-up)' : 'var(--color-down)'}
                opacity="0.5"
                rx={bodyW > 4 ? 1 : 0}
              />
            ))}
          </g>
        )}

        {/* Time labels */}
        {timeLabels.map((t, i) => (
          <text
            key={i}
            x={t.x}
            y={height - 10}
            fill="var(--color-text3)"
            fontSize="10"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
          >
            {t.label}
          </text>
        ))}

        {/* Crosshair */}
        {hd && (
          <g>
            <line
              x1={hd.x}
              y1={PAD.top}
              x2={hd.x}
              y2={PAD.top + priceH}
              stroke="var(--color-cross)"
              strokeWidth="0.8"
              strokeDasharray="3,3"
            />
            <line
              x1={PAD.left}
              y1={hd.cY}
              x2={PAD.left + chartW}
              y2={hd.cY}
              stroke="var(--color-cross)"
              strokeWidth="0.8"
              strokeDasharray="3,3"
            />
            <rect
              x={PAD.left + chartW + 2}
              y={hd.cY - 10}
              width="74"
              height="20"
              rx="3"
              fill="var(--color-cross-bg)"
            />
            <text
              x={PAD.left + chartW + 39}
              y={hd.cY + 4}
              fill="#FFF"
              fontSize="10"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
            >
              {fmtPrice(hd.close)}
            </text>
            <rect
              x={hd.x - 32}
              y={height - 28}
              width="64"
              height="18"
              rx="3"
              fill="var(--color-cross-bg)"
            />
            <text
              x={hd.x}
              y={height - 15}
              fill="#FFF"
              fontSize="9"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
            >
              {pad2(new Date(hd.time).getHours())}:{pad2(new Date(hd.time).getMinutes())}
            </text>
          </g>
        )}
      </svg>

      {/* OHLCV tooltip */}
      {hd && (
        <div style={styles.ohlcv}>
          <span>
            O <b style={{ color: hd.up ? 'var(--color-up)' : 'var(--color-down)' }}>{fmtPrice(hd.open)}</b>
          </span>
          <span>
            H <b style={{ color: hd.up ? 'var(--color-up)' : 'var(--color-down)' }}>{fmtPrice(hd.high)}</b>
          </span>
          <span>
            L <b style={{ color: hd.up ? 'var(--color-up)' : 'var(--color-down)' }}>{fmtPrice(hd.low)}</b>
          </span>
          <span>
            C <b style={{ color: hd.up ? 'var(--color-up)' : 'var(--color-down)' }}>{fmtPrice(hd.close)}</b>
          </span>
          <span>
            Vol <b style={{ color: 'var(--color-text1)' }}>{fmtVol(hd.volume)}</b>
          </span>
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
    position: 'relative' as const,
    cursor: 'crosshair',
    overflow: 'hidden',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--color-text3)',
    fontFamily: 'var(--font-sans)',
    fontSize: 14,
  },
  skeletonBar: {
    width: '60%',
    height: 8,
    borderRadius: 4,
    background: 'var(--color-border)',
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  },
  ohlcv: {
    position: 'absolute' as const,
    top: 6,
    left: 22,
    display: 'flex',
    gap: 10,
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-text2)',
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
    background: 'var(--color-tooltip-bg)',
    padding: '3px 10px',
    borderRadius: 4,
  },
}
