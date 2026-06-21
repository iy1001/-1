import { describe, it, expect } from 'vitest'
import { fmtPrice, fmtVol, pad2, rand, calcMA } from '../helpers'

describe('fmtPrice', () => {
  it('formats large prices (>=1000) with locale and 2 decimals', () => {
    const result = fmtPrice(67890.123)
    expect(result).toContain('67,890')
    expect(result).toContain('.12')
  })

  it('formats mid-range prices (>=1) with 4 decimals', () => {
    expect(fmtPrice(1.23456)).toBe('1.2346')
    expect(fmtPrice(100)).toBe('100.0000')
  })

  it('formats small prices (<1) with 6 decimals', () => {
    expect(fmtPrice(0.123456789)).toBe('0.123457')
    expect(fmtPrice(0.001)).toBe('0.001000')
  })

  it('returns em-dash for null, undefined, and NaN', () => {
    expect(fmtPrice(null)).toBe('—')
    expect(fmtPrice(undefined)).toBe('—')
    expect(fmtPrice(NaN)).toBe('—')
  })
})

describe('fmtVol', () => {
  it('formats billions with B suffix', () => {
    expect(fmtVol(1.5e9)).toBe('1.5B')
    expect(fmtVol(2e9)).toBe('2.0B')
  })

  it('formats millions with M suffix', () => {
    expect(fmtVol(3.7e6)).toBe('3.7M')
  })

  it('formats thousands with K suffix', () => {
    expect(fmtVol(1500)).toBe('1.5K')
  })

  it('formats small volumes as integers', () => {
    expect(fmtVol(42)).toBe('42')
  })
})

describe('pad2', () => {
  it('pads single-digit numbers', () => {
    expect(pad2(0)).toBe('00')
    expect(pad2(5)).toBe('05')
  })

  it('leaves two-digit numbers unchanged', () => {
    expect(pad2(12)).toBe('12')
    expect(pad2(59)).toBe('59')
  })

  it('handles string input', () => {
    expect(pad2('3')).toBe('03')
    expect(pad2('42')).toBe('42')
  })
})

describe('rand', () => {
  it('returns values between 0 and 1', () => {
    for (let i = 0; i < 100; i++) {
      const r = rand(i)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThan(1)
    }
  })

  it('is deterministic — same seed produces same result', () => {
    expect(rand(42)).toBe(rand(42))
    expect(rand(0)).toBe(rand(0))
    expect(rand(999)).toBe(rand(999))
  })

  it('different seeds produce different results', () => {
    const r1 = rand(1)
    const r2 = rand(2)
    const r3 = rand(3)
    // At least two of these should differ
    expect(r1 === r2 && r2 === r3).toBe(false)
  })
})

describe('calcMA', () => {
  const makeData = (closes) =>
    closes.map((c, i) => ({ time: i, open: c, high: c, low: c, close: c, volume: 1 }))

  it('returns null for indices before the period window', () => {
    const data = makeData([10, 20, 30, 40, 50])
    const result = calcMA(data, 3)
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
    expect(result[2]).not.toBeNull()
  })

  it('correctly calculates SMA', () => {
    const data = makeData([10, 20, 30])
    const result = calcMA(data, 3)
    expect(result[2]).toBe(20) // (10+20+30)/3
  })

  it('returns correct rolling average', () => {
    const data = makeData([10, 20, 30, 40, 50])
    const result = calcMA(data, 3)
    expect(result[2]).toBe(20) // (10+20+30)/3
    expect(result[3]).toBe(30) // (20+30+40)/3
    expect(result[4]).toBe(40) // (30+40+50)/3
  })

  it('handles period=1 (returns close prices)', () => {
    const data = makeData([5, 10, 15])
    const result = calcMA(data, 1)
    expect(result).toEqual([5, 10, 15])
  })

  it('handles empty array', () => {
    expect(calcMA([], 3)).toEqual([])
  })
})
