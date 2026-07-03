import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ManageNG render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            background: "#12141a",
            color: "#ece8e1",
            fontFamily: "Segoe UI, sans-serif",
          }}
        >
          <div style={{ maxWidth: 520 }}>
            <h1 style={{ fontSize: "1.25rem", marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ color: "#8b909d", marginBottom: 16, fontSize: "0.875rem" }}>
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("manageng:nav");
                window.location.reload();
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: "#3d9a5c",
                color: "#ecf7ef",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Reset navigation and reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
