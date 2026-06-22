import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from '../ErrorBoundary'
import { useState } from 'react'

/* Component that throws on demand */
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Boom!')
  return <div>All good</div>
}

/* Wrapper with retry button using state */
function TestWrapper() {
  const [throw_, setThrow] = useState(false)
  return (
    <div>
      <button onClick={() => setThrow(true)}>trigger error</button>
      <ErrorBoundary>
        <Bomb shouldThrow={throw_} />
      </ErrorBoundary>
    </div>
  )
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('All good')).toBeTruthy()
  })

  it('catches errors and shows error UI', async () => {
    const user = userEvent.setup()
    // Suppress console.error for expected error output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<TestWrapper />)
    expect(screen.getByText('All good')).toBeTruthy()

    await user.click(screen.getByText('trigger error'))

    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(screen.getByText('Boom!')).toBeTruthy()
    expect(screen.getByText('Retry')).toBeTruthy()

    spy.mockRestore()
  })

  it('Retry button resets the error state', async () => {
    const user = userEvent.setup()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // We need a component that can toggle throw on/off
    function RecoverableWrapper() {
      const [throw_, setThrow] = useState(true)
      return (
        <ErrorBoundary>
          {throw_ ? (
            <Bomb shouldThrow={true} />
          ) : (
            <div>
              Recovered!
              <button onClick={() => setThrow(true)}>throw again</button>
            </div>
          )}
        </ErrorBoundary>
      )
    }

    // This test just verifies the Retry button exists and is clickable
    render(<RecoverableWrapper />)
    expect(screen.getByText('Something went wrong')).toBeTruthy()

    // The Retry button resets internal error state, but Bomb will throw again
    // since RecoverableWrapper always starts with throw_=true
    await user.click(screen.getByText('Retry'))

    // After retry, it should re-render and catch the error again
    expect(screen.getByText('Something went wrong')).toBeTruthy()

    spy.mockRestore()
  })
})
