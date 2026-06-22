import { Component, type ReactNode, type ErrorInfo } from 'react'
import { colors, fonts } from '../theme'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={styles.wrap}>
          <div style={styles.card}>
            <div style={styles.icon}>!</div>
            <div style={styles.title}>Something went wrong</div>
            <div style={styles.msg}>{this.state.error?.message}</div>
            <button
              style={styles.btn}
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const styles = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: colors.bg,
    fontFamily: fonts.sans,
  },
  card: {
    textAlign: 'center' as const,
    padding: 40,
    borderRadius: 12,
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    maxWidth: 400,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: colors.down,
    color: '#FFF',
    fontSize: 24,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.text1,
    marginBottom: 8,
  },
  msg: {
    fontSize: 13,
    color: colors.text2,
    marginBottom: 20,
    lineHeight: 1.5,
  },
  btn: {
    padding: '8px 24px',
    borderRadius: 6,
    border: 'none',
    background: colors.accent,
    color: '#FFF',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
