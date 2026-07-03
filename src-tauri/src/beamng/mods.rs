use crate::beamng::paths::{folder_size, BeamNgPaths};
use crate::error::{ManageNgError, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ModSource {
    Repository,
    Manual,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModInfo {
    pub id: String,
    pub filename: String,
    pub title: String,
    pub author: Option<String>,
    pub active: bool,
    pub size_bytes: u64,
    pub source: ModSource,
    pub date_installed: Option<String>,
    pub is_broken: bool,
    pub is_outdated: bool,
    pub version: Option<String>,
    pub has_update: bool,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_mods: usize,
    pub active_mods: usize,
    pub inactive_mods: usize,
    pub total_size_bytes: u64,
    pub active_size_bytes: u64,
    pub broken_mods: usize,
    pub outdated_mods: usize,
    pub user_folder: String,
    pub game_version: Option<String>,
}

pub fn scan_mods(paths: &BeamNgPaths) -> Result<Vec<ModInfo>> {
    let db = load_db(&paths.db_path_buf())?;
    let zip_mods = scan_zip_files(&paths.mods_folder_path())?;
    let mut mods = Vec::new();

    for (filename, size, file_path) in zip_mods {
        let entry = find_db_entry(&db, &filename);
        let id = entry
            .and_then(|e| e.get("modname").or_else(|| e.get("filename")))
            .and_then(|v| v.as_str())
            .unwrap_or(&filename)
            .to_string();

        let title = entry
            .and_then(|e| e.get("title").or_else(|| e.get("modTitle")))
            .and_then(|v| v.as_str())
            .unwrap_or(&filename)
            .to_string();

        let author = entry
            .and_then(|e| e.get("author").or_else(|| e.get("username")))
            .and_then(|v| v.as_str())
            .map(String::from);

        let active = entry
            .and_then(|e| e.get("active"))
            .and_then(|v| v.as_bool())
            .unwrap_or(true);

        let source = if entry
            .and_then(|e| e.get("repo"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
            || entry.and_then(|e| e.get("modID")).is_some()
        {
            ModSource::Repository
        } else if entry.is_some() {
            ModSource::Manual
        } else {
            ModSource::Unknown
        };

        let version = entry
            .and_then(|e| e.get("version"))
            .and_then(|v| v.as_str())
            .map(String::from);

        let date_installed = entry
            .and_then(|e| e.get("date").or_else(|| e.get("dateAdded")))
            .and_then(|v| {
                if let Some(s) = v.as_str() {
                    Some(s.to_string())
                } else if let Some(n) = v.as_i64() {
                    DateTime::<Utc>::from_timestamp(n, 0)
                        .map(|d| d.to_rfc3339())
                } else {
                    None
                }
            });

        let is_broken = !is_valid_zip(&file_path);
        let is_outdated = entry
            .and_then(|e| e.get("outdated"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let has_update = entry
            .and_then(|e| e.get("updateAvailable"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        mods.push(ModInfo {
            id,
            filename: filename.clone(),
            title,
            author,
            active,
            size_bytes: size,
            source,
            date_installed,
            is_broken,
            is_outdated,
            version,
            has_update,
            path: file_path.to_string_lossy().to_string(),
        });
    }

    mods.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    Ok(mods)
}

pub fn dashboard_stats(paths: &BeamNgPaths, mods: &[ModInfo]) -> DashboardStats {
    let active: Vec<_> = mods.iter().filter(|m| m.active).collect();
    DashboardStats {
        total_mods: mods.len(),
        active_mods: active.len(),
        inactive_mods: mods.len() - active.len(),
        total_size_bytes: mods.iter().map(|m| m.size_bytes).sum(),
        active_size_bytes: active.iter().map(|m| m.size_bytes).sum(),
        broken_mods: mods.iter().filter(|m| m.is_broken).count(),
        outdated_mods: mods.iter().filter(|m| m.is_outdated).count(),
        user_folder: paths.user_folder.clone(),
        game_version: paths.game_version.clone(),
    }
}

pub fn set_mod_active(paths: &BeamNgPaths, mod_id: &str, active: bool) -> Result<()> {
    let mut db = load_db(&paths.db_path_buf())?;
    let key = find_db_key(&db, mod_id).ok_or_else(|| ManageNgError::ModNotFound(mod_id.into()))?;
    if let Some(entry) = db.get_mut(&key).and_then(|v| v.as_object_mut()) {
        entry.insert("active".into(), Value::Bool(active));
    }
    save_db(&paths.db_path_buf(), &db)
}

pub fn set_all_mods_active(paths: &BeamNgPaths, active: bool) -> Result<usize> {
    let mut db = load_db(&paths.db_path_buf())?;
    let mut count = 0;
    for value in db.values_mut() {
        if let Some(obj) = value.as_object_mut() {
            obj.insert("active".into(), Value::Bool(active));
            count += 1;
        }
    }
    save_db(&paths.db_path_buf(), &db)?;
    Ok(count)
}

pub fn apply_mod_states(paths: &BeamNgPaths, active_ids: &[String]) -> Result<()> {
    let active_set: std::collections::HashSet<_> = active_ids.iter().cloned().collect();
    let mut db = load_db(&paths.db_path_buf())?;

    for value in db.values_mut() {
        if let Some(obj) = value.as_object_mut() {
            let id = obj
                .get("modname")
                .or_else(|| obj.get("filename"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let filename = obj
                .get("filename")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let is_active = active_set.contains(id) || active_set.contains(filename);
            obj.insert("active".into(), Value::Bool(is_active));
        }
    }
    save_db(&paths.db_path_buf(), &db)
}

pub fn get_active_mod_ids(paths: &BeamNgPaths) -> Result<Vec<String>> {
    let db = load_db(&paths.db_path_buf())?;
    let mut ids = Vec::new();
    for value in db.values() {
        if let Some(obj) = value.as_object() {
            if obj.get("active").and_then(|v| v.as_bool()) == Some(true) {
                if let Some(id) = obj
                    .get("modname")
                    .or_else(|| obj.get("filename"))
                    .and_then(|v| v.as_str())
                {
                    ids.push(id.to_string());
                }
            }
        }
    }
    Ok(ids)
}

fn load_db(path: &Path) -> Result<Map<String, Value>> {
    if !path.exists() {
        return Ok(Map::new());
    }
    let content = fs::read_to_string(path)?;
    if content.trim().is_empty() {
        return Ok(Map::new());
    }
    let value: Value = serde_json::from_str(&content)?;
    match value {
        Value::Object(map) => Ok(map),
        _ => Ok(Map::new()),
    }
}

fn save_db(path: &Path, db: &Map<String, Value>) -> Result<()> {
    let content = serde_json::to_string_pretty(db)?;
    fs::write(path, content)?;
    Ok(())
}

fn scan_zip_files(mods_dir: &Path) -> Result<Vec<(String, u64, PathBuf)>> {
    let mut files = Vec::new();
    for entry in WalkDir::new(mods_dir).max_depth(1).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() {
            let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if name.ends_with(".zip") || name.ends_with(".ZIP") {
                let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                files.push((name.to_string(), size, path.to_path_buf()));
            }
        }
    }
    Ok(files)
}

fn find_db_entry<'a>(db: &'a Map<String, Value>, filename: &str) -> Option<&'a Value> {
    db.values().find(|v| {
        v.get("filename")
            .and_then(|f| f.as_str())
            .map(|f| f.eq_ignore_ascii_case(filename))
            .unwrap_or(false)
            || v.get("modname")
                .and_then(|f| f.as_str())
                .map(|f| f.eq_ignore_ascii_case(filename.trim_end_matches(".zip")))
                .unwrap_or(false)
    })
}

fn find_db_key(db: &Map<String, Value>, mod_id: &str) -> Option<String> {
    db.iter().find_map(|(key, value)| {
        let matches = value
            .get("modname")
            .and_then(|v| v.as_str())
            .map(|n| n == mod_id)
            .unwrap_or(false)
            || value
                .get("filename")
                .and_then(|v| v.as_str())
                .map(|f| f == mod_id || f.trim_end_matches(".zip") == mod_id)
                .unwrap_or(false)
            || key == mod_id;
        if matches {
            Some(key.clone())
        } else {
            None
        }
    })
}

fn is_valid_zip(path: &Path) -> bool {
    match fs::File::open(path) {
        Ok(file) => zip::ZipArchive::new(file).is_ok(),
        Err(_) => false,
    }
}

pub fn install_mod_zip(paths: &BeamNgPaths, source: &Path) -> Result<ModInfo> {
    let filename = source
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| ManageNgError::Other("Invalid source file".into()))?;

    if !filename.to_lowercase().ends_with(".zip") {
        return Err(ManageNgError::Other("Only .zip mod files are supported".into()));
    }

    let dest = paths.mods_folder_path().join(filename);
    fs::copy(source, &dest)?;
    scan_mods(paths)?
        .into_iter()
        .find(|m| m.filename == filename)
        .ok_or_else(|| ManageNgError::Other("Mod installed but not detected".into()))
}

pub fn delete_mod(paths: &BeamNgPaths, mod_id: &str, delete_file: bool) -> Result<()> {
    if delete_file {
        let mods = scan_mods(paths)?;
        if let Some(m) = mods.iter().find(|m| m.id == mod_id || m.filename == mod_id) {
            fs::remove_file(&m.path)?;
        }
    }

    if paths.db_path_buf().exists() {
        let mut db = load_db(&paths.db_path_buf())?;
        if let Some(key) = find_db_key(&db, mod_id) {
            db.remove(&key);
            save_db(&paths.db_path_buf(), &db)?;
        }
    }
    Ok(())
}

pub fn check_mod_updates(paths: &BeamNgPaths) -> Result<Vec<ModInfo>> {
    let mods = scan_mods(paths)?;
    Ok(mods.into_iter().filter(|m| m.has_update).collect())
}

pub fn storage_breakdown(paths: &BeamNgPaths) -> Result<HashMap<String, u64>> {
    let mut breakdown = HashMap::new();
    breakdown.insert("mods".into(), folder_size(&paths.mods_folder_path()));
    for sub in ["temp", "cache", "settings"] {
        let p = paths.user_folder_path().join(sub);
        if p.exists() {
            breakdown.insert(sub.into(), folder_size(&p));
        }
    }
    Ok(breakdown)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn setup_test_env() -> (tempfile::TempDir, BeamNgPaths) {
        let tmp = tempdir().unwrap();
        let user = tmp.path().join("current");
        let mods = user.join("mods");
        fs::create_dir_all(&mods).unwrap();
        fs::write(mods.join("test_mod.zip"), b"not a zip").unwrap();
        fs::write(
            mods.join("db.json"),
            r#"{"abc":{"filename":"test_mod.zip","modname":"test_mod","active":true,"title":"Test Mod"}}"#,
        )
        .unwrap();
        let paths = BeamNgPaths {
            user_folder: user.to_string_lossy().to_string(),
            mods_folder: mods.to_string_lossy().to_string(),
            db_path: user.join("mods").join("db.json").to_string_lossy().to_string(),
            game_version: Some("0.37".into()),
            is_custom_path: false,
        };
        (tmp, paths)
    }

    #[test]
    fn scans_mods_from_folder() {
        let (_tmp, paths) = setup_test_env();
        let mods = scan_mods(&paths).unwrap();
        assert_eq!(mods.len(), 1);
        assert_eq!(mods[0].title, "Test Mod");
        assert!(mods[0].active);
    }

    #[test]
    fn toggles_mod_active_state() {
        let (_tmp, paths) = setup_test_env();
        set_mod_active(&paths, "test_mod", false).unwrap();
        let mods = scan_mods(&paths).unwrap();
        assert!(!mods[0].active);
    }
}
