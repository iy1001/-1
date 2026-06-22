import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CoinHeader from '../CoinHeader'
import type { Coin, Kline } from '../../types'

const mockCoin: Coin = { symbol: 'BTCUSDT', base: 'BTC', name: 'Bitcoin', icon: '₿' }

const mockKlines: Kline[] = Array.from({ length: 24 }, (_, i) => ({
  time: Date.now() - (24 - i) * 3_600_000,
  open: 64000 + i * 50,
  high: 64200 + i * 50,
  low: 63800 + i * 50,
  close: 64100 + i * 50,
  volume: 1000 + i * 100,
}))

describe('CoinHeader', () => {
  it('renders coin name and pair', () => {
    render(
      <CoinHeader
        coin={mockCoin}
        klines={mockKlines}
        interval="1h"
        onChangeInterval={vi.fn()}
        showMA7={true}
        onToggleMA7={vi.fn()}
        showMA25={true}
        onToggleMA25={vi.fn()}
      />
    )
    expect(screen.getByText('BTC')).toBeTruthy()
    expect(screen.getByText('/ USDT')).toBeTruthy()
    expect(screen.getByText('Bitcoin')).toBeTruthy()
  })

  it('renders all interval buttons', () => {
    render(
      <CoinHeader
        coin={mockCoin}
        klines={mockKlines}
        interval="1h"
        onChangeInterval={vi.fn()}
        showMA7={true}
        onToggleMA7={vi.fn()}
        showMA25={true}
        onToggleMA25={vi.fn()}
      />
    )
    expect(screen.getByText('1m')).toBeTruthy()
    expect(screen.getByText('5m')).toBeTruthy()
    expect(screen.getByText('15m')).toBeTruthy()
    expect(screen.getByText('30m')).toBeTruthy()
    expect(screen.getByText('1h')).toBeTruthy()
    expect(screen.getByText('4h')).toBeTruthy()
    expect(screen.getByText('1D')).toBeTruthy()
    expect(screen.getByText('1W')).toBeTruthy()
  })

  it('calls onChangeInterval when interval button is clicked', async () => {
    const user = userEvent.setup()
    const onChangeInterval = vi.fn()
    render(
      <CoinHeader
        coin={mockCoin}
        klines={mockKlines}
        interval="1h"
        onChangeInterval={onChangeInterval}
        showMA7={true}
        onToggleMA7={vi.fn()}
        showMA25={true}
        onToggleMA25={vi.fn()}
      />
    )
    await user.click(screen.getByText('4h'))
    expect(onChangeInterval).toHaveBeenCalledWith('4h')
  })

  it('renders MA toggle buttons', () => {
    render(
      <CoinHeader
        coin={mockCoin}
        klines={mockKlines}
        interval="1h"
        onChangeInterval={vi.fn()}
        showMA7={true}
        onToggleMA7={vi.fn()}
        showMA25={false}
        onToggleMA25={vi.fn()}
      />
    )
    expect(screen.getByText('MA7')).toBeTruthy()
    expect(screen.getByText('MA25')).toBeTruthy()
  })

  it('calls toggle callbacks when MA buttons are clicked', async () => {
    const user = userEvent.setup()
    const onToggleMA7 = vi.fn()
    const onToggleMA25 = vi.fn()
    render(
      <CoinHeader
        coin={mockCoin}
        klines={mockKlines}
        interval="1h"
        onChangeInterval={vi.fn()}
        showMA7={true}
        onToggleMA7={onToggleMA7}
        showMA25={true}
        onToggleMA25={onToggleMA25}
      />
    )
    await user.click(screen.getByText('MA7'))
    expect(onToggleMA7).toHaveBeenCalled()
    await user.click(screen.getByText('MA25'))
    expect(onToggleMA25).toHaveBeenCalled()
  })

  it('displays 24h stats', () => {
    render(
      <CoinHeader
        coin={mockCoin}
        klines={mockKlines}
        interval="1h"
        onChangeInterval={vi.fn()}
        showMA7={true}
        onToggleMA7={vi.fn()}
        showMA25={true}
        onToggleMA25={vi.fn()}
      />
    )
    expect(screen.getByText('24h H')).toBeTruthy()
    expect(screen.getByText('24h L')).toBeTruthy()
    expect(screen.getByText('24h Vol')).toBeTruthy()
  })

  it('renders without klines (null)', () => {
    render(
      <CoinHeader
        coin={mockCoin}
        klines={null}
        interval="1h"
        onChangeInterval={vi.fn()}
        showMA7={true}
        onToggleMA7={vi.fn()}
        showMA25={true}
        onToggleMA25={vi.fn()}
      />
    )
    expect(screen.getByText('BTC')).toBeTruthy()
  })
})
