import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui';

interface Props {
  children: ReactNode;
  /** Optional label shown above the error message. */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Lightweight class-boundary. Catches render-time errors in a subtree and
 * renders a recoverable fallback instead of a white screen. Pages can still
 * mount their own nested boundary if they need to isolate further.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Log to console so devs see it; production telemetry is a future-phase concern.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="container section" role="alert" aria-live="assertive">
        <div className="mx-auto max-w-xl rounded-xl border border-line-soft bg-surface-1/80 p-6 shadow-card">
          <div className="text-xs uppercase tracking-wider text-danger-500 font-mono">
            {this.props.label ?? 'Something went wrong'}
          </div>
          <h2 className="mt-2 display text-h2 text-fg-app">This section failed to load.</h2>
          <p className="mt-2 text-small text-fg-muted">
            {this.state.error.message || 'An unexpected error occurred while rendering this view.'}
          </p>
          <div className="mt-5">
            <Button variant="primary" size="md" onClick={this.handleRetry}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }
}