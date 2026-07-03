import { useState } from "react";
import { downloadRepoMod, searchRepo } from "../api";
import type { RepoMod } from "../types";

interface Props {
  onModInstalled: () => void;
}

export function Repository({ onModInstalled }: Props) {
  const [query, setQuery] = useState("");
  const [mods, setMods] = useState<RepoMod[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searched, setSearched] = useState(false);

  async function handleSearch(newPage = 1) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await searchRepo(query, newPage);
      setMods(result.mods);
      setPage(newPage);
      setSearched(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(mod: RepoMod) {
    setDownloading(mod.id);
    setError(null);
    setSuccess(null);
    try {
      const installed = await downloadRepoMod(mod.url);
      setSuccess(`Installed "${installed.title}" successfully!`);
      onModInstalled();
    } catch (e) {
      setError(`Failed to download "${mod.title}": ${e}`);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <>
      <div className="toolbar">
        <div className="search-bar">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Browse the official BeamNG repository..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(1)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => handleSearch(1)} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}
      {success && <div className="success-banner">✓ {success}</div>}

      {!searched && !loading && (
        <div className="empty-state">
          <div className="icon">🏪</div>
          <h3>Official BeamNG Repository</h3>
          <p>
            Search and download mods directly from beamng.com/resources without leaving ManageNG.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => handleSearch(1)}>
            Browse Latest Mods
          </button>
        </div>
      )}

      {loading && (
        <div className="loading">
          <div className="spinner" />
          Loading repository...
        </div>
      )}

      {searched && !loading && mods.length === 0 && (
        <div className="empty-state">
          <div className="icon">🔍</div>
          <h3>No results found</h3>
          <p>Try a different search term.</p>
        </div>
      )}

      {mods.length > 0 && (
        <>
          <div className="repo-grid">
            {mods.map((mod) => (
              <div className="repo-card" key={mod.id}>
                <div className="repo-thumb">
                  {mod.thumbnailUrl ? (
                    <img src={mod.thumbnailUrl} alt={mod.title} loading="lazy" />
                  ) : (
                    "🚗"
                  )}
                </div>
                <div className="repo-body">
                  <div className="repo-title">{mod.title}</div>
                  <div className="repo-author">by {mod.author}</div>
                  {mod.description && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginTop: 8,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {mod.description}
                    </p>
                  )}
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 12, width: "100%" }}
                    onClick={() => handleDownload(mod)}
                    disabled={downloading === mod.id}
                  >
                    {downloading === mod.id ? "Downloading..." : "Download & Install"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => handleSearch(page - 1)}
            >
              ← Previous
            </button>
            <span style={{ padding: "6px 12px", color: "var(--text-muted)" }}>Page {page}</span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={loading}
              onClick={() => handleSearch(page + 1)}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </>
  );
}
