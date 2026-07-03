import type { CSSProperties, ReactNode, ButtonHTMLAttributes } from "react";

type Variant = "success" | "info" | "danger" | "warning" | "primary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "default" | "sm" | "compact";
  loading?: boolean;
  icon?: ReactNode;
}

const variantClass: Record<Variant, string> = {
  success: "btn-success",
  info: "btn-info",
  danger: "btn-danger",
  warning: "btn-warning",
  primary: "btn-primary",
  ghost: "btn-ghost",
};

export function Button({
  variant = "primary",
  size = "default",
  loading,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const sizeClass = size === "sm" ? "btn-sm" : size === "compact" ? "btn-compact" : "";
  return (
    <button
      className={`btn ${variantClass[variant]} ${sizeClass} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="btn-spinner" /> : icon}
      {children}
    </button>
  );
}

export function ErrorAlert({ title, message }: { title: string; message?: string }) {
  return (
    <div className="alert alert-danger" role="alert">
      <span aria-hidden>✕</span>
      <div>
        <div className="alert-title">{title}</div>
        {message && <div className="alert-message">{message}</div>}
      </div>
    </div>
  );
}

export function WarningPanel({ title, messages }: { title: string; messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <div className="alert alert-warning section-gap">
      <span aria-hidden>⚠</span>
      <div>
        <div className="alert-title">{title} ({messages.length})</div>
        <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
          {messages.slice(0, 6).map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Skeleton({
  height = 48,
  width = "100%",
  style,
}: {
  height?: number;
  width?: string | number;
  style?: CSSProperties;
}) {
  return <div className="skeleton" style={{ height, width, ...style }} />;
}
