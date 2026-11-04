import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('WhiskerWatch Hydra ErrorBoundary caught:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      let parsedError: Record<string, unknown> | null = null;
      try {
        parsedError = JSON.parse(this.state.errorMessage);
      } catch {
        parsedError = null;
      }

      return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-semibold">
                Application Operation Interrupted
              </h2>
            </div>

            {parsedError ? (
              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  A database security rule or permission constraint prevented
                  this operation on path{' '}
                  <span className="font-mono text-slate-900">
                    {String(parsedError.path || 'unknown')}
                  </span>
                  .
                </p>
                <pre className="p-3 bg-slate-100 rounded-lg text-xs font-mono overflow-x-auto text-slate-800">
                  {JSON.stringify(parsedError, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-slate-600 break-words">
                {this.state.errorMessage}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload WhiskerWatch Hydra
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
