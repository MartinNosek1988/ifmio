import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch dynamically imported module');

    return { hasError: true, error, isChunkError };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch dynamically imported module');

    if (isChunkError) {
      const lastAttempt = sessionStorage.getItem('chunk-reload-attempted');
      const now = Date.now();
      if (!lastAttempt || now - Number(lastAttempt) > 10000) {
        sessionStorage.setItem('chunk-reload-attempted', String(now));
        window.location.reload();
        return;
      }
    }

    console.error(
      `[ErrorBoundary] ${this.props.moduleName ?? 'Unknown module'}:`,
      error,
      info.componentStack,
    );

    Sentry.captureException(error, {
      tags: { module: this.props.moduleName ?? 'unknown' },
      contexts: { react: { componentStack: info.componentStack ?? undefined } },
    });
  }

  render() {
    if (this.state.hasError) {
      // Chunk load error — show reload prompt (auto-reload already attempted)
      if (this.state.isChunkError) {
        return (
          <div className="error-boundary">
            <div className="error-boundary__icon">↻</div>
            <div className="error-boundary__title">
              Byla nasazena nová verze aplikace
            </div>
            <div className="error-boundary__message">
              Pro pokračování je potřeba obnovit stránku.
            </div>
            <button
              className="error-boundary__retry"
              onClick={() => window.location.reload()}
            >
              Obnovit stránku
            </button>
          </div>
        );
      }

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
            onClick={() => this.setState({ hasError: false, error: null, isChunkError: false })}
          >
            Zkusit znovu
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
