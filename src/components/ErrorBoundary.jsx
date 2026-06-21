import { Component } from 'react'
import { colors, fonts } from '../theme'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.icon}>!</div>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.message}>{this.state.error?.message || 'Unknown error'}</p>
            <button
              style={styles.button}
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const styles = {
  container: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.bg,
    fontFamily: fonts.sans,
  },
  card: {
    textAlign: 'center',
    padding: 40,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: colors.down + '15',
    color: colors.down,
    fontSize: 28,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: colors.text1,
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: colors.text2,
    fontFamily: fonts.mono,
    marginBottom: 24,
  },
  button: {
    padding: '8px 24px',
    borderRadius: 6,
    border: `1px solid ${colors.border}`,
    background: colors.bg,
    color: colors.text1,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
}
