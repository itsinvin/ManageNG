import { useState } from "react";
import { applyProfile, createProfile, deleteProfile, saveProfileFromCurrent } from "../api";
import type { Profile, ProfileStore } from "../types";

interface Props {
  store: ProfileStore | null;
  onRefresh: () => void;
  onProfileApplied: () => void;
  loading: boolean;
}

export function Profiles({ store, onRefresh, onProfileApplied, loading }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("🎯");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    setActionLoading("create");
    setError(null);
    try {
      await createProfile(newName.trim(), newDesc.trim(), newIcon);
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      onRefresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApply(id: string) {
    setActionLoading(id);
    setError(null);
    try {
      await applyProfile(id);
      onProfileApplied();
      onRefresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveCurrent(id: string) {
    setActionLoading(`save-${id}`);
    setError(null);
    try {
      await saveProfileFromCurrent(id);
      onRefresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    setActionLoading(`del-${id}`);
    setError(null);
    try {
      await deleteProfile(id);
      onRefresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
    }
  }

  if (loading || !store) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading profiles...
      </div>
    );
  }

  return (
    <>
      <div className="toolbar">
        <p style={{ color: "var(--text-secondary)", flex: 1 }}>
          Switch between mod setups instantly — rock crawling, multiplayer, vanilla, and more.
        </p>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Profile
        </button>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <div className="profile-grid">
        {store.profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            isActive={store.activeProfileId === profile.id}
            loading={actionLoading}
            onApply={() => handleApply(profile.id)}
            onSave={() => handleSaveCurrent(profile.id)}
            onDelete={() => handleDelete(profile.id)}
          />
        ))}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create Profile</h3>
            <div className="form-group">
              <label>Icon</label>
              <input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} maxLength={2} />
            </div>
            <div className="form-group">
              <label>Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Drift Setup"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What's this profile for?"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={!newName.trim() || actionLoading === "create"}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProfileCard({
  profile,
  isActive,
  loading,
  onApply,
  onSave,
  onDelete,
}: {
  profile: Profile;
  isActive: boolean;
  loading: string | null;
  onApply: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`profile-card ${isActive ? "active-profile" : ""}`}>
      <div className="profile-icon">{profile.icon ?? "🎯"}</div>
      <div className="profile-name">{profile.name}</div>
      <div className="profile-desc">{profile.description}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        {profile.modIds.length} mod{profile.modIds.length !== 1 ? "s" : ""} saved
        {isActive && (
          <span className="badge badge-active" style={{ marginLeft: 8 }}>
            Active
          </span>
        )}
      </div>
      <div className="profile-actions">
        <button
          className="btn btn-primary btn-sm"
          onClick={onApply}
          disabled={loading !== null}
        >
          {loading === profile.id ? "Applying..." : "Apply"}
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onSave}
          disabled={loading !== null}
        >
          {loading === `save-${profile.id}` ? "Saving..." : "Save Current"}
        </button>
        <button
          className="btn btn-danger btn-sm"
          onClick={onDelete}
          disabled={loading !== null}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
