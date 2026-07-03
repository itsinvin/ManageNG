export interface BeamNgPaths {
  userFolder: string;
  modsFolder: string;
  dbPath: string;
  gameVersion: string | null;
  isCustomPath: boolean;
}

export interface ModInfo {
  id: string;
  filename: string;
  title: string;
  author: string | null;
  active: boolean;
  sizeBytes: number;
  source: "repository" | "manual" | "unknown";
  dateInstalled: string | null;
  isBroken: boolean;
  isOutdated: boolean;
  version: string | null;
  hasUpdate: boolean;
  path: string;
}

export interface DashboardStats {
  totalMods: number;
  activeMods: number;
  inactiveMods: number;
  totalSizeBytes: number;
  activeSizeBytes: number;
  brokenMods: number;
  outdatedMods: number;
  userFolder: string;
  gameVersion: string | null;
}

export interface ModConflict {
  filePath: string;
  mods: string[];
  severity: "low" | "medium" | "high";
}

export interface CleanupTarget {
  path: string;
  label: string;
  sizeBytes: number;
  fileCount: number;
  category: string;
}

export interface CleanupPreview {
  paths: CleanupTarget[];
  totalBytes: number;
  fileCount: number;
}

export interface CleanupResult {
  filesRemoved: number;
  bytesFreed: number;
  pathsCleaned: string[];
}

export interface RepoMod {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  rating: number | null;
  downloads: number | null;
  url: string;
  thumbnailUrl: string | null;
  updateDate: string | null;
}

export interface RepoSearchResult {
  mods: RepoMod[];
  query: string;
  page: number;
  totalFound: number;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  modIds: string[];
  createdAt: string;
  updatedAt: string;
  icon: string | null;
}

export interface ProfileStore {
  profiles: Profile[];
  activeProfileId: string | null;
}

export type TabId = "dashboard" | "mods" | "repository" | "profiles" | "tools";

export type ModFilter = "all" | "active" | "inactive" | "broken" | "outdated" | "updates";
