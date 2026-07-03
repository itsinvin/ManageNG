import { useCallback, useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  detectPaths,
  getAppVersion,
  getDashboard,
  getMods,
  getStorageBreakdown,
  listProfiles,
  setUserFolder,
  toggleAllMods,
  toggleMod,
} from "./api";
import { Dashboard } from "./components/Dashboard";
import { ModList } from "./components/ModList";
import { Profiles } from "./components/Profiles";
import { Repository } from "./components/Repository";
import { Tools } from "./components/Tools";
import type {
  DashboardStats,
  ModFilter,
  ModInfo,
  ProfileStore,
  TabId,
} from "./types";
import "./styles/global.css";

const NAV_ITEMS: { id: TabId; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "mods", label: "Mods", icon: "📦" },
  { id: "repository", label: "Repository", icon: "🏪" },
  { id: "profiles", label: "Profiles", icon: "🎯" },
  { id: "tools", label: "Tools", icon: "🔧" },
];

const TAB_TITLES: Record<TabId, string> = {
  dashboard: "Dashboard",
  mods: "Mod Manager",
  repository: "Repository Browser",
  profiles: "Profiles",
  tools: "Performance Tools",
};

function App() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [mods, setMods] = useState<ModInfo[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [storage, setStorage] = useState<Record<string, number> | null>(null);
  const [profiles, setProfiles] = useState<ProfileStore | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ModFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState("0.1.0");
  const [pathConfigured, setPathConfigured] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await detectPaths();
      setPathConfigured(true);
      const [modsData, dashData, storageData, profileData] = await Promise.all([
        getMods(),
        getDashboard(),
        getStorageBreakdown().catch(() => null),
        listProfiles(),
      ]);
      setMods(modsData);
      setStats(dashData);
      setStorage(storageData);
      setProfiles(profileData);
    } catch (e) {
      setPathConfigured(false);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getAppVersion().then(setVersion).catch(() => {});
    refreshData();
  }, [refreshData]);

  async function handleToggle(modId: string, active: boolean) {
    try {
      await toggleMod(modId, active);
      await refreshData();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleToggleAll(active: boolean) {
    try {
      await toggleAllMods(active);
      await refreshData();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleSetPath() {
    const selected = await open({ directory: true, multiple: false });
    if (selected) {
      try {
        await setUserFolder(selected as string);
        await refreshData();
      } catch (e) {
        setError(String(e));
      }
    }
  }

  async function handleDetectPath() {
    try {
      await detectPaths();
      await refreshData();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>
            Manage<span>NG</span>
          </h1>
          <p>BeamNG.drive Mod Manager</p>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${tab === item.id ? "active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">v{version}</div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <h2>{TAB_TITLES[tab]}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {!pathConfigured && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={handleDetectPath}>
                  Auto-Detect
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSetPath}>
                  Set User Folder
                </button>
              </>
            )}
            <button className="btn btn-secondary btn-sm" onClick={refreshData}>
              ↻ Refresh
            </button>
          </div>
        </header>

        <div className="page-body">
          {error && !pathConfigured && (
            <div className="error-banner">
              ⚠️ {error}
              <span style={{ marginLeft: 8, fontSize: 12 }}>
                Launch BeamNG.drive once to create your mods folder, or set a custom path.
              </span>
            </div>
          )}

          {tab === "dashboard" && (
            <Dashboard stats={stats} mods={mods} storage={storage} loading={loading} />
          )}
          {tab === "mods" && (
            <ModList
              mods={mods}
              search={search}
              filter={filter}
              onSearchChange={setSearch}
              onFilterChange={setFilter}
              onToggle={handleToggle}
              onToggleAll={handleToggleAll}
              loading={loading}
            />
          )}
          {tab === "repository" && <Repository onModInstalled={refreshData} />}
          {tab === "profiles" && (
            <Profiles
              store={profiles}
              onRefresh={async () => setProfiles(await listProfiles())}
              onProfileApplied={refreshData}
              loading={loading}
            />
          )}
          {tab === "tools" && <Tools onRefresh={refreshData} />}
        </div>
      </main>
    </div>
  );
}

export default App;
