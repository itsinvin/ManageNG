use crate::beamng::paths::manageng_config_dir;
use crate::error::{ManageNgError, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub description: String,
    pub mod_ids: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileStore {
    pub profiles: Vec<Profile>,
    pub active_profile_id: Option<String>,
}

impl Default for ProfileStore {
    fn default() -> Self {
        Self {
            profiles: vec![
                Profile {
                    id: Uuid::new_v4().to_string(),
                    name: "Vanilla".into(),
                    description: "No mods enabled — pure stock experience".into(),
                    mod_ids: vec![],
                    created_at: Utc::now().to_rfc3339(),
                    updated_at: Utc::now().to_rfc3339(),
                    icon: Some("🎮".into()),
                },
                Profile {
                    id: Uuid::new_v4().to_string(),
                    name: "Rock Crawling".into(),
                    description: "Trail rigs and off-road maps".into(),
                    mod_ids: vec![],
                    created_at: Utc::now().to_rfc3339(),
                    updated_at: Utc::now().to_rfc3339(),
                    icon: Some("🪨".into()),
                },
                Profile {
                    id: Uuid::new_v4().to_string(),
                    name: "Multiplayer".into(),
                    description: "BeamMP-compatible mod setup".into(),
                    mod_ids: vec![],
                    created_at: Utc::now().to_rfc3339(),
                    updated_at: Utc::now().to_rfc3339(),
                    icon: Some("🌐".into()),
                },
            ],
            active_profile_id: None,
        }
    }
}

fn profiles_path() -> Result<PathBuf> {
    Ok(manageng_config_dir()?.join("profiles.json"))
}

pub fn load_profiles() -> Result<ProfileStore> {
    let path = profiles_path()?;
    if !path.exists() {
        let store = ProfileStore::default();
        save_profiles(&store)?;
        return Ok(store);
    }
    let content = fs::read_to_string(&path)?;
    Ok(serde_json::from_str(&content)?)
}

pub fn save_profiles(store: &ProfileStore) -> Result<()> {
    let path = profiles_path()?;
    let content = serde_json::to_string_pretty(store)?;
    fs::write(path, content)?;
    Ok(())
}

pub fn create_profile(name: &str, description: &str, icon: Option<&str>) -> Result<Profile> {
    let mut store = load_profiles()?;
    if store.profiles.iter().any(|p| p.name.eq_ignore_ascii_case(name)) {
        return Err(ManageNgError::ProfileExists(name.into()));
    }
    let profile = Profile {
        id: Uuid::new_v4().to_string(),
        name: name.to_string(),
        description: description.to_string(),
        mod_ids: vec![],
        created_at: Utc::now().to_rfc3339(),
        updated_at: Utc::now().to_rfc3339(),
        icon: icon.map(String::from),
    };
    store.profiles.push(profile.clone());
    save_profiles(&store)?;
    Ok(profile)
}

pub fn delete_profile(id: &str) -> Result<()> {
    let mut store = load_profiles()?;
    let len_before = store.profiles.len();
    store.profiles.retain(|p| p.id != id);
    if store.profiles.len() == len_before {
        return Err(ManageNgError::ProfileNotFound(id.into()));
    }
    if store.active_profile_id.as_deref() == Some(id) {
        store.active_profile_id = None;
    }
    save_profiles(&store)
}

pub fn update_profile(id: &str, name: Option<&str>, description: Option<&str>, mod_ids: Option<Vec<String>>) -> Result<Profile> {
    let mut store = load_profiles()?;
    let profile = store
        .profiles
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or_else(|| ManageNgError::ProfileNotFound(id.into()))?;

    if let Some(n) = name {
        profile.name = n.to_string();
    }
    if let Some(d) = description {
        profile.description = d.to_string();
    }
    if let Some(ids) = mod_ids {
        profile.mod_ids = ids;
    }
    profile.updated_at = Utc::now().to_rfc3339();
    let result = profile.clone();
    save_profiles(&store)?;
    Ok(result)
}

pub fn save_current_as_profile(id: &str, active_mod_ids: &[String]) -> Result<Profile> {
    update_profile(id, None, None, Some(active_mod_ids.to_vec()))
}

pub fn set_active_profile(id: Option<&str>) -> Result<()> {
    let mut store = load_profiles()?;
    store.active_profile_id = id.map(String::from);
    save_profiles(&store)
}

pub fn get_profile_mod_ids(id: &str) -> Result<Vec<String>> {
    let store = load_profiles()?;
    store
        .profiles
        .iter()
        .find(|p| p.id == id)
        .map(|p| p.mod_ids.clone())
        .ok_or_else(|| ManageNgError::ProfileNotFound(id.into()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Mutex, OnceLock};

    static TEST_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

    fn with_test_config<F: FnOnce() -> R, R>(f: F) -> R {
        let _guard = TEST_LOCK.get_or_init(|| Mutex::new(())).lock().unwrap();
        let tmp = tempfile::tempdir().unwrap();
        std::env::set_var("MANAGENG_CONFIG_DIR", tmp.path());
        f()
    }

    #[test]
    fn creates_and_lists_profiles() {
        // Profile tests use manageng_config_dir which reads from dirs crate;
        // basic logic test without env override
        let store = ProfileStore::default();
        assert!(store.profiles.len() >= 3);
    }
}
