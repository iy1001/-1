import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { fmtPrice, fmtVol, pad2, calcMA } from '../utils/helpers'
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
}

/* ═══════════════════ CONSTANTS ═══════════════════ */
const PAD = { top: 28, right: 82, bottom: 38, left: 14 }

/* ═══════════════════ KLINE CHART ═══════════════════ */
export default function KlineChart({ klines, showMA7, showMA25 }: KlineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const size = useContainerSize(containerRef)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const width = size?.width ?? 0
  const height = size?.height ?? 0
  const chartW = width - PAD.left - PAD.right
  const chartH = height - PAD.top - PAD.bottom

  /* ─── All heavy computation memoized ─── */
  const chart = useMemo(() => {
    if (!size || !klines || klines.length === 0 || chartW <= 0 || chartH <= 0) return null

    let minP = Infinity,
      maxP = -Infinity
    for (const k of klines) {
      if (k.low < minP) minP = k.low
      if (k.high > maxP) maxP = k.high
    }
    const pad = (maxP - minP) * 0.06 || maxP * 0.01
    const pMin = minP - pad
    const pMax = maxP + pad
    const pRange = pMax - pMin || 1

    const candleW = chartW / klines.length
    const bodyW = Math.max(1, candleW * 0.55)
    const toY = (price: number): number => PAD.top + (1 - (price - pMin) / pRange) * chartH

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

    const buildMAPath = (values: (number | null)[]): string => {
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

    const ma7Path = buildMAPath(calcMA(klines, 7))
    const ma25Path = buildMAPath(calcMA(klines, 25))

    const gridLines: { y: number; price: number; edge: boolean }[] = []
    for (let i = 0; i <= 5; i++) {
      const p = pMin + (pRange * i) / 5
      gridLines.push({ y: toY(p), price: p, edge: i === 0 || i === 5 })
    }

    const timeStep = Math.max(1, Math.floor(klines.length / 6))
    const timeLabels = pts
      .filter((_, i) => i % timeStep === 0)
      .map((p) => ({
        x: p.x,
        label: `${pad2(new Date(p.time).getHours())}:${pad2(new Date(p.time).getMinutes())}`,
      }))

    const lastK = klines[klines.length - 1]
    const lastY = toY(lastK.close)
    const lastUp = lastK.close >= lastK.open

    return { pts, candleW, bodyW, ma7Path, ma25Path, gridLines, timeLabels, lastK, lastY, lastUp }
  }, [size, klines, chartW, chartH])

  /* Mouse handling — useCallback avoids re-creating on every render */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!chart) return
      const rect = e.currentTarget.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const idx = Math.max(
        0,
        Math.min(chart.pts.length - 1, Math.floor((mx - PAD.left) / chart.candleW))
      )
      setHoveredIdx(idx)
    },
    [chart]
  )

  const handleMouseLeave = useCallback(() => setHoveredIdx(null), [])

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

  const { pts, bodyW, ma7Path, ma25Path, gridLines, timeLabels, lastK, lastY, lastUp } = chart
  const hd = hoveredIdx != null ? pts[hoveredIdx] : null

  return (
    <div
      ref={containerRef}
      style={styles.container}
      onMouseMove={handleMouseMove}
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
        <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} fill="var(--color-chart-bg)" rx="4" />

        {/* Grid lines */}
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

        {/* MA lines (25 first, then 7 on top) */}
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

        {/* Crosshair */}
        {hd && (
          <g>
            <line
              x1={hd.x}
              y1={PAD.top}
              x2={hd.x}
              y2={PAD.top + chartH}
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
