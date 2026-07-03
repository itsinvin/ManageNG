import { useMemo } from "react";
import { formatBytes, formatDate, sourceLabel } from "../utils";
import type { ModFilter, ModInfo } from "../types";

interface Props {
  mods: ModInfo[];
  search: string;
  filter: ModFilter;
  onSearchChange: (s: string) => void;
  onFilterChange: (f: ModFilter) => void;
  onToggle: (modId: string, active: boolean) => void;
  onToggleAll: (active: boolean) => void;
  loading: boolean;
}

const FILTERS: { id: ModFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
  { id: "broken", label: "Broken" },
  { id: "outdated", label: "Outdated" },
  { id: "updates", label: "Updates" },
];

export function ModList({
  mods,
  search,
  filter,
  onSearchChange,
  onFilterChange,
  onToggle,
  onToggleAll,
  loading,
}: Props) {
  const filtered = useMemo(() => {
    let result = mods;

    switch (filter) {
      case "active":
        result = result.filter((m) => m.active);
        break;
      case "inactive":
        result = result.filter((m) => !m.active);
        break;
      case "broken":
        result = result.filter((m) => m.isBroken);
        break;
      case "outdated":
        result = result.filter((m) => m.isOutdated);
        break;
      case "updates":
        result = result.filter((m) => m.hasUpdate);
        break;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.filename.toLowerCase().includes(q) ||
          m.author?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [mods, search, filter]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Scanning mods...
      </div>
    );
  }

  return (
    <>
      <div className="toolbar">
        <div className="search-bar">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search mods by name, author, or filename..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => onToggleAll(true)}>
          Enable All
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => onToggleAll(false)}>
          Disable All
        </button>
      </div>

      <div className="filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`filter-chip ${filter === f.id ? "active" : ""}`}
            onClick={() => onFilterChange(f.id)}
          >
            {f.label}
            {f.id === "all" && ` (${mods.length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📦</div>
          <h3>No mods found</h3>
          <p>
            {mods.length === 0
              ? "Install mods from the Repository tab or drop .zip files into your mods folder."
              : "Try adjusting your search or filters."}
          </p>
        </div>
      ) : (
        <div className="mod-list">
          {filtered.map((mod) => (
            <div
              key={mod.id}
              className={`mod-row ${!mod.active ? "inactive" : ""}`}
            >
              <div className="mod-icon">
                {mod.isBroken ? "⚠️" : mod.source === "repository" ? "🏪" : "📦"}
              </div>
              <div className="mod-info">
                <div className="mod-title">{mod.title}</div>
                <div className="mod-meta">
                  {mod.author && <span>{mod.author}</span>}
                  <span>{formatBytes(mod.sizeBytes)}</span>
                  <span>{formatDate(mod.dateInstalled)}</span>
                  <span className="badge badge-source">{sourceLabel(mod.source)}</span>
                  {mod.isBroken && <span className="badge badge-broken">Broken</span>}
                  {mod.hasUpdate && <span className="badge badge-update">Update</span>}
                  {mod.isOutdated && <span className="badge badge-broken">Outdated</span>}
                </div>
              </div>
              <span className={`badge ${mod.active ? "badge-active" : "badge-inactive"}`}>
                {mod.active ? "Active" : "Inactive"}
              </span>
              <div
                className={`toggle ${mod.active ? "on" : ""}`}
                onClick={() => onToggle(mod.id, !mod.active)}
                role="switch"
                aria-checked={mod.active}
                title={mod.active ? "Disable mod" : "Enable mod"}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
