import { loadJson, saveJson } from "./persistence";

export interface AppSettings {
  theme: string;
  quickDelete: boolean;
  hideOnLaunch: boolean;
  quitOnClose: boolean;
  hideUsernames: boolean;
  enabledFirst: boolean;
  sortByPackages: "name" | "filename" | "modified" | "size";
  profilesView: "cards" | "list";
}

const DEFAULTS: AppSettings = {
  theme: "dark",
  quickDelete: false,
  hideOnLaunch: false,
  quitOnClose: false,
  hideUsernames: false,
  enabledFirst: true,
  sortByPackages: "name",
  profilesView: "cards",
};

let cache = loadJson("settings", DEFAULTS);
let timer: ReturnType<typeof setTimeout> | null = null;

export function getSettings(): AppSettings {
  return cache;
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  cache = { ...cache, ...patch };
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => saveJson("settings", cache), 5000);
  return cache;
}

export function flushSettings(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  saveJson("settings", cache);
}
