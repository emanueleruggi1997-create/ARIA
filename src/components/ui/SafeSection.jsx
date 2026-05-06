/**
 * SafeSection — ErrorBoundary a livello di sezione/componente.
 * Un crash in una sezione non rompe il resto della pagina.
 *
 * Uso:
 * <SafeSection label="Widget Appuntamenti">
 *   <AppointmentRequests ... />
 * </SafeSection>
 */
import React from 'react';

export default class SafeSection extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    const label = this.props.label || 'Section';
    console.error(`[SafeSection:${label}] Caught error:`, error.message, info?.componentStack?.slice(0, 300));
  }

  render() {
    if (this.state.hasError) {
      const label = this.props.label || 'Sezione';
      const fallback = this.props.fallback;
      if (fallback) return fallback;
      return (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#9CA3AF',
          fontSize: 12,
        }}>
          ⚠️ <strong style={{ color: '#F87171' }}>{label}</strong> — impossibile visualizzare questa sezione.{' '}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ color: '#60A5FA', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}
          >
            Riprova
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}