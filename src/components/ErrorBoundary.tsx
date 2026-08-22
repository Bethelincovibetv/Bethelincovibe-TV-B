import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}
interface State { hasError: boolean; error?: Error }

/** Prevents a single broken component from blanking the entire page. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ""}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div className="container mx-auto px-4 py-10 text-center">
          <h2 className="text-lg font-semibold mb-2">Something went wrong loading this section.</h2>
          <p className="text-sm text-muted-foreground mb-4">Try refreshing the page. If it keeps happening, contact support.</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: undefined }); }}
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}