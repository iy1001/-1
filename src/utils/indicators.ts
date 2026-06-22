import type { Kline } from '../types'

/**
 * Exponential Moving Average.
 * Returns array same length as input, with null for indices before the period.
 */
export function calcEMA(data: Kline[], period: number): (number | null)[] {
  if (data.length === 0) return []
  const closes = data.map((d) => d.close)
  const result: (number | null)[] = []
  const k = 2 / (period + 1)

  // First EMA value is SMA of first `period` values
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sum += closes[i]
      result.push(null)
    } else if (i === period - 1) {
      sum += closes[i]
      result.push(sum / period)
    } else {
      const ema = closes[i] * k + (result[i - 1] as number) * (1 - k)
      result.push(ema)
    }
  }
  return result
}

/**
 * Relative Strength Index (RSI).
 * Uses Wilder's smoothing method. Returns null for indices before the period.
 */
export function calcRSI(data: Kline[], period: number = 14): (number | null)[] {
  if (data.length < period + 1) return data.map(() => null)

  const result: (number | null)[] = []
  const deltas: number[] = []

  for (let i = 1; i < data.length; i++) {
    deltas.push(data[i].close - data[i - 1].close)
  }

  let avgGain = 0
  let avgLoss = 0

  // First period: simple average
  for (let i = 0; i < period; i++) {
    const d = deltas[i]
    if (d > 0) avgGain += d
    else avgLoss += Math.abs(d)
    result.push(null)
  }
  avgGain /= period
  avgLoss /= period

  // RSI for the period-th index
  const rs0 = avgLoss === 0 ? Infinity : avgGain / avgLoss
  result.push(100 - 100 / (1 + rs0))

  // Subsequent values: Wilder's smoothing
  for (let i = period; i < deltas.length; i++) {
    const d = deltas[i]
    const gain = d > 0 ? d : 0
    const loss = d < 0 ? Math.abs(d) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }

  return result
}

/**
 * MACD (Moving Average Convergence Divergence).
 * Returns { macd, signal, histogram } arrays.
 * macd = EMA(fast) - EMA(slow), signal = EMA(macd, signalPeriod), histogram = macd - signal
 */
export function calcMACD(
  data: Kline[],
  fast: number = 12,
  slow: number = 26,
  signalPeriod: number = 9
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const emaFast = calcEMA(data, fast)
  const emaSlow = calcEMA(data, slow)

  // MACD line = fast EMA - slow EMA
  const macd: (number | null)[] = emaFast.map((f, i) => {
    const s = emaSlow[i]
    if (f == null || s == null) return null
    return f - s
  })

  // Signal line = EMA of MACD values (only where MACD is non-null)
  const k = 2 / (signalPeriod + 1)
  const signal: (number | null)[] = []
  let prevSignal: number | null = null
  let count = 0
  let sum = 0

  for (let i = 0; i < macd.length; i++) {
    const m = macd[i]
    if (m == null) {
      signal.push(null)
      continue
    }
    count++
    if (count < signalPeriod) {
      sum += m
      signal.push(null)
    } else if (count === signalPeriod) {
      sum += m
      prevSignal = sum / signalPeriod
      signal.push(prevSignal)
    } else {
      prevSignal = m * k + (prevSignal as number) * (1 - k)
      signal.push(prevSignal)
    }
  }

  // Histogram = MACD - Signal
  const histogram: (number | null)[] = macd.map((m, i) => {
    const s = signal[i]
    if (m == null || s == null) return null
    return m - s
  })

  return { macd, signal, histogram }
}

/**
 * Bollinger Bands (SMA ± k * stddev).
 * Returns { middle, upper, lower } arrays.
 */
export function calcBollinger(
  data: Kline[],
  period: number = 20,
  multiplier: number = 2
): { middle: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const closes = data.map((d) => d.close)
  const middle: (number | null)[] = []
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      middle.push(null)
      upper.push(null)
      lower.push(null)
      continue
    }

    let sum = 0
    for (let j = i - period + 1; j <= i; j++) {
      sum += closes[j]
    }
    const sma = sum / period

    let variance = 0
    for (let j = i - period + 1; j <= i; j++) {
      variance += (closes[j] - sma) ** 2
    }
    const stddev = Math.sqrt(variance / period)

    middle.push(sma)
    upper.push(sma + multiplier * stddev)
    lower.push(sma - multiplier * stddev)
  }

  return { middle, upper, lower }
}
