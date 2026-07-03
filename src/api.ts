import { invoke } from "@tauri-apps/api/core";
import type {
  BeamNgPaths,
  CleanupPreview,
  CleanupResult,
  DashboardStats,
  ModConflict,
  ModInfo,
  Profile,
  ProfileStore,
  RepoMod,
  RepoSearchResult,
} from "./types";

export async function getPaths(): Promise<BeamNgPaths | null> {
  return invoke("get_paths");
}

export async function detectPaths(): Promise<BeamNgPaths> {
  return invoke("detect_paths");
}

export async function setUserFolder(path: string): Promise<BeamNgPaths> {
  return invoke("set_user_folder", { path });
}

export async function getMods(): Promise<ModInfo[]> {
  return invoke("get_mods");
}

export async function getDashboard(): Promise<DashboardStats> {
  return invoke("get_dashboard");
}

export async function toggleMod(modId: string, active: boolean): Promise<ModInfo> {
  return invoke("toggle_mod", { modId, active });
}

export async function toggleAllMods(active: boolean): Promise<number> {
  return invoke("toggle_all_mods", { active });
}

export async function getConflicts(): Promise<ModConflict[]> {
  return invoke("get_conflicts");
}

export async function previewDeepClean(): Promise<CleanupPreview> {
  return invoke("preview_deep_clean");
}

export async function runDeepClean(): Promise<CleanupResult> {
  return invoke("run_deep_clean_cmd");
}

export async function searchRepo(query: string, page = 1): Promise<RepoSearchResult> {
  return invoke("search_repo", { query, page });
}

export async function getRepoMod(url: string): Promise<RepoMod> {
  return invoke("get_repo_mod", { url });
}

export async function downloadRepoMod(url: string): Promise<ModInfo> {
  return invoke("download_repo_mod", { url });
}

export async function installModFromFile(path: string): Promise<ModInfo> {
  return invoke("install_mod_from_file", { path });
}

export async function removeMod(modId: string, deleteFile: boolean): Promise<void> {
  return invoke("remove_mod", { modId, deleteFile });
}

export async function checkUpdates(): Promise<ModInfo[]> {
  return invoke("check_updates");
}

export async function listProfiles(): Promise<ProfileStore> {
  return invoke("list_profiles");
}

export async function createProfile(
  name: string,
  description: string,
  icon?: string
): Promise<Profile> {
  return invoke("create_profile_cmd", { name, description, icon });
}

export async function deleteProfile(id: string): Promise<void> {
  return invoke("delete_profile_cmd", { id });
}

export async function applyProfile(id: string): Promise<ModInfo[]> {
  return invoke("apply_profile", { id });
}

export async function saveProfileFromCurrent(id: string): Promise<Profile> {
  return invoke("save_profile_from_current", { id });
}

export async function getAppVersion(): Promise<string> {
  return invoke("get_app_version");
}

export async function getStorageBreakdown(): Promise<Record<string, number>> {
  return invoke("get_storage_breakdown");
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
