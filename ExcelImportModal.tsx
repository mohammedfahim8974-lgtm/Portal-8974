import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw, Database, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('Failed to clear localStorage', e);
    }
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F5F7] dark:bg-zinc-950 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-line dark:border-zinc-800 overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400 animate-pulse">
                <AlertCircle size={40} />
              </div>
              
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3 tracking-tight">
                Something went wrong
              </h1>
              
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8 leading-relaxed">
                The application encountered an unexpected error. This usually happens due to corrupted data or a temporary glitch.
              </p>

              {this.state.error && (
                <div className="mb-8 p-4 bg-[#F5F5F7] dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-left">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Error Details:</p>
                  <p className="text-xs font-mono text-red-500 dark:text-red-400 break-all line-clamp-3">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98]"
                >
                  <RefreshCcw size={18} />
                  Try Again
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-line dark:border-zinc-700 rounded-2xl font-bold text-sm hover:bg-[#F5F5F7] dark:hover:bg-zinc-700 transition-all active:scale-[0.98]"
                >
                  <Home size={18} />
                  Go to Dashboard
                </button>

                <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Advanced Recovery</p>
                  <button
                    onClick={this.handleReset}
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/20 transition-all active:scale-[0.98]"
                  >
                    <Database size={18} />
                    Clear Cache & Reset Data
                  </button>
                  <p className="text-[9px] text-zinc-400 mt-2 italic">
                    Warning: This will clear all local settings and data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
