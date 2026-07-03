export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "high":
      return "var(--danger)";
    case "medium":
      return "var(--warning)";
    default:
      return "var(--text-muted)";
  }
}

export function sourceLabel(source: string): string {
  switch (source) {
    case "repository":
      return "Repository";
    case "manual":
      return "Manual";
    default:
      return "Unknown";
  }
}
