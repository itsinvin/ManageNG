import { useEffect, useMemo, useState } from "react";
import { useApp } from "../store/AppProvider";
import { useNavigation } from "../navigation/NavigationProvider";
import { Button } from "../components/ui/primitives";
import { Dialog } from "../components/shell/AppShell";
import { getSettings, updateSettings } from "../store/settings";
import type { Profile } from "../types";

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function ProfilesPage() {
  const {
    profiles,
    launchStates,
    applyProfileById,
    createProfileByName,
    detectBeamNGPath,
    pathConfigured,
  } = useApp();
  const { navigate } = useNavigation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [view, setView] = useState(getSettings().profilesView);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const list = profiles?.profiles ?? [];
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [list, debouncedSearch]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const p = await createProfileByName(newName.trim(), newDesc.trim());
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      navigate("profile-detail", { id: p.id });
    } finally {
      setCreating(false);
    }
  }

  async function handleImport() {
    if (!pathConfigured) {
      await detectBeamNGPath();
    }
    navigate("profile-detail", { id: list[0]?.id ?? "" });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          className="search-input"
          placeholder="Search profiles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="success" size="sm" onClick={() => setShowCreate(true)}>
          + Create
        </Button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <Button
            variant={view === "cards" ? "primary" : "ghost"}
            size="sm"
            onClick={() => {
              setView("cards");
              updateSettings({ profilesView: "cards" });
            }}
          >
            Cards
          </Button>
          <Button
            variant={view === "list" ? "primary" : "ghost"}
            size="sm"
            onClick={() => {
              setView("list");
              updateSettings({ profilesView: "list" });
            }}
          >
            List
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-logo-box">
            <img src="/icon.png" alt="" />
          </div>
          <h2 className="empty-title" style={{ fontSize: "1.25rem" }}>
            {list.length === 0 ? "No profiles yet" : "No results"}
          </h2>
          <p className="empty-sub">
            {list.length === 0
              ? "Create a profile to save mod setups for different play styles."
              : "Try a different search term."}
          </p>
          {list.length === 0 && (
            <Button variant="success" onClick={() => setShowCreate(true)}>
              + Create profile
            </Button>
          )}
        </div>
      ) : view === "cards" ? (
        <div className="card-grid">
          {filtered.map((p) => (
            <ProfileCardItem
              key={p.id}
              profile={p}
              running={launchStates[p.id] === "running"}
              onPlay={() => applyProfileById(p.id)}
              onView={() => navigate("profile-detail", { id: p.id })}
              onDoubleLaunch={() => applyProfileById(p.id)}
            />
          ))}
        </div>
      ) : (
        <div className="surface" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Controls</th>
                <th>Name</th>
                <th>Packages</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} onDoubleClick={() => applyProfileById(p.id)}>
                  <td>
                    <Button variant="success" size="compact" onClick={() => applyProfileById(p.id)}>
                      ▶
                    </Button>
                    <Button
                      variant="info"
                      size="compact"
                      style={{ marginLeft: 4 }}
                      onClick={() => navigate("profile-detail", { id: p.id })}
                    >
                      View
                    </Button>
                  </td>
                  <td>{p.name}</td>
                  <td>{p.modIds.length}</td>
                  <td>
                    {launchStates[p.id] === "running" ? (
                      <span className="tag badge-success">Running</span>
                    ) : (
                      <span className="tag">Idle</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section
        style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="section-title">Import existing setup</div>
        <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: 12 }}>
          Auto-detect your BeamNG user folder and import currently installed packages into a profile.
        </p>
        <Button variant="info" size="sm" onClick={handleImport}>
          Detect & import
        </Button>
      </section>

      <Dialog
        open={showCreate}
        title="Create profile"
        onClose={() => setShowCreate(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button variant="success" loading={creating} onClick={handleCreate}>
              Create
            </Button>
          </>
        }
      >
        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Name</span>
          <input
            className="search-input"
            style={{ width: "100%", marginTop: 4 }}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
        </label>
        <label style={{ display: "block" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Description</span>
          <input
            className="search-input"
            style={{ width: "100%", marginTop: 4 }}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
        </label>
      </Dialog>
    </div>
  );
}

function ProfileCardItem({
  profile,
  running,
  onPlay,
  onView,
  onDoubleLaunch,
}: {
  profile: Profile;
  running: boolean;
  onPlay: () => void;
  onView: () => void;
  onDoubleLaunch: () => void;
}) {
  return (
    <div
      className={`surface surface-hover ${running ? "surface-running" : ""}`}
      style={{ padding: 16 }}
      onDoubleClick={onDoubleLaunch}
    >
      <div style={{ fontSize: 24, marginBottom: 8 }}>{profile.icon ?? "▦"}</div>
      <div style={{ fontWeight: 600 }}>{profile.name}</div>
      <div style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", marginTop: 4 }}>
        {profile.modIds.length} packages
      </div>
      {running && (
        <span className="tag badge-success" style={{ marginTop: 8 }}>
          Running
        </span>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button variant="success" size="sm" onClick={onPlay}>
          ▶ Play
        </Button>
        <Button variant="info" size="sm" onClick={onView}>
          View
        </Button>
      </div>
    </div>
  );
}
