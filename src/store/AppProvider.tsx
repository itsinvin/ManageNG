import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyProfile,
  checkUpdates,
  createProfile,
  deleteProfile,
  detectPaths,
  getAppVersion,
  getConflicts,
  getDashboard,
  getMods,
  getPaths,
  getStorageBreakdown,
  listProfiles,
  removeMod,
  saveProfileFromCurrent,
  setUserFolder,
  toggleMod,
  downloadRepoMod,
  installModFromFile,
  searchRepo,
} from "../api";
import type {
  DashboardStats,
  ModConflict,
  ModInfo,
  Profile,
  ProfileStore,
  RepoMod,
} from "../types";

export type LaunchState = "idle" | "launching" | "running" | "stopping";

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  variant: "info" | "success" | "warning" | "danger";
  progress?: number;
}

interface AppContextValue {
  mods: ModInfo[];
  stats: DashboardStats | null;
  storage: Record<string, number> | null;
  profiles: ProfileStore | null;
  conflicts: ModConflict[];
  updates: ModInfo[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  pathConfigured: boolean;
  version: string;
  activeProfileId: string | null;
  launchStates: Record<string, LaunchState>;
  recentProfileIds: string[];
  toasts: ToastItem[];
  refresh: () => Promise<void>;
  refreshConflicts: () => Promise<void>;
  toggleModById: (id: string, active: boolean) => Promise<void>;
  deleteModById: (id: string, deleteFile: boolean) => Promise<void>;
  applyProfileById: (id: string) => Promise<void>;
  createProfileByName: (name: string, description: string) => Promise<Profile>;
  deleteProfileById: (id: string) => Promise<void>;
  saveCurrentToProfile: (id: string) => Promise<void>;
  setBeamNGPath: (path: string) => Promise<void>;
  detectBeamNGPath: () => Promise<void>;
  installFromRepo: (url: string) => Promise<void>;
  installFromFiles: (paths: string[]) => Promise<void>;
  searchRepository: (query: string, page?: number) => Promise<RepoMod[]>;
  pushToast: (toast: Omit<ToastItem, "id">) => string;
  dismissToast: (id: string) => void;
  setLaunchState: (profileId: string, state: LaunchState) => void;
  getProfile: (id: string) => Profile | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mods, setMods] = useState<ModInfo[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [storage, setStorage] = useState<Record<string, number> | null>(null);
  const [profiles, setProfiles] = useState<ProfileStore | null>(null);
  const [conflicts, setConflicts] = useState<ModConflict[]>([]);
  const [updates, setUpdates] = useState<ModInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathConfigured, setPathConfigured] = useState(true);
  const [version, setVersion] = useState("0.1.0");
  const [launchStates, setLaunchStates] = useState<Record<string, LaunchState>>({});
  const [recentProfileIds, setRecentProfileIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const activeProfileId = profiles?.activeProfileId ?? null;

  const pushToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { ...toast, id }]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const refreshConflicts = useCallback(async () => {
    try {
      setConflicts(await getConflicts());
    } catch {
      setConflicts([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await detectPaths();
      setPathConfigured(true);
      const [modsData, dashData, storageData, profileData, updateData] = await Promise.all([
        getMods(),
        getDashboard(),
        getStorageBreakdown().catch(() => null),
        listProfiles(),
        checkUpdates().catch(() => [] as ModInfo[]),
      ]);
      setMods(modsData);
      setStats(dashData);
      setStorage(storageData);
      setProfiles(profileData);
      setUpdates(updateData);
      await refreshConflicts();
    } catch (e) {
      setPathConfigured(false);
      setError(String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshConflicts]);

  useEffect(() => {
    getAppVersion().then(setVersion).catch(() => {});
    refresh();
  }, [refresh]);

  const toggleModById = useCallback(
    async (id: string, active: boolean) => {
      await toggleMod(id, active);
      await refresh();
      await refreshConflicts();
    },
    [refresh, refreshConflicts]
  );

  const deleteModById = useCallback(
    async (id: string, deleteFile: boolean) => {
      await removeMod(id, deleteFile);
      await refresh();
      await refreshConflicts();
    },
    [refresh, refreshConflicts]
  );

  const applyProfileById = useCallback(
    async (id: string) => {
      setLaunchStates((s) => ({ ...s, [id]: "launching" }));
      try {
        await applyProfile(id);
        setLaunchStates((s) => ({ ...s, [id]: "running" }));
        setRecentProfileIds((r) => [id, ...r.filter((x) => x !== id)].slice(0, 3));
        await refresh();
      } catch (e) {
        setLaunchStates((s) => ({ ...s, [id]: "idle" }));
        pushToast({ title: "Failed to apply profile", message: String(e), variant: "danger" });
        throw e;
      }
    },
    [refresh, pushToast]
  );

  const createProfileByName = useCallback(
    async (name: string, description: string) => {
      const p = await createProfile(name, description, "🎯");
      setProfiles(await listProfiles());
      return p;
    },
    []
  );

  const deleteProfileById = useCallback(async (id: string) => {
    await deleteProfile(id);
    setProfiles(await listProfiles());
    setLaunchStates((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
  }, []);

  const saveCurrentToProfile = useCallback(async (id: string) => {
    await saveProfileFromCurrent(id);
    setProfiles(await listProfiles());
  }, []);

  const setBeamNGPath = useCallback(
    async (path: string) => {
      await setUserFolder(path);
      await refresh();
    },
    [refresh]
  );

  const detectBeamNGPath = useCallback(async () => {
    await detectPaths();
    await refresh();
  }, [refresh]);

  const installFromRepo = useCallback(
    async (url: string) => {
      const tid = pushToast({ title: "Installing package…", variant: "info", progress: 30 });
      try {
        const mod = await downloadRepoMod(url);
        dismissToast(tid);
        pushToast({ title: "Installed", message: mod.title, variant: "success" });
        await refresh();
      } catch (e) {
        dismissToast(tid);
        pushToast({ title: "Install failed", message: String(e), variant: "danger" });
        throw e;
      }
    },
    [pushToast, dismissToast, refresh]
  );

  const installFromFiles = useCallback(
    async (paths: string[]) => {
      for (const p of paths) {
        const tid = pushToast({ title: "Installing…", message: p.split("/").pop(), variant: "info" });
        try {
          await installModFromFile(p);
          dismissToast(tid);
          pushToast({ title: "Installed", message: p.split("/").pop(), variant: "success" });
        } catch (e) {
          dismissToast(tid);
          pushToast({ title: "Install failed", message: String(e), variant: "danger" });
        }
      }
      await refresh();
    },
    [pushToast, dismissToast, refresh]
  );

  const searchRepository = useCallback(async (query: string, page = 1) => {
    const result = await searchRepo(query, page);
    return result.mods;
  }, []);

  const setLaunchState = useCallback((profileId: string, state: LaunchState) => {
    setLaunchStates((s) => ({ ...s, [profileId]: state }));
  }, []);

  const getProfile = useCallback(
    (id: string) => profiles?.profiles.find((p) => p.id === id),
    [profiles]
  );

  const value = useMemo(
    () => ({
      mods,
      stats,
      storage,
      profiles,
      conflicts,
      updates,
      loading,
      refreshing,
      error,
      pathConfigured,
      version,
      activeProfileId,
      launchStates,
      recentProfileIds,
      toasts,
      refresh,
      refreshConflicts,
      toggleModById,
      deleteModById,
      applyProfileById,
      createProfileByName,
      deleteProfileById,
      saveCurrentToProfile,
      setBeamNGPath,
      detectBeamNGPath,
      installFromRepo,
      installFromFiles,
      searchRepository,
      pushToast,
      dismissToast,
      setLaunchState,
      getProfile,
    }),
    [
      mods,
      stats,
      storage,
      profiles,
      conflicts,
      updates,
      loading,
      refreshing,
      error,
      pathConfigured,
      version,
      activeProfileId,
      launchStates,
      recentProfileIds,
      toasts,
      refresh,
      refreshConflicts,
      toggleModById,
      deleteModById,
      applyProfileById,
      createProfileByName,
      deleteProfileById,
      saveCurrentToProfile,
      setBeamNGPath,
      detectBeamNGPath,
      installFromRepo,
      installFromFiles,
      searchRepository,
      pushToast,
      dismissToast,
      setLaunchState,
      getProfile,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export async function openDataFolder() {
  const paths = await getPaths();
  if (paths?.userFolder) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("plugin:opener|open_path", { path: paths.userFolder });
  }
}
