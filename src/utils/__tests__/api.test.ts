import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateKlines, loadKlines, fetchKlines } from '../api'
import type { Kline } from '../../types'

/* ═══════════════════ generateKlines ═══════════════════ */
describe('generateKlines', () => {
  it('returns the requested number of candles', () => {
    const result = generateKlines('BTCUSDT', '1h', 50)
    expect(result).toHaveLength(50)
  })

  it('defaults to 120 candles', () => {
    const result = generateKlines('BTCUSDT', '1h')
    expect(result).toHaveLength(120)
  })

  it('each candle has required Kline fields', () => {
    const result = generateKlines('ETHUSDT', '15m', 10)
    for (const k of result) {
      expect(k).toHaveProperty('time')
      expect(k).toHaveProperty('open')
      expect(k).toHaveProperty('high')
      expect(k).toHaveProperty('low')
      expect(k).toHaveProperty('close')
      expect(k).toHaveProperty('volume')
    }
  })

  it('candles are in chronological order', () => {
    const result = generateKlines('BTCUSDT', '1h', 50)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].time).toBeGreaterThan(result[i - 1].time)
    }
  })

  it('high >= max(open, close) and low <= min(open, close)', () => {
    const result = generateKlines('BTCUSDT', '1h', 50)
    for (const k of result) {
      expect(k.high).toBeGreaterThanOrEqual(Math.max(k.open, k.close))
      expect(k.low).toBeLessThanOrEqual(Math.min(k.open, k.close))
    }
  })

  it('volume is positive', () => {
    const result = generateKlines('BTCUSDT', '1h', 50)
    for (const k of result) {
      expect(k.volume).toBeGreaterThan(0)
    }
  })

  it('is deterministic — same inputs produce same output', () => {
    const a = generateKlines('BTCUSDT', '1h', 20)
    const b = generateKlines('BTCUSDT', '1h', 20)
    expect(a).toEqual(b)
  })

  it('different symbols produce different data', () => {
    const btc = generateKlines('BTCUSDT', '1h', 20)
    const eth = generateKlines('ETHUSDT', '1h', 20)
    expect(btc[0].close).not.toBe(eth[0].close)
  })

  it('different intervals produce different data', () => {
    const m1 = generateKlines('BTCUSDT', '1m', 20)
    const h1 = generateKlines('BTCUSDT', '1h', 20)
    // Time spacing should differ
    const m1Spacing = m1[1].time - m1[0].time
    const h1Spacing = h1[1].time - h1[0].time
    expect(m1Spacing).not.toBe(h1Spacing)
  })

  it('chaining: each candle open equals previous candle close', () => {
    const result = generateKlines('BTCUSDT', '1h', 20)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].open).toBeCloseTo(result[i - 1].close, 10)
    }
  })
})

/* ═══════════════════ loadKlines (with mocked fetch) ═══════════════════ */
describe('loadKlines', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns API data when fetch succeeds', async () => {
    const mockData: Kline[] = [
      { time: 1, open: 100, high: 110, low: 95, close: 105, volume: 1000 },
    ]
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response)

    const result = await loadKlines('BTCUSDT', '1h', 10)
    expect(result.isMock).toBe(false)
    expect(result.data).toEqual(mockData)
  })

  it('falls back to mock data when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    const result = await loadKlines('BTCUSDT', '1h', 10)
    expect(result.isMock).toBe(true)
    expect(result.data).toHaveLength(10)
  })

  it('falls back to mock data when API returns non-OK status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 502,
    } as Response)

    const result = await loadKlines('BTCUSDT', '1h', 20)
    expect(result.isMock).toBe(true)
    expect(result.data).toHaveLength(20)
  })
})

/* ═══════════════════ fetchKlines (input validation) ═══════════════════ */
describe('fetchKlines', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('constructs correct API URL with symbol conversion', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response)

    await fetchKlines('BTCUSDT', '1h', 50)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/klines?symbol=BTC/USDT&interval=1h&limit=50'),
      expect.any(Object)
    )
  })

  it('throws on non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 451,
    } as Response)

    await expect(fetchKlines('BTCUSDT', '1h')).rejects.toThrow('API error 451')
  })
})
