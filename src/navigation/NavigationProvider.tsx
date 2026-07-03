import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadJson, saveJson } from "../store/persistence";
import type { Breadcrumb, HistoryEntry, NavState, RouteId } from "./types";

interface NavigationContextValue {
  state: NavState;
  breadcrumbs: Breadcrumb[];
  navigate: (
    route: RouteId,
    params?: Record<string, string>,
    opts?: { replace?: boolean; profileTab?: string; installingFor?: string }
  ) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  setProfileTab: (tab: string) => void;
  pageVisible: boolean;
  setProfileNameResolver: (fn: (id: string) => string | undefined) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

const MAX_HISTORY = 32;

function buildBreadcrumbs(
  state: NavState,
  resolveProfile?: (id: string) => string | undefined,
  projectTitle?: string
): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [{ label: "Home", route: "home" }];
  switch (state.route) {
    case "home":
      return crumbs;
    case "profiles":
      crumbs.push({ label: "Profiles", route: "profiles" });
      return crumbs;
    case "profile-detail": {
      crumbs.push({ label: "Profiles", route: "profiles" });
      const name = state.params.id ? resolveProfile?.(state.params.id) : undefined;
      crumbs.push({
        label: name ?? "Profile",
        route: "profile-detail",
        params: state.params,
      });
      if (state.profileTab === "Packages") {
        crumbs.push({ label: "Packages", route: "profile-detail", params: state.params });
      }
      return crumbs;
    }
    case "browse":
    case "beamng-repo":
      crumbs.push({ label: "Browse", route: "browse" });
      return crumbs;
    case "browse-detail":
      crumbs.push({ label: "Browse", route: "browse" });
      crumbs.push({ label: projectTitle ?? "Project", route: "browse-detail", params: state.params });
      return crumbs;
    case "tools":
      crumbs.push({ label: "Tools", route: "tools" });
      return crumbs;
    default:
      return crumbs;
  }
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const saved = loadJson<{ history: HistoryEntry[]; index: number }>("nav", {
    history: [{ route: "home", params: {} }],
    index: 0,
  });

  const [history, setHistory] = useState<HistoryEntry[]>(saved.history);
  const [index, setIndex] = useState(saved.index);
  const [pageVisible, setPageVisible] = useState(true);
  const fadeTimer = useRef<number | null>(null);
  const profileResolver = useRef<(id: string) => string | undefined>(() => undefined);

  const state: NavState = useMemo(
    () => ({
      route: history[index]?.route ?? "home",
      params: history[index]?.params ?? {},
      profileTab: history[index]?.profileTab,
      installingFor: history[index]?.installingFor,
    }),
    [history, index]
  );

  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(state, (id) => profileResolver.current(id)),
    [state, history, index]
  );

  const setProfileNameResolver = useCallback((fn: (id: string) => string | undefined) => {
    profileResolver.current = fn;
  }, []);

  const persist = useCallback((h: HistoryEntry[], i: number) => {
    saveJson("nav", { state: h[i], history: h.slice(-MAX_HISTORY), index: Math.min(i, MAX_HISTORY - 1) });
  }, []);

  const navigate = useCallback(
    (
      route: RouteId,
      params: Record<string, string> = {},
      opts?: { replace?: boolean; profileTab?: string; installingFor?: string }
    ) => {
      const entry: HistoryEntry = {
        route,
        params,
        profileTab: opts?.profileTab,
        installingFor: opts?.installingFor,
      };

      setPageVisible(false);
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
      fadeTimer.current = window.setTimeout(() => {
        setHistory((prev) => {
          let next: HistoryEntry[];
          let nextIndex: number;
          if (opts?.replace) {
            next = [...prev.slice(0, index), entry];
            nextIndex = next.length - 1;
          } else {
            next = [...prev.slice(0, index + 1), entry].slice(-MAX_HISTORY);
            nextIndex = next.length - 1;
          }
          setIndex(nextIndex);
          persist(next, nextIndex);
          return next;
        });
        setPageVisible(true);
      }, 110);
    },
    [index, persist]
  );

  const goBack = useCallback(() => {
    if (index <= 0) return;
    setPageVisible(false);
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => {
      setIndex((i) => {
        const next = i - 1;
        persist(history, next);
        return next;
      });
      setPageVisible(true);
    }, 110);
  }, [history, index, persist]);

  const goForward = useCallback(() => {
    if (index >= history.length - 1) return;
    setPageVisible(false);
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => {
      setIndex((i) => {
        const next = i + 1;
        persist(history, next);
        return next;
      });
      setPageVisible(true);
    }, 110);
  }, [history, index, persist]);

  const setProfileTab = useCallback(
    (tab: string) => {
      navigate(state.route, state.params, {
        replace: true,
        profileTab: tab,
        installingFor: state.installingFor,
      });
    },
    [navigate, state]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowLeft") goBack();
      if (e.altKey && e.key === "ArrowRight") goForward();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack, goForward]);

  const value = useMemo(
    () => ({
      state,
      breadcrumbs,
      navigate,
      goBack,
      goForward,
      canGoBack: index > 0,
      canGoForward: index < history.length - 1,
      setProfileTab,
      pageVisible,
      setProfileNameResolver,
    }),
    [
      state,
      breadcrumbs,
      navigate,
      goBack,
      goForward,
      index,
      history.length,
      setProfileTab,
      pageVisible,
      setProfileNameResolver,
    ]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used within NavigationProvider");
  return ctx;
}
