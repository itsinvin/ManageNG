import { useEffect, useState } from "react";
import {
  checkUpdates,
  getConflicts,
  previewDeepClean,
  runDeepClean,
} from "../api";
import { formatBytes, severityColor } from "../utils";
import type { CleanupPreview, CleanupResult, ModConflict, ModInfo } from "../types";

interface Props {
  onRefresh: () => void;
}

export function Tools({ onRefresh }: Props) {
  const [conflicts, setConflicts] = useState<ModConflict[]>([]);
  const [cleanupPreview, setCleanupPreview] = useState<CleanupPreview | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [updates, setUpdates] = useState<ModInfo[]>([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const [loadingCleanup, setLoadingCleanup] = useState(false);
  const [runningCleanup, setRunningCleanup] = useState(false);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConflicts();
    loadCleanupPreview();
    loadUpdates();
  }, []);

  async function loadConflicts() {
    setLoadingConflicts(true);
    try {
      setConflicts(await getConflicts());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingConflicts(false);
    }
  }

  async function loadCleanupPreview() {
    setLoadingCleanup(true);
    try {
      setCleanupPreview(await previewDeepClean());
    } catch {
      // Path may not be configured yet
    } finally {
      setLoadingCleanup(false);
    }
  }

  async function loadUpdates() {
    setLoadingUpdates(true);
    try {
      setUpdates(await checkUpdates());
    } catch {
      // ignore
    } finally {
      setLoadingUpdates(false);
    }
  }

  async function handleDeepClean() {
    setRunningCleanup(true);
    setError(null);
    try {
      const result = await runDeepClean();
      setCleanupResult(result);
      setCleanupPreview(null);
      await loadCleanupPreview();
      onRefresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setRunningCleanup(false);
    }
  }

  return (
    <>
      {error && <div className="error-banner">⚠️ {error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <h3>🧹 Deep Clean</h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleDeepClean}
              disabled={runningCleanup || !cleanupPreview || cleanupPreview.fileCount === 0}
            >
              {runningCleanup ? "Cleaning..." : "Run Deep Clean"}
            </button>
          </div>
          <div className="card-body">
            {loadingCleanup ? (
              <div className="loading" style={{ padding: 24 }}>
                <div className="spinner" /> Scanning...
              </div>
            ) : cleanupResult ? (
              <div>
                <div className="success-banner" style={{ marginBottom: 12 }}>
                  Freed {formatBytes(cleanupResult.bytesFreed)} — removed{" "}
                  {cleanupResult.filesRemoved} files
                </div>
                <ul style={{ fontSize: 12, color: "var(--text-muted)", paddingLeft: 16 }}>
                  {cleanupResult.pathsCleaned.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ) : cleanupPreview && cleanupPreview.fileCount > 0 ? (
              <>
                <p style={{ marginBottom: 12, color: "var(--text-secondary)" }}>
                  Clear {cleanupPreview.fileCount} cache/temp files (
                  {formatBytes(cleanupPreview.totalBytes)}) to improve performance.
                </p>
                {cleanupPreview.paths.map((target) => (
                  <div key={target.path} className="storage-bar">
                    <div className="storage-bar-label">
                      <span>{target.label}</span>
                      <span>
                        {target.fileCount} files · {formatBytes(target.sizeBytes)}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p style={{ color: "var(--text-muted)" }}>No cache or temp files to clean.</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>🔄 Mod Updates</h3>
            <button className="btn btn-secondary btn-sm" onClick={loadUpdates} disabled={loadingUpdates}>
              {loadingUpdates ? "Checking..." : "Check Updates"}
            </button>
          </div>
          <div className="card-body">
            {loadingUpdates ? (
              <div className="loading" style={{ padding: 24 }}>
                <div className="spinner" /> Checking...
              </div>
            ) : updates.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>All mods are up to date.</p>
            ) : (
              <div className="mod-list">
                {updates.map((mod) => (
                  <div className="mod-row" key={mod.id} style={{ padding: "10px 12px" }}>
                    <div className="mod-icon">🔄</div>
                    <div className="mod-info">
                      <div className="mod-title">{mod.title}</div>
                      <div className="mod-meta">
                        <span className="badge badge-update">Update Available</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>⚡ Conflict Detection</h3>
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadConflicts}
            disabled={loadingConflicts}
          >
            {loadingConflicts ? "Scanning..." : "Rescan"}
          </button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loadingConflicts ? (
            <div className="loading" style={{ padding: 24 }}>
              <div className="spinner" /> Scanning active mods for conflicts...
            </div>
          ) : conflicts.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="icon">✅</div>
              <h3>No conflicts detected</h3>
              <p>All active mods appear compatible.</p>
            </div>
          ) : (
            conflicts.map((conflict, i) => (
              <div className="conflict-item" key={i}>
                <div
                  className="conflict-severity"
                  style={{ background: severityColor(conflict.severity) }}
                />
                <div>
                  <div className="conflict-path">{conflict.filePath}</div>
                  <div className="conflict-mods">
                    Overwritten by: {conflict.mods.join(", ")}
                  </div>
                  <span
                    className="badge"
                    style={{
                      marginTop: 4,
                      background: `${severityColor(conflict.severity)}22`,
                      color: severityColor(conflict.severity),
                    }}
                  >
                    {conflict.severity} severity
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
