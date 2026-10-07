import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("LifeNest caught an unhandled exception:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleCopyError = () => {
    const text = `LifeNest Error Report:
Error: ${this.state.error?.name}: ${this.state.error?.message}
Stack:
${this.state.error?.stack || "No stack trace available"}

Component Stack:
${this.state.errorInfo?.componentStack || "No component stack"}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}`;

    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* Header Badge */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                      System Exception
                    </span>
                    <span className="text-xs text-slate-400 font-medium">LifeNest OS</span>
                  </div>
                  <h1 className="text-lg font-bold text-slate-100 mt-1">
                    Something went wrong
                  </h1>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="py-5 space-y-4">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                The application encountered an unexpected issue while rendering this view. Your database records, documents, and credentials remain safe.
              </p>

              {this.state.error && (
                <div className="rounded-xl border border-rose-900/40 bg-rose-950/30 p-3.5 text-xs text-rose-300 font-mono break-all">
                  <span className="font-semibold text-rose-200">Error: </span>
                  {this.state.error.message || "An unknown client runtime error occurred."}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 hover:bg-slate-100 transition shadow-xs cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reload Page
                </button>

                <button
                  type="button"
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                >
                  <Home className="h-3.5 w-3.5" />
                  Go to Dashboard
                </button>

                <button
                  type="button"
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-transparent px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800/60 transition cursor-pointer"
                >
                  Try Again
                </button>
              </div>

              {/* Technical Details Toggle */}
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    <span>Technical Diagnostics</span>
                    {this.state.showDetails ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={this.handleCopyError}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    {this.state.copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Diagnostic</span>
                      </>
                    )}
                  </button>
                </div>

                {this.state.showDetails && (
                  <div className="mt-3 max-h-48 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] font-mono text-slate-400 space-y-2">
                    <div>
                      <span className="text-slate-500 font-semibold">Location:</span> {window.location.href}
                    </div>
                    {this.state.error?.stack && (
                      <div>
                        <span className="text-slate-500 font-semibold">Stack Trace:</span>
                        <pre className="mt-1 whitespace-pre-wrap text-[10px] text-slate-400">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <span className="text-slate-500 font-semibold">Component Trace:</span>
                        <pre className="mt-1 whitespace-pre-wrap text-[10px] text-slate-500">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>LifeNest • Personal Life OS</span>
              <span>Need help? Check Supabase connection or settings</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
