import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { AppProvider, useApp } from "./store/AppProvider";
import { NavigationProvider, useNavigation } from "./navigation/NavigationProvider";
import { Sidebar, TitleBar, ToastStack } from "./components/shell/AppShell";
import { SettingsSheet } from "./components/SettingsSheet";
import { Button, ErrorAlert } from "./components/ui/primitives";
import { HomePage } from "./pages/HomePage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { ProfileDetailPage, ProfileDetailTitleActions } from "./pages/ProfileDetailPage";
import { BrowsePage } from "./pages/BrowsePage";
import { ToolsPage } from "./pages/ToolsPage";
import "./styles/tokens.css";
import "./styles/global.css";

function AppContent() {
  const { state, pageVisible, setProfileNameResolver } = useNavigation();
  const {
    getProfile,
    refresh,
    refreshing,
    error,
    pathConfigured,
    detectBeamNGPath,
    setBeamNGPath,
  } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setProfileNameResolver((id) => getProfile(id)?.name);
  }, [getProfile, setProfileNameResolver]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "," && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const titleActions = (
    <>
      {!pathConfigured && (
        <>
          <Button variant="info" size="sm" onClick={() => detectBeamNGPath()}>
            Auto-detect
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={async () => {
              const picked = await open({ directory: true });
              if (picked) await setBeamNGPath(picked as string);
            }}
          >
            Set folder
          </Button>
        </>
      )}
      {state.route === "home" && (
        <Button variant="ghost" size="sm" className={refreshing ? "spin-once" : ""} onClick={() => refresh()}>
          ↻ Refresh
        </Button>
      )}
      {state.route === "profile-detail" && state.params.id && (
        <ProfileDetailTitleActions profileId={state.params.id} />
      )}
      {state.route === "browse" && (
        <Button variant="info" size="sm" onClick={() => refresh()}>
          Refresh
        </Button>
      )}
    </>
  );

  return (
    <div className="app-shell">
      <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
      <div className="main-column">
        <TitleBar actions={titleActions} />
        <div className={`page-body ${pageVisible ? "" : "fading"}`}>
          {error && !pathConfigured && (
            <ErrorAlert
              title="BeamNG folder not found"
              message="Launch BeamNG.drive once or set a custom user folder path."
            />
          )}
          {state.route === "home" && <HomePage />}
          {state.route === "profiles" && <ProfilesPage />}
          {state.route === "profile-detail" && <ProfileDetailPage />}
          {(state.route === "browse" ||
            state.route === "beamng-repo" ||
            state.route === "browse-detail") && <BrowsePage />}
          {state.route === "tools" && <ToolsPage />}
        </div>
      </div>
      <ToastStack />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </AppProvider>
  );
}
