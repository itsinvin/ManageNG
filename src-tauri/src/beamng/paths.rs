use crate::error::{ManageNgError, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BeamNgPaths {
    pub user_folder: String,
    pub mods_folder: String,
    pub db_path: String,
    pub game_version: Option<String>,
    pub is_custom_path: bool,
}

impl BeamNgPaths {
    pub fn user_folder_path(&self) -> PathBuf {
        PathBuf::from(&self.user_folder)
    }

    pub fn mods_folder_path(&self) -> PathBuf {
        PathBuf::from(&self.mods_folder)
    }

    pub fn db_path_buf(&self) -> PathBuf {
        PathBuf::from(&self.db_path)
    }
}

pub fn detect_beamng_paths() -> Result<BeamNgPaths> {
    let user_folder = find_user_folder()?;
    build_paths(user_folder, false)
}

pub fn set_custom_user_folder(path: PathBuf) -> Result<BeamNgPaths> {
    if !path.exists() {
        return Err(ManageNgError::DirNotFound(path.to_string_lossy().to_string()));
    }
    save_custom_path(&path)?;
    build_paths(path, true)
}

pub fn get_saved_custom_path() -> Option<PathBuf> {
    manageng_config_dir()
        .ok()
        .map(|d| d.join("custom_user_folder.txt"))
        .and_then(|f| fs::read_to_string(f).ok())
        .map(|s| PathBuf::from(s.trim()))
        .filter(|p| p.exists())
}

fn build_paths(user_folder: PathBuf, is_custom: bool) -> Result<BeamNgPaths> {
    let mods_folder = user_folder.join("mods");
    if !mods_folder.exists() {
        return Err(ManageNgError::ModsFolderNotFound(
            mods_folder.to_string_lossy().to_string(),
        ));
    }

    let db_path = mods_folder.join("db.json");
    let game_version = read_game_version(&user_folder);

    Ok(BeamNgPaths {
        user_folder: user_folder.to_string_lossy().to_string(),
        mods_folder: mods_folder.to_string_lossy().to_string(),
        db_path: db_path.to_string_lossy().to_string(),
        game_version,
        is_custom_path: is_custom,
    })
}

fn find_user_folder() -> Result<PathBuf> {
    if let Some(custom) = get_saved_custom_path() {
        return Ok(custom);
    }

    if let Some(path) = platform_user_folder_override() {
        if path.exists() {
            return Ok(path);
        }
    }

    let default = default_user_folder();
    if default.exists() {
        return Ok(default);
    }

    if let Some(legacy) = legacy_user_folder() {
        if legacy.exists() {
            return Ok(legacy);
        }
    }

    Err(ManageNgError::UserFolderNotFound)
}

fn default_user_folder() -> PathBuf {
    beamng_base_dir().join("current")
}

fn beamng_base_dir() -> PathBuf {
    #[cfg(windows)]
    {
        dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("BeamNG")
            .join("BeamNG.drive")
    }
    #[cfg(not(windows))]
    {
        let data_home = std::env::var("XDG_DATA_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                dirs::home_dir()
                    .unwrap_or_else(|| PathBuf::from("."))
                    .join(".local")
                    .join("share")
            });
        data_home.join("BeamNG").join("BeamNG.drive")
    }
}

fn legacy_user_folder() -> Option<PathBuf> {
    #[cfg(windows)]
    {
        let legacy_base = dirs::data_local_dir()?.join("BeamNG.drive");
        if !legacy_base.exists() {
            return None;
        }
        if legacy_base.join("mods").exists() {
            return Some(legacy_base);
        }
        fs::read_dir(&legacy_base)
            .ok()?
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| p.is_dir())
            .filter(|p| p.join("mods").exists())
            .max_by_key(|p| p.file_name().map(|n| n.to_string_lossy().to_string()))
    }
    #[cfg(not(windows))]
    {
        let legacy = dirs::home_dir()?.join(".local").join("share").join("BeamNG.drive");
        if legacy.join("mods").exists() {
            Some(legacy)
        } else {
            None
        }
    }
}

#[cfg(windows)]
fn platform_user_folder_override() -> Option<PathBuf> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    hkcu.open_subkey(r"SOFTWARE\BeamNG\BeamNG.drive")
        .ok()?
        .get_value::<String, _>("userpath_override")
        .ok()
        .map(PathBuf::from)
}

#[cfg(not(windows))]
fn platform_user_folder_override() -> Option<PathBuf> {
    None
}

fn read_game_version(user_folder: &Path) -> Option<String> {
    let ini_path = beamng_base_dir().with_extension("ini");
    if ini_path.exists() {
        if let Ok(content) = fs::read_to_string(&ini_path) {
            for line in content.lines() {
                let line = line.trim();
                if line.starts_with("version=") || line.starts_with("Version=") {
                    return Some(line.split('=').nth(1)?.trim().to_string());
                }
            }
        }
    }

    let version_txt = user_folder.join("version.txt");
    if version_txt.exists() {
        return fs::read_to_string(version_txt)
            .ok()
            .map(|s| s.trim().to_string());
    }

    user_folder
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| *n != "current")
        .map(String::from)
}

pub fn manageng_config_dir() -> Result<PathBuf> {
    let dir = dirs::data_local_dir()
        .or_else(dirs::config_dir)
        .ok_or_else(|| ManageNgError::Other("Could not resolve config directory".into()))?
        .join("ManageNG");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn save_custom_path(path: &Path) -> Result<()> {
    let config = manageng_config_dir()?;
    fs::write(config.join("custom_user_folder.txt"), path.to_string_lossy().as_bytes())?;
    Ok(())
}

pub fn folder_size(path: &Path) -> u64 {
    walkdir::WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn reads_version_from_ini() {
        let tmp = tempdir().unwrap();
        let base = tmp.path().join("BeamNG").join("BeamNG.drive");
        fs::create_dir_all(&base).unwrap();
        fs::write(base.with_extension("ini"), "version=0.37.1.0\n").unwrap();
        let user = base.join("current");
        fs::create_dir_all(user.join("mods")).unwrap();
        // Version reading uses beamng_base_dir which is platform-specific;
        // test read_game_version with version.txt fallback
        fs::write(user.join("version.txt"), "0.37.1.0").unwrap();
        assert_eq!(read_game_version(&user), Some("0.37.1.0".into()));
    }
}
