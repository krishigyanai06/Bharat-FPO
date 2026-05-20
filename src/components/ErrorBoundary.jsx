import { Component } from "react";

const isTranslateError = (error) =>
  error?.message?.includes("removeChild") ||
  error?.message?.includes("insertBefore") ||
  error?.message?.includes("not a child") ||
  error?.message?.includes("The node to be removed");

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Silently ignore Google Translate DOM errors
    if (isTranslateError(error)) return { hasError: false };
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (isTranslateError(error)) {
      // Reset immediately — don't show error UI
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-gray-500 text-sm">
            Something went wrong. Please refresh.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-4 py-2 text-sm text-white bg-brand-600 rounded-lg hover:bg-brand-700"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
