import { useEffect, useRef, useState, type ReactNode } from "react";
import { loadNumber, saveNumber } from "../../store/persistence";
import { useApp } from "../../store/AppProvider";
import { useNavigation } from "../../navigation/NavigationProvider";
import type { RouteId } from "../../navigation/types";

const MIN_W = 150;
const MAX_W = 225;

function NavItem({
  label,
  icon,
  route,
  params,
  running,
  onClick,
}: {
  label: string;
  icon: string;
  route: RouteId;
  params?: Record<string, string>;
  running?: boolean;
  onClick?: () => void;
}) {
  const { state, navigate } = useNavigation();
  const active =
    state.route === route &&
    JSON.stringify(state.params) === JSON.stringify(params ?? {});

  return (
    <button
      className={`sidebar-item ${active ? "active" : ""}`}
      onClick={() => {
        navigate(route, params);
        onClick?.();
      }}
    >
      <span>{icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {running && <span className="dot-running" title="Active profile" />}
    </button>
  );
}

export function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { profiles, launchStates, recentProfileIds, version } = useApp();
  const [width, setWidth] = useState(() => loadNumber("sidebar-width", 200));
  const dragging = useRef(false);

  const runningProfiles = profiles?.profiles.filter((p) => launchStates[p.id] === "running") ?? [];
  const recent = recentProfileIds
    .map((id) => profiles?.profiles.find((p) => p.id === id))
    .filter(Boolean)
    .slice(0, 3);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const next = Math.min(MAX_W, Math.max(MIN_W, e.clientX));
      setWidth(next);
    };
    const onUp = () => {
      if (dragging.current) {
        dragging.current = false;
        saveNumber("sidebar-width", width);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [width]);

  return (
    <>
      <aside className="sidebar" style={{ width }}>
        <div className="sidebar-brand">
          <img src="/icon.png" alt="" />
          <div>
            <div className="sidebar-brand-name">ManageNG</div>
            <div className="sidebar-brand-sub">BeamNG.drive</div>
          </div>
        </div>

        <div className="sidebar-nav">
          <div className="sidebar-section">
            <div className="sidebar-section-label">Core</div>
            <NavItem label="Home" icon="⌂" route="home" />
            <NavItem label="Profiles" icon="▦" route="profiles" />
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">Sources</div>
            <NavItem label="BeamNG Repository" icon="⬡" route="browse" />
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">Tools</div>
            <NavItem label="Performance" icon="◈" route="tools" />
          </div>

          {runningProfiles.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Running</div>
              {runningProfiles.map((p) => (
                <NavItem
                  key={p.id}
                  label={p.name}
                  icon={p.icon ?? "▶"}
                  route="profile-detail"
                  params={{ id: p.id }}
                  running
                />
              ))}
            </div>
          )}

          {recent.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Recent</div>
              {recent.map((p) =>
                p ? (
                  <NavItem
                    key={p.id}
                    label={p.name}
                    icon={p.icon ?? "◷"}
                    route="profile-detail"
                    params={{ id: p.id }}
                    running={launchStates[p.id] === "running"}
                  />
                ) : null
              )}
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="btn btn-ghost btn-sm" onClick={onOpenSettings} title="Settings">
            ⚙
          </button>
          <button className="btn btn-ghost btn-sm" title="Feedback">
            ✉
          </button>
          <span style={{ marginLeft: "auto", fontSize: "0.6875rem", opacity: 0.6 }}>v{version}</span>
        </div>
      </aside>
      <div
        className={`sidebar-resizer ${dragging.current ? "dragging" : ""}`}
        onMouseDown={() => {
          dragging.current = true;
        }}
      />
    </>
  );
}

export function TitleBar({ actions }: { actions?: ReactNode }) {
  const { breadcrumbs, goBack, goForward, canGoBack, canGoForward, navigate } = useNavigation();

  return (
    <header className="titlebar">
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <button className="btn btn-ghost btn-compact" disabled={!canGoBack} onClick={goBack} title="Back">
          ←
        </button>
        <button className="btn btn-ghost btn-compact" disabled={!canGoForward} onClick={goForward} title="Forward">
          →
        </button>
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <span className="breadcrumb-sep">›</span>}
              <button
                className={`breadcrumb-item ${i === breadcrumbs.length - 1 ? "current" : ""}`}
                onClick={() => {
                  if (i < breadcrumbs.length - 1) {
                    navigate(crumb.route, crumb.params);
                  }
                }}
                disabled={i === breadcrumbs.length - 1}
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </nav>
      </div>
      <div className="titlebar-actions">{actions}</div>
    </header>
  );
}

export function ToastStack() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.variant}`}>
          <div className="toast-title">{t.title}</div>
          {t.message && <div className="toast-msg">{t.message}</div>}
          <button
            className="btn btn-ghost btn-compact"
            style={{ position: "absolute", top: 8, right: 8 }}
            onClick={() => dismissToast(t.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export function Sheet({
  open,
  title,
  onClose,
  footer,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-header">
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </>
  );
}

export function Dialog({
  open,
  title,
  onClose,
  children,
  actions,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">{title}</div>
        {children}
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </div>
  );
}
