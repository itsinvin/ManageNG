import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppProvider";
import { useNavigation } from "../navigation/NavigationProvider";
import { Button, ErrorAlert, Skeleton } from "../components/ui/primitives";
import type { RepoMod } from "../types";

export function BrowsePage() {
  const { state } = useNavigation();
  const nav = useNavigation();
  const installingFor = state.installingFor;
  const { searchRepository, installFromRepo, pushToast } = useApp();

  const [query, setQuery] = useState("");
  const [mods, setMods] = useState<RepoMod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [installing, setInstalling] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (q: string, p: number, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const results = await searchRepository(q, p);
        setMods((prev) => (append ? [...prev, ...results] : results));
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [searchRepository]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load(query, 1, false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, load]);

  useEffect(() => {
    if (!sentinel.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !loading && mods.length > 0) {
        const next = page + 1;
        setPage(next);
        load(query, next, true);
      }
    });
    obs.observe(sentinel.current);
    return () => obs.disconnect();
  }, [loading, mods.length, page, query, load]);

  async function handleInstall(mod: RepoMod) {
    setInstalling(mod.id);
    try {
      await installFromRepo(mod.url);
      if (installingFor) {
        pushToast({ title: "Installed to profile", message: mod.title, variant: "success" });
        nav.navigate("profile-detail", { id: installingFor }, { profileTab: "Packages" });
      }
    } finally {
      setInstalling(null);
    }
  }

  return (
    <div>
      {installingFor && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          Installing for profile — compatible packages prioritized
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          className="search-input"
          style={{ flex: 1, minWidth: 240 }}
          placeholder="Search BeamNG repository… (Esc to clear)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
        />
        <Button variant="info" size="sm" onClick={() => load(query, 1, false)}>
          Search
        </Button>
      </div>

      {error && <ErrorAlert title="Failed to load repository" message={error} />}

      <div className="card-grid">
        {mods.map((mod) => (
          <div key={mod.id} className="surface surface-hover" style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                height: 120,
                background: "var(--list-hover)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {mod.thumbnailUrl ? (
                <img src={mod.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 40, opacity: 0.4 }}>🚗</span>
              )}
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{mod.title}</div>
              <div style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>by {mod.author}</div>
              <Button
                variant="success"
                size="sm"
                style={{ width: "100%", marginTop: 12 }}
                loading={installing === mod.id}
                onClick={() => handleInstall(mod)}
              >
                Install
              </Button>
            </div>
          </div>
        ))}

        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`sk-${i}`} className="surface" style={{ padding: 14 }}>
              <Skeleton height={120} />
              <div style={{ marginTop: 8 }}>
                <Skeleton height={16} width="70%" />
              </div>
            </div>
          ))}
      </div>

      <div ref={sentinel} style={{ height: 1 }} />

      {!loading && mods.length === 0 && !error && (
        <div className="empty-state" style={{ minHeight: 200 }}>
          <p style={{ color: "var(--muted-foreground)" }}>Search or browse the official BeamNG repository</p>
        </div>
      )}
    </div>
  );
}
