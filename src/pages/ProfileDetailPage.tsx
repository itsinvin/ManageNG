import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useApp } from "../store/AppProvider";
import { useNavigation } from "../navigation/NavigationProvider";
import { Button, WarningPanel } from "../components/ui/primitives";
import { Dialog } from "../components/shell/AppShell";
import { getSettings, updateSettings } from "../store/settings";
import { formatBytes, formatDate, sourceLabel } from "../utils";
import type { ModInfo } from "../types";

const TABS = ["Quickplay", "Packages", "Performance", "Settings"] as const;

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function ProfileDetailPage() {
  const { state, setProfileTab, navigate } = useNavigation();
  const profileId = state.params.id ?? "";
  const {
    getProfile,
    mods,
    conflicts,
    launchStates,
    applyProfileById,
    setLaunchState,
    saveCurrentToProfile,
    toggleModById,
    deleteModById,
    installFromFiles,
    refresh,
    refreshing,
    stats,
  } = useApp();

  const profile = getProfile(profileId);
  const tab = state.profileTab ?? "Quickplay";
  const [confirmKill, setConfirmKill] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [sortBy, setSortBy] = useState(getSettings().sortByPackages);
  const [enabledFirst, setEnabledFirst] = useState(getSettings().enabledFirst);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [spinRefresh, setSpinRefresh] = useState(false);
  const cachedTabs = useRef<Set<string>>(new Set(["Quickplay"]));

  useEffect(() => {
    cachedTabs.current.add(tab);
  }, [tab]);

  const conflictMessages = useMemo(
    () => conflicts.map((c) => `${c.filePath} — ${c.mods.join(", ")}`),
    [conflicts]
  );

  const modConflicts = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of conflicts) {
      for (const m of c.mods) {
        const arr = map.get(m) ?? [];
        arr.push(c.filePath);
        map.set(m, arr);
      }
    }
    return map;
  }, [conflicts]);

  const sortedMods = useMemo(() => {
    let list = [...mods];
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.filename.toLowerCase().includes(q) ||
          m.author?.toLowerCase().includes(q)
      );
    }
    if (enabledFirst) {
      list.sort((a, b) => Number(b.active) - Number(a.active));
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case "filename":
          return a.filename.localeCompare(b.filename);
        case "size":
          return b.sizeBytes - a.sizeBytes;
        case "modified":
          return (b.dateInstalled ?? "").localeCompare(a.dateInstalled ?? "");
        default:
          return a.title.localeCompare(b.title);
      }
    });
    return list;
  }, [mods, debouncedSearch, enabledFirst, sortBy]);

  const handleRefresh = useCallback(async () => {
    setSpinRefresh(true);
    await refresh();
    setTimeout(() => setSpinRefresh(false), 650);
  }, [refresh]);

  if (!profile) {
    return (
      <div className="empty-state">
        <p>Profile not found.</p>
        <Button variant="info" onClick={() => navigate("profiles")}>
          Back to profiles
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setProfileTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {(tab === "Quickplay" || cachedTabs.current.has("Quickplay")) && (
        <div hidden={tab !== "Quickplay"}>
          <div className="surface" style={{ padding: 20 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: 8 }}>{profile.name}</h2>
            <p style={{ color: "var(--muted-foreground)", marginBottom: 16 }}>{profile.description}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="tag">BeamNG.drive</span>
              {stats?.gameVersion && <span className="tag">{stats.gameVersion}</span>}
              <span className="tag">
                {profile.modIds.length} saved · {mods.filter((m) => m.active).length} active
              </span>
              {launchStates[profileId] === "running" && (
                <span className="tag badge-success">Running</span>
              )}
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
              <Button
                variant="success"
                onClick={() => applyProfileById(profileId)}
                disabled={launchStates[profileId] === "running"}
              >
                Apply profile
              </Button>
              <Button variant="info" onClick={() => saveCurrentToProfile(profileId)}>
                Save current mods
              </Button>
            </div>
          </div>
        </div>
      )}

      {(tab === "Packages" || cachedTabs.current.has("Packages")) && (
        <div hidden={tab !== "Packages"}>
          <WarningPanel title="Package conflicts detected" messages={conflictMessages} />

          <div
            className={`content-panel drop-target ${dragOver ? "drag-over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setDragOver(false);
            }}
          >
            <div className="content-toolbar">
              <span style={{ fontSize: "1.125rem", fontWeight: 500 }}>Packages</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={spinRefresh || refreshing ? "spin-once" : ""}
                  onClick={handleRefresh}
                >
                  ↻ Refresh
                </Button>
                <Button
                  variant="info"
                  size="sm"
                  onClick={() => navigate("browse", {}, { installingFor: profileId })}
                >
                  Install from repository
                </Button>
                <Button
                  variant="info"
                  size="sm"
                  onClick={async () => {
                    const picked = await open({
                      multiple: true,
                      filters: [{ name: "Zip", extensions: ["zip"] }],
                    });
                    if (picked) {
                      const paths = Array.isArray(picked) ? picked : [picked];
                      await installFromFiles(paths as string[]);
                    }
                  }}
                >
                  Install from file
                </Button>
              </div>
            </div>

            <div className="filter-float">
              <select
                className="search-input"
                value={sortBy}
                onChange={(e) => {
                  const v = e.target.value as typeof sortBy;
                  setSortBy(v);
                  updateSettings({ sortByPackages: v });
                }}
              >
                <option value="name">Name</option>
                <option value="filename">Filename</option>
                <option value="modified">Modified</option>
                <option value="size">Filesize</option>
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8125rem" }}>
                <input
                  type="checkbox"
                  checked={enabledFirst}
                  onChange={(e) => {
                    setEnabledFirst(e.target.checked);
                    updateSettings({ enabledFirst: e.target.checked });
                  }}
                />
                Enabled first
              </label>
            </div>

            <input
              className="search-input"
              style={{ margin: 16, width: "calc(100% - 32px)" }}
              placeholder="Search packages…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="content-list">
              {sortedMods.map((mod) => (
                <ModRow
                  key={mod.id}
                  mod={mod}
                  selected={selected.has(mod.id)}
                  conflicts={modConflicts.get(mod.title) ?? modConflicts.get(mod.filename) ?? []}
                  deleteConfirm={deleteConfirm === mod.id}
                  onSelect={(multi) => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (multi) {
                        if (next.has(mod.id)) next.delete(mod.id);
                        else next.add(mod.id);
                      } else {
                        return new Set([mod.id]);
                      }
                      return next;
                    });
                  }}
                  onToggle={(active) => toggleModById(mod.id, active)}
                  onDeleteRequest={() => setDeleteConfirm(mod.id)}
                  onDeleteConfirm={() => {
                    deleteModById(mod.id, true);
                    setDeleteConfirm(null);
                  }}
                  onDeleteCancel={() => setDeleteConfirm(null)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {(tab === "Performance" || cachedTabs.current.has("Performance")) && (
        <div hidden={tab !== "Performance"}>
          <Button variant="info" size="sm" onClick={() => navigate("tools")}>
            Open Performance tools
          </Button>
        </div>
      )}

      {(tab === "Settings" || cachedTabs.current.has("Settings")) && (
        <div hidden={tab !== "Settings"}>
          <div className="surface" style={{ padding: 20 }}>
            <Button variant="info" onClick={() => saveCurrentToProfile(profileId)}>
              Save current active mods to this profile
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={confirmKill}
        title="Stop active profile?"
        onClose={() => setConfirmKill(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmKill(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setLaunchState(profileId, "idle");
                setConfirmKill(false);
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
          Clears running state in ManageNG. Restart BeamNG.drive to reload mods.
        </p>
      </Dialog>
    </>
  );
}

export function ProfileDetailTitleActions({ profileId }: { profileId: string }) {
  const { launchStates, applyProfileById, setLaunchState, stats } = useApp();
  const launchState = launchStates[profileId] ?? "idle";
  const [confirmKill, setConfirmKill] = useState(false);

  return (
    <>
      {launchState === "idle" && (
        <Button variant="success" size="sm" onClick={() => applyProfileById(profileId)}>
          ▶ Play
        </Button>
      )}
      {launchState === "launching" && (
        <Button variant="warning" size="sm" loading>
          Launching
        </Button>
      )}
      {launchState === "running" && (
        <>
          <Button variant="danger" size="sm" onClick={() => setConfirmKill(true)}>
            Kill
          </Button>
          <Button variant="success" size="sm" onClick={() => applyProfileById(profileId)}>
            Start again
          </Button>
        </>
      )}
      <Button
        variant="info"
        size="sm"
        onClick={async () => {
          if (stats?.userFolder) {
            const { invoke } = await import("@tauri-apps/api/core");
            await invoke("plugin:opener|open_path", { path: stats.userFolder });
          }
        }}
      >
        Open folder
      </Button>
      <Dialog
        open={confirmKill}
        title="Stop active profile?"
        onClose={() => setConfirmKill(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmKill(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setLaunchState(profileId, "idle");
                setConfirmKill(false);
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
          Clears running state in ManageNG.
        </p>
      </Dialog>
    </>
  );
}

function ModRow({
  mod,
  selected,
  conflicts,
  deleteConfirm,
  onSelect,
  onToggle,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  mod: ModInfo;
  selected: boolean;
  conflicts: string[];
  deleteConfirm: boolean;
  onSelect: (multi: boolean) => void;
  onToggle: (active: boolean) => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  const quickDelete = getSettings().quickDelete;

  return (
    <div
      className={`content-row ${selected ? "selected" : ""} ${!mod.active ? "disabled" : ""}`}
      onClick={(e) => onSelect(e.ctrlKey || e.metaKey)}
    >
      <div
        className={`toggle ${mod.active ? "on" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(!mod.active);
        }}
      />
      <div className={`content-thumb ${!mod.active ? "grayscale" : ""}`}>
        {mod.isBroken ? "⚠" : "🚗"}
      </div>
      <div className="content-meta">
        <div className="content-title">{mod.title}</div>
        <div className="content-desc">
          {mod.author && `${mod.author} · `}
          {formatBytes(mod.sizeBytes)} · {formatDate(mod.dateInstalled)}
        </div>
        <div className="content-tags">
          <span className="tag">{sourceLabel(mod.source)}</span>
          {mod.hasUpdate && <span className="tag badge-warning">Update</span>}
          {mod.isBroken && <span className="tag" style={{ color: "var(--danger)" }}>Broken</span>}
        </div>
      </div>
      {conflicts.length > 0 && (
        <Button variant="ghost" size="compact" title={conflicts.join("\n")}>
          ⚠
        </Button>
      )}
      {deleteConfirm ? (
        <>
          <Button
            variant="danger"
            size="compact"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteConfirm();
            }}
          >
            ✓
          </Button>
          <Button
            variant="ghost"
            size="compact"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCancel();
            }}
          >
            ✕
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          size="compact"
          onClick={(e) => {
            e.stopPropagation();
            if (quickDelete && e.shiftKey) onDeleteConfirm();
            else onDeleteRequest();
          }}
        >
          🗑
        </Button>
      )}
    </div>
  );
}
