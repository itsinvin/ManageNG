import { useMemo } from "react";
import { useApp } from "../store/AppProvider";
import { useNavigation } from "../navigation/NavigationProvider";
import { Button } from "../components/ui/primitives";
import { formatBytes } from "../utils";
import type { Profile } from "../types";

function ProfileCard({
  profile,
  running,
  onPlay,
  onView,
}: {
  profile: Profile;
  running: boolean;
  onPlay: () => void;
  onView: () => void;
}) {
  return (
    <div className={`surface surface-hover ${running ? "surface-running" : ""}`} style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 28 }}>{profile.icon ?? "▦"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{profile.name}</div>
          <div style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", marginTop: 4 }}>
            {profile.description || "No description"}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <span className="tag">BeamNG.drive</span>
            <span className="tag">{profile.modIds.length} packages</span>
            {running && <span className="tag badge-success">Running</span>}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
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

export function HomePage() {
  const {
    profiles,
    stats,
    mods,
    loading,
    refreshing,
    launchStates,
    activeProfileId,
    applyProfileById,
    refresh,
  } = useApp();
  const { navigate } = useNavigation();

  const profileList = profiles?.profiles ?? [];
  const lastPlayed = activeProfileId
    ? profileList.find((p) => p.id === activeProfileId)
    : profileList[0];
  const isRunning = lastPlayed ? launchStates[lastPlayed.id] === "running" : false;

  const topProfiles = useMemo(() => profileList.slice(0, 6), [profileList]);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="skeleton" style={{ width: 200, height: 24 }} />
      </div>
    );
  }

  if (profileList.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-logo-box">
          <img src="/icon.png" alt="" />
        </div>
        <h1 className="empty-title">Welcome to ManageNG</h1>
        <p className="empty-sub">
          Create a profile to organize your BeamNG mod setups — rock crawling, multiplayer, or pure vanilla.
        </p>
        <Button
          variant="success"
          onClick={() => navigate("profiles")}
        >
          + Create profile
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div
        className="section-gap"
        style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}
      >
        <div>
          <h1 className="display-xl" style={{ marginBottom: 8 }}>
            Ready to drive
          </h1>
          <p style={{ color: "var(--muted-foreground)", marginBottom: 16 }}>
            {stats?.totalMods ?? 0} packages across {profileList.length} profiles
          </p>
        </div>

        <div
          className="surface"
          style={{
            padding: 16,
            borderColor: "var(--border-primary)",
            background: "var(--sidebar)",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: 8 }}>
            Quick Play
          </div>
          <div style={{ fontWeight: 600, fontSize: "1.125rem" }}>
            {lastPlayed?.name ?? "Select a profile"}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <span className="tag">BeamNG.drive</span>
            {stats?.gameVersion && <span className="tag">{stats.gameVersion}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Button
              variant="success"
              size="sm"
              disabled={!lastPlayed || isRunning}
              loading={lastPlayed ? launchStates[lastPlayed.id] === "launching" : false}
              onClick={() => lastPlayed && applyProfileById(lastPlayed.id)}
            >
              ▶ Play
            </Button>
            <Button
              variant="info"
              size="sm"
              disabled={!lastPlayed}
              onClick={() =>
                lastPlayed && navigate("profile-detail", { id: lastPlayed.id })
              }
            >
              View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={refreshing ? "spin-once" : ""}
              onClick={() => refresh()}
            >
              ↻
            </Button>
          </div>
        </div>
      </div>

      <div className="stat-grid section-gap">
        <div className="surface" style={{ padding: 16 }}>
          <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Profiles</div>
          <div className="display-lg">{profileList.length}</div>
        </div>
        <div className="surface" style={{ padding: 16 }}>
          <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Active packages</div>
          <div className="display-lg">{stats?.activeMods ?? 0}</div>
        </div>
        <div className="surface" style={{ padding: 16 }}>
          <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Storage used</div>
          <div className="display-lg">{formatBytes(stats?.totalSizeBytes ?? 0)}</div>
        </div>
      </div>

      <section className="section-gap">
        <div className="section-title">Your profiles</div>
        <div className="card-grid">
          {topProfiles.map((p) => (
            <div key={p.id} style={{ cursor: "pointer" }}>
              <ProfileCard
                profile={p}
                running={launchStates[p.id] === "running"}
                onPlay={() => applyProfileById(p.id)}
                onView={() => navigate("profile-detail", { id: p.id })}
              />
            </div>
          ))}
        </div>
      </section>

      {mods.length > 0 && (
        <section>
          <div className="section-title">Recommended from Repository</div>
          <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
            Browse the official BeamNG repository to expand your collection.
          </p>
          <Button variant="info" size="sm" style={{ marginTop: 12 }} onClick={() => navigate("browse")}>
            Browse packages
          </Button>
        </section>
      )}
    </div>
  );
}
