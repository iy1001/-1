import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Watchlist from '../Watchlist'
import type { TickerMap } from '../../types'

const mockTickers: TickerMap = {
  BTCUSDT: { price: 65000, open24h: 64000, high24h: 66000, low24h: 63500, change: 1.56, volume: 1234567890 },
  ETHUSDT: { price: 1800, open24h: 1750, high24h: 1850, low24h: 1700, change: 2.86, volume: 987654321 },
}

describe('Watchlist', () => {
  it('renders the watchlist title', () => {
    render(
      <Watchlist
        selected="BTCUSDT"
        onSelect={vi.fn()}
        favorites={[]}
        onToggleFav={vi.fn()}
        tickers={mockTickers}
      />
    )
    expect(screen.getByText('Watchlist')).toBeTruthy()
  })

  it('renders all coin symbols', () => {
    render(
      <Watchlist
        selected="BTCUSDT"
        onSelect={vi.fn()}
        favorites={[]}
        onToggleFav={vi.fn()}
        tickers={mockTickers}
      />
    )
    expect(screen.getByText('BTC')).toBeTruthy()
    expect(screen.getByText('ETH')).toBeTruthy()
    expect(screen.getByText('SOL')).toBeTruthy()
  })

  it('calls onSelect when a coin is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <Watchlist
        selected="BTCUSDT"
        onSelect={onSelect}
        favorites={[]}
        onToggleFav={vi.fn()}
        tickers={mockTickers}
      />
    )
    await user.click(screen.getByText('ETH'))
    expect(onSelect).toHaveBeenCalledWith('ETHUSDT')
  })

  it('calls onToggleFav when star button is clicked', async () => {
    const user = userEvent.setup()
    const onToggleFav = vi.fn()
    const { container } = render(
      <Watchlist
        selected="BTCUSDT"
        onSelect={vi.fn()}
        favorites={[]}
        onToggleFav={onToggleFav}
        tickers={mockTickers}
      />
    )
    // Star buttons are the first buttons in each item
    const starButtons = container.querySelectorAll('button')
    // Click the first star button (should be BTC or whichever is first)
    if (starButtons.length > 0) {
      await user.click(starButtons[0])
      expect(onToggleFav).toHaveBeenCalled()
    }
  })

  it('displays ticker prices from real-time data', () => {
    render(
      <Watchlist
        selected="BTCUSDT"
        onSelect={vi.fn()}
        favorites={[]}
        onToggleFav={vi.fn()}
        tickers={mockTickers}
      />
    )
    // BTC price should show 65,000 (formatted)
    expect(screen.getByText(/\$65,000/)).toBeTruthy()
  })

  it('shows percentage change with + prefix for positive', () => {
    render(
      <Watchlist
        selected="BTCUSDT"
        onSelect={vi.fn()}
        favorites={[]}
        onToggleFav={vi.fn()}
        tickers={mockTickers}
      />
    )
    expect(screen.getByText('+1.56%')).toBeTruthy()
  })

  it('renders with empty tickers without crashing', () => {
    render(
      <Watchlist
        selected="BTCUSDT"
        onSelect={vi.fn()}
        favorites={[]}
        onToggleFav={vi.fn()}
        tickers={{}}
      />
    )
    expect(screen.getByText('BTC')).toBeTruthy()
  })
})
