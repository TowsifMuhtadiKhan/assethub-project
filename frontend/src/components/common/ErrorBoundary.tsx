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
    console.error("Likhe Rakho caught an unhandled exception:", error, errorInfo);
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
    const text = `Likhe Rakho Error Report:
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
        <div className="min-h-screen bg-[#f6faf7] flex flex-col items-center justify-center p-4 sm:p-6 text-slate-900 relative overflow-hidden">
          {/* Ambient Theme Glows */}
          <div className="absolute h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl -top-10 -left-10 pointer-events-none" />
          <div className="absolute h-80 w-80 rounded-full bg-teal-500/10 blur-3xl -bottom-10 -right-10 pointer-events-none" />

          <div className="relative w-full max-w-xl rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl shadow-emerald-950/5">
            {/* Header Badge & Brand */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo.png"
                  alt="Likhe Rakho"
                  className="h-8 w-8 object-contain rounded-xl shadow-2xs"
                />
                <div className="flex flex-col">
                  <div className="text-[14px] font-extrabold tracking-tight leading-tight flex items-center gap-0.5">
                    <span className="text-[#064e3b]">Likhe</span>
                    <span className="text-[#00a859]">Rakho</span>
                  </div>
                  <div className="text-[9px] font-semibold text-[#064e3b]/85 leading-none flex items-center gap-1 mt-0.5">
                    <span className="h-px w-2 bg-emerald-400" />
                    <span>লিখে রাখো</span>
                    <span className="h-px w-2 bg-emerald-400" />
                  </div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-rose-50 text-rose-700 border border-rose-200">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>System Exception</span>
              </span>
            </div>

            {/* Title & Description */}
            <div className="py-5 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shadow-2xs mt-0.5">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                    Something went wrong
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                    The application encountered an unexpected issue while rendering this view. Your database records, documents, and credentials remain safe and encrypted.
                  </p>
                </div>
              </div>

              {this.state.error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-900 font-mono break-all space-y-1">
                  <span className="font-bold text-rose-800">Error Detail: </span>
                  <span>{this.state.error.message || "An unexpected client runtime error occurred."}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] hover:from-[#073f30] hover:to-[#0b6e4e] px-4 py-2.5 text-xs font-bold text-white transition shadow-xs cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reload Page
                </button>

                <button
                  type="button"
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-slate-950 transition shadow-xs cursor-pointer"
                >
                  <Home className="h-3.5 w-3.5" />
                  Go to Dashboard
                </button>

                <button
                  type="button"
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  Try Again
                </button>
              </div>

              {/* Technical Diagnostics Toggle */}
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
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
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition cursor-pointer"
                  >
                    {this.state.copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Diagnostic Report</span>
                      </>
                    )}
                  </button>
                </div>

                {this.state.showDetails && (
                  <div className="mt-3 max-h-48 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-[11px] font-mono text-slate-600 space-y-2">
                    <div>
                      <span className="text-slate-400 font-semibold">Location:</span> {window.location.href}
                    </div>
                    {this.state.error?.stack && (
                      <div>
                        <span className="text-slate-400 font-semibold">Stack Trace:</span>
                        <pre className="mt-1 whitespace-pre-wrap text-[10px] text-slate-600 font-mono">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <span className="text-slate-400 font-semibold">Component Trace:</span>
                        <pre className="mt-1 whitespace-pre-wrap text-[10px] text-slate-600 font-mono">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-medium text-slate-500">Likhe Rakho • লিখে রাখো</span>
              <span>Personal Life & Asset OS</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
