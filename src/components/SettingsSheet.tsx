import { useState } from "react";
import { Sheet } from "./shell/AppShell";
import { Button } from "./ui/primitives";
import { getSettings, updateSettings, flushSettings } from "../store/settings";
import { useApp } from "../store/AppProvider";

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { version } = useApp();
  const [settings, setLocal] = useState(getSettings());
  const [tab, setTab] = useState<"interface" | "network">("interface");

  function patch(p: Partial<typeof settings>) {
    const next = updateSettings(p);
    setLocal({ ...next });
  }

  return (
    <Sheet
      open={open}
      title="Settings"
      onClose={() => {
        flushSettings();
        onClose();
      }}
      footer={<span>ManageNG v{version}</span>}
    >
      <div className="tab-bar" style={{ marginBottom: 16 }}>
        <button className={`tab ${tab === "interface" ? "active" : ""}`} onClick={() => setTab("interface")}>
          Interface
        </button>
        <button className={`tab ${tab === "network" ? "active" : ""}`} onClick={() => setTab("network")}>
          Network
        </button>
      </div>

      {tab === "interface" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Quick delete (Shift skips confirm)</span>
            <input
              type="checkbox"
              checked={settings.quickDelete}
              onChange={(e) => patch({ quickDelete: e.target.checked })}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Enabled packages first</span>
            <input
              type="checkbox"
              checked={settings.enabledFirst}
              onChange={(e) => patch({ enabledFirst: e.target.checked })}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Hide usernames in UI</span>
            <input
              type="checkbox"
              checked={settings.hideUsernames}
              onChange={(e) => patch({ hideUsernames: e.target.checked })}
            />
          </label>
        </div>
      )}

      {tab === "network" && (
        <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
          Proxy settings for repository access (coming soon).
        </p>
      )}

      <div style={{ marginTop: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => flushSettings()}>
          Save now
        </Button>
      </div>
    </Sheet>
  );
}
