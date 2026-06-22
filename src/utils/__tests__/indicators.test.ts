import { describe, it, expect } from 'vitest'
import { calcEMA, calcRSI, calcMACD, calcBollinger } from '../indicators'
import type { Kline } from '../../types'

/* ═══════════════════ HELPERS ═══════════════════ */
function makeData(closes: number[]): Kline[] {
  return closes.map((c, i) => ({
    time: i * 60_000,
    open: c,
    high: c + 1,
    low: c - 1,
    close: c,
    volume: 100,
  }))
}

/* ═══════════════════ EMA ═══════════════════ */
describe('calcEMA', () => {
  it('returns empty array for empty input', () => {
    expect(calcEMA([], 5)).toEqual([])
  })

  it('returns null for indices before the period window', () => {
    const data = makeData([10, 20, 30, 40, 50])
    const result = calcEMA(data, 3)
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
    expect(result[2]).not.toBeNull()
  })

  it('first EMA value equals SMA of first `period` values', () => {
    const data = makeData([10, 20, 30])
    const result = calcEMA(data, 3)
    expect(result[2]).toBeCloseTo(20) // (10+20+30)/3
  })

  it('subsequent values use exponential smoothing', () => {
    const data = makeData([10, 20, 30, 40, 50])
    const result = calcEMA(data, 3)
    // k = 2 / (3+1) = 0.5
    // EMA[3] = 40 * 0.5 + 20 * 0.5 = 30
    expect(result[3]).toBeCloseTo(30)
    // EMA[4] = 50 * 0.5 + 30 * 0.5 = 40
    expect(result[4]).toBeCloseTo(40)
  })

  it('output length matches input length', () => {
    const data = makeData([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const result = calcEMA(data, 5)
    expect(result).toHaveLength(10)
  })

  it('period=1 returns close prices directly', () => {
    const data = makeData([5, 10, 15])
    const result = calcEMA(data, 1)
    expect(result[0]).toBeCloseTo(5)
    expect(result[1]).toBeCloseTo(10)
    expect(result[2]).toBeCloseTo(15)
  })
})

/* ═══════════════════ RSI ═══════════════════ */
describe('calcRSI', () => {
  it('returns all nulls when data is too short', () => {
    const data = makeData([100, 101, 102])
    const result = calcRSI(data, 14)
    expect(result.every((v) => v === null)).toBe(true)
  })

  it('produces values between 0 and 100', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 5)
    const data = makeData(closes)
    const result = calcRSI(data, 14)
    for (const v of result) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
    }
  })

  it('returns 100 when all moves are up', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i * 2)
    const data = makeData(closes)
    const result = calcRSI(data, 14)
    // After period, all moves are up → avgLoss = 0 → RSI = 100
    const last = result[result.length - 1]
    expect(last).toBe(100)
  })

  it('returns 0 when all moves are down', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 - i * 2)
    const data = makeData(closes)
    const result = calcRSI(data, 14)
    const last = result[result.length - 1]
    expect(last).toBeCloseTo(0, 1)
  })

  it('output length matches input length', () => {
    const data = makeData(Array.from({ length: 30 }, (_, i) => 100 + i))
    const result = calcRSI(data, 14)
    expect(result).toHaveLength(30)
  })

  it('uses default period of 14', () => {
    const data = makeData(Array.from({ length: 20 }, (_, i) => 100 + i))
    const result = calcRSI(data)
    // First 14 should be null (index 0 has no delta + 13 more before period)
    expect(result.slice(0, 14).every((v) => v === null)).toBe(true)
    expect(result[14]).not.toBeNull()
  })
})

