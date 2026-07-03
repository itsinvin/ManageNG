import { useEffect, useState } from "react";
import { useApp } from "../store/AppProvider";
import { Button, WarningPanel } from "../components/ui/primitives";
import { previewDeepClean, runDeepClean } from "../api";
import { formatBytes } from "../utils";
import type { CleanupPreview, CleanupResult } from "../types";

export function ToolsPage() {
  const { conflicts, updates, refresh, refreshConflicts, refreshing } = useApp();
  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [spin, setSpin] = useState(false);

  useEffect(() => {
    previewDeepClean().then(setPreview).catch(() => setPreview(null));
    refreshConflicts();
  }, [refreshConflicts]);

  const conflictMessages = conflicts.map(
    (c) => `[${c.severity}] ${c.filePath} — ${c.mods.join(", ")}`
  );

  async function handleClean() {
    setCleaning(true);
    try {
      const r = await runDeepClean();
      setResult(r);
      setPreview(await previewDeepClean());
      await refresh();
    } finally {
      setCleaning(false);
    }
  }

  async function handleRescan() {
    setSpin(true);
    await refreshConflicts();
    setTimeout(() => setSpin(false), 650);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="surface" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontWeight: 600 }}>Deep Clean</h3>
          <Button
            variant="success"
            size="sm"
            loading={cleaning}
            disabled={!preview || preview.fileCount === 0}
            onClick={handleClean}
          >
            Run Deep Clean
          </Button>
        </div>
        {result ? (
          <p style={{ fontSize: "0.875rem", color: "var(--success)" }}>
            Freed {formatBytes(result.bytesFreed)} — {result.filesRemoved} files removed
          </p>
        ) : preview && preview.fileCount > 0 ? (
          <>
            <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: 12 }}>
              {preview.fileCount} cache/temp files ({formatBytes(preview.totalBytes)})
            </p>
            {preview.paths.map((p) => (
              <div key={p.path} style={{ fontSize: "0.8125rem", marginBottom: 6 }}>
                {p.label}: {p.fileCount} files · {formatBytes(p.sizeBytes)}
              </div>
            ))}
          </>
        ) : (
          <p style={{ color: "var(--muted-foreground)" }}>No cache or temp files to clean.</p>
        )}
      </div>

      <div className="surface" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontWeight: 600 }}>Updates</h3>
          <Button variant="info" size="sm" onClick={() => refresh()}>
            Check
          </Button>
        </div>
        {updates.length === 0 ? (
          <p style={{ color: "var(--muted-foreground)" }}>All packages up to date.</p>
        ) : (
          updates.map((u) => (
            <div key={u.id} style={{ fontSize: "0.875rem", marginBottom: 8 }}>
              {u.title} <span className="tag badge-warning">Update</span>
            </div>
          ))
        )}
      </div>

      <div className="surface" style={{ padding: 20, gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontWeight: 600 }}>Conflict Detection</h3>
          <Button variant="ghost" size="sm" className={spin || refreshing ? "spin-once" : ""} onClick={handleRescan}>
            ↻ Rescan
          </Button>
        </div>
        <WarningPanel title="Active package conflicts" messages={conflictMessages} />
        {conflicts.length === 0 && (
          <p style={{ color: "var(--muted-foreground)" }}>No conflicts among active packages.</p>
        )}
      </div>
    </div>
  );
}
