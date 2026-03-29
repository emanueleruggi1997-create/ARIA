import React from 'react';

export default class ConnectionsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ConnectionsErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-destructive">⚠️ Errore nelle Connessioni</h3>
          <p className="text-xs text-muted-foreground">
            Si è verificato un errore durante il caricamento della scheda Connessioni. Prova a ricaricare la pagina.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition"
          >
            Ricarica pagina
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}