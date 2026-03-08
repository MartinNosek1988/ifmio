import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[ErrorBoundary] ${this.props.moduleName ?? 'Unknown module'}:`,
      error,
      info.componentStack,
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="error-boundary">
          <div className="error-boundary__icon">!</div>
          <div className="error-boundary__title">
            {this.props.moduleName
              ? `Chyba v modulu ${this.props.moduleName}`
              : 'Neočekávaná chyba'}
          </div>
          <div className="error-boundary__message">
            {this.state.error?.message}
          </div>
          <button
            className="error-boundary__retry"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Zkusit znovu
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
