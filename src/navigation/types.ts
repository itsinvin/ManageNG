export type RouteId =
  | "home"
  | "profiles"
  | "profile-detail"
  | "browse"
  | "browse-detail"
  | "tools"
  | "beamng-repo";

export interface Breadcrumb {
  label: string;
  route: RouteId;
  params?: Record<string, string>;
}

export interface NavState {
  route: RouteId;
  params: Record<string, string>;
  profileTab?: string;
  installingFor?: string;
}

export interface HistoryEntry {
  route: RouteId;
  params: Record<string, string>;
  profileTab?: string;
  installingFor?: string;
}