/* ═══════════════════ MACD ═══════════════════ */
describe('calcMACD', () => {
  it('returns empty arrays for empty input', () => {
    const result = calcMACD([])
    expect(result.macd).toEqual([])
    expect(result.signal).toEqual([])
    expect(result.histogram).toEqual([])
  })

  it('MACD line is null before the slow period', () => {
    const data = makeData(Array.from({ length: 30 }, (_, i) => 100 + i))
    const result = calcMACD(data, 12, 26, 9)
    // MACD requires both fast and slow EMAs; slow EMA starts at index 25
    expect(result.macd.slice(0, 25).every((v) => v === null)).toBe(true)
    expect(result.macd[25]).not.toBeNull()
  })

  it('signal line starts after enough MACD values', () => {
    const data = makeData(Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 10))
    const result = calcMACD(data, 12, 26, 9)
    // Signal requires 9 non-null MACD values
    const firstNonNullSignal = result.signal.findIndex((v) => v !== null)
    expect(firstNonNullSignal).toBeGreaterThan(25)
  })

  it('histogram = MACD - signal', () => {
    const data = makeData(Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 10))
    const { macd, signal, histogram } = calcMACD(data, 12, 26, 9)
    for (let i = 0; i < macd.length; i++) {
      if (macd[i] !== null && signal[i] !== null) {
        expect(histogram[i]).toBeCloseTo((macd[i] as number) - (signal[i] as number))
      } else {
        expect(histogram[i]).toBeNull()
      }
    }
  })

  it('output arrays match input length', () => {
    const data = makeData(Array.from({ length: 40 }, (_, i) => 100 + i))
    const { macd, signal, histogram } = calcMACD(data, 12, 26, 9)
    expect(macd).toHaveLength(40)
    expect(signal).toHaveLength(40)
    expect(histogram).toHaveLength(40)
  })

  it('uses default parameters (12, 26, 9)', () => {
    const data = makeData(Array.from({ length: 50 }, (_, i) => 100 + i))
    const result = calcMACD(data)
    expect(result.macd).toHaveLength(50)
    expect(result.signal).toHaveLength(50)
  })
})

/* ═══════════════════ BOLLINGER BANDS ═══════════════════ */
describe('calcBollinger', () => {
  it('returns nulls for indices before the period', () => {
    const data = makeData([10, 20, 30, 40, 50])
    const result = calcBollinger(data, 3, 2)
    expect(result.middle[0]).toBeNull()
    expect(result.upper[0]).toBeNull()
    expect(result.lower[0]).toBeNull()
    expect(result.middle[1]).toBeNull()
    expect(result.middle[2]).not.toBeNull()
  })

  it('middle line equals SMA', () => {
    const data = makeData([10, 20, 30, 40, 50])
    const result = calcBollinger(data, 3, 2)
    expect(result.middle[2]).toBeCloseTo(20) // (10+20+30)/3
    expect(result.middle[3]).toBeCloseTo(30) // (20+30+40)/3
    expect(result.middle[4]).toBeCloseTo(40) // (30+40+50)/3
  })

  it('upper > middle > lower', () => {
    const data = makeData([10, 15, 20, 18, 22, 25, 20, 18, 24, 28])
    const result = calcBollinger(data, 5, 2)
    for (let i = 4; i < data.length; i++) {
      expect(result.upper[i]).toBeGreaterThan(result.middle[i] as number)
      expect(result.middle[i]).toBeGreaterThan(result.lower[i] as number)
    }
  })

  it('bands are symmetric around middle', () => {
    const data = makeData([10, 15, 20, 18, 22, 25, 20, 18, 24, 28])
    const result = calcBollinger(data, 5, 2)
    for (let i = 4; i < data.length; i++) {
      const upperDiff = (result.upper[i] as number) - (result.middle[i] as number)
      const lowerDiff = (result.middle[i] as number) - (result.lower[i] as number)
      expect(upperDiff).toBeCloseTo(lowerDiff, 10)
    }
  })

  it('constant prices → bands collapse to single line', () => {
    const data = makeData(Array.from({ length: 10 }, () => 100))
    const result = calcBollinger(data, 5, 2)
    for (let i = 4; i < data.length; i++) {
      expect(result.middle[i]).toBeCloseTo(100)
      expect(result.upper[i]).toBeCloseTo(100)
      expect(result.lower[i]).toBeCloseTo(100)
    }
  })

  it('output length matches input length', () => {
    const data = makeData(Array.from({ length: 30 }, (_, i) => 100 + i))
    const result = calcBollinger(data, 20, 2)
    expect(result.middle).toHaveLength(30)
    expect(result.upper).toHaveLength(30)
    expect(result.lower).toHaveLength(30)
  })

  it('uses default parameters (20, 2)', () => {
    const data = makeData(Array.from({ length: 25 }, (_, i) => 100 + i))
    const result = calcBollinger(data)
    expect(result.middle.slice(0, 19).every((v) => v === null)).toBe(true)
    expect(result.middle[19]).not.toBeNull()
  })
})
