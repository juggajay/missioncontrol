import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 m-4 rounded-lg bg-cyber-red/10 border border-cyber-red/40 font-mono text-sm">
          <h2 className="text-cyber-red font-display text-lg font-bold mb-2">Render Error</h2>
          <pre className="text-cyber-text whitespace-pre-wrap break-words">
            {this.state.error.message}
          </pre>
          <pre className="text-cyber-text-muted text-xs mt-2 whitespace-pre-wrap break-words max-h-40 overflow-auto">
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-3 px-3 py-1.5 rounded bg-cyber-bg-surface border border-cyber-border text-cyber-cyan text-xs hover:bg-cyber-bg-tertiary"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
