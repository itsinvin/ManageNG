const PREFIX = "manageng:";

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function loadNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(PREFIX + key);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function saveNumber(key: string, value: number): void {
  localStorage.setItem(PREFIX + key, String(value));
}
