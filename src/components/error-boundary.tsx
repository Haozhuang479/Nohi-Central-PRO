import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Render crash:', error, info.componentStack)
  }

  reset = (): void => this.setState({ error: null })

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset)
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-background p-8">
          <div className="max-w-lg w-full rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="size-9 rounded-full bg-destructive/15 text-destructive flex items-center justify-center text-lg">!</span>
              <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words font-mono">
              {this.state.error.message}
            </p>
            <details className="text-xs text-muted-foreground/70">
              <summary className="cursor-pointer hover:text-muted-foreground">Stack trace</summary>
              <pre className="mt-2 p-3 rounded bg-muted/50 overflow-x-auto text-[10px] leading-relaxed">
                {this.state.error.stack}
              </pre>
            </details>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={this.reset}
                className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted"
              >
                Reload app
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
