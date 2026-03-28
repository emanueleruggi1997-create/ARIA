import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#080A0F',
          color: '#F0F4FF',
          fontFamily: 'Inter, sans-serif',
          padding: 24,
          textAlign: 'center',
          gap: 16,
        }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Si è verificato un errore</h2>
          <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>
            Ricarica la pagina per continuare.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8,
              padding: '10px 24px',
              borderRadius: 10,
              background: '#3B6EF8',
              color: '#fff',
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ricarica la pagina
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}