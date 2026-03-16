import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md text-center space-y-4">
            <h2 className="text-xl font-display font-bold text-destructive">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message ?? "An unexpected error occurred. Please try refreshing the page."}
            </p>
            <Button onClick={() => { this.setState({ hasError: false, error: null }, () => window.history.back()); }}>
              Go Back
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="ml-2">
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
