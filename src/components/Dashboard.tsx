import { formatBytes } from "../utils";
import type { DashboardStats, ModInfo } from "../types";

interface Props {
  stats: DashboardStats | null;
  mods: ModInfo[];
  storage: Record<string, number> | null;
  loading: boolean;
}

export function Dashboard({ stats, mods, storage, loading }: Props) {
  if (loading || !stats) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading dashboard...
      </div>
    );
  }

  const recentMods = mods.slice(0, 5);
  const totalStorage = storage
    ? Object.values(storage).reduce((a, b) => a + b, 0)
    : stats.totalSizeBytes;

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card accent">
          <div className="stat-label">Installed Mods</div>
          <div className="stat-value accent">{stats.totalMods}</div>
          <div className="stat-sub">
            {stats.activeMods} active · {stats.inactiveMods} inactive
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Storage Used</div>
          <div className="stat-value">{formatBytes(stats.totalSizeBytes)}</div>
          <div className="stat-sub">
            {formatBytes(stats.activeSizeBytes)} in active mods
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Game Version</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {stats.gameVersion ?? "Unknown"}
          </div>
          <div className="stat-sub">BeamNG.drive</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Issues</div>
          <div className="stat-value" style={{ color: stats.brokenMods > 0 ? "var(--danger)" : "var(--success)" }}>
            {stats.brokenMods + stats.outdatedMods}
          </div>
          <div className="stat-sub">
            {stats.brokenMods} broken · {stats.outdatedMods} outdated
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <h3>Storage Breakdown</h3>
          </div>
          <div className="card-body">
            {storage ? (
              Object.entries(storage).map(([key, bytes]) => (
                <div className="storage-bar" key={key}>
                  <div className="storage-bar-label">
                    <span style={{ textTransform: "capitalize" }}>{key}</span>
                    <span>{formatBytes(bytes)}</span>
                  </div>
                  <div className="storage-bar-track">
                    <div
                      className="storage-bar-fill"
                      style={{ width: `${totalStorage > 0 ? (bytes / totalStorage) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: "var(--text-muted)" }}>No storage data available</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Recent Mods</h3>
          </div>
          <div className="card-body">
            {recentMods.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <p>No mods installed yet</p>
              </div>
            ) : (
              <div className="mod-list">
                {recentMods.map((mod) => (
                  <div className="mod-row" key={mod.id} style={{ padding: "10px 12px" }}>
                    <div className="mod-icon">📦</div>
                    <div className="mod-info">
                      <div className="mod-title">{mod.title}</div>
                      <div className="mod-meta">
                        <span>{formatBytes(mod.sizeBytes)}</span>
                        <span className={`badge ${mod.active ? "badge-active" : "badge-inactive"}`}>
                          {mod.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="path-display" style={{ marginTop: 16 }}>
        User Folder: {stats.userFolder}
      </div>
    </>
  );
}
