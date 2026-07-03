use crate::beamng::paths::{folder_size, BeamNgPaths};
use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupPreview {
    pub paths: Vec<CleanupTarget>,
    pub total_bytes: u64,
    pub file_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupTarget {
    pub path: String,
    pub label: String,
    pub size_bytes: u64,
    pub file_count: u64,
    pub category: CleanupCategory,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CleanupCategory {
    Cache,
    Temp,
    Backup,
    Shader,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupResult {
    pub files_removed: u64,
    pub bytes_freed: u64,
    pub paths_cleaned: Vec<String>,
}

const CACHE_DIRS: &[(&str, CleanupCategory)] = &[
    ("temp", CleanupCategory::Temp),
    ("cache", CleanupCategory::Cache),
    ("shaders", CleanupCategory::Shader),
    ("backups", CleanupCategory::Backup),
];

pub fn preview_cleanup(paths: &BeamNgPaths) -> Result<CleanupPreview> {
    let mut targets = Vec::new();
    let mut total_bytes = 0u64;
    let mut file_count = 0u64;

    for (subdir, category) in CACHE_DIRS {
        let dir = paths.user_folder_path().join(subdir);
        if dir.exists() {
            let (size, count) = dir_stats(&dir);
            if count > 0 {
                total_bytes += size;
                file_count += count;
                targets.push(CleanupTarget {
                    path: dir.to_string_lossy().to_string(),
                    label: format!("{} folder", subdir),
                    size_bytes: size,
                    file_count: count,
                    category: category.clone(),
                });
            }
        }
    }

    let temp_files = find_temp_files(&paths.user_folder_path());
    if temp_files.1 > 0 {
        total_bytes += temp_files.0;
        file_count += temp_files.1;
        targets.push(CleanupTarget {
            path: paths.user_folder.clone(),
            label: "Loose temp files".into(),
            size_bytes: temp_files.0,
            file_count: temp_files.1,
            category: CleanupCategory::Other,
        });
    }

    Ok(CleanupPreview {
        paths: targets,
        total_bytes,
        file_count,
    })
}

pub fn run_deep_clean(paths: &BeamNgPaths) -> Result<CleanupResult> {
    let preview = preview_cleanup(paths)?;
    let mut result = CleanupResult {
        files_removed: 0,
        bytes_freed: 0,
        paths_cleaned: Vec::new(),
    };

    for target in preview.paths {
        let path = PathBuf::from(&target.path);
        if target.label == "Loose temp files" {
            let (freed, removed) = clean_loose_temp_files(&path)?;
            result.bytes_freed += freed;
            result.files_removed += removed;
            if removed > 0 {
                result.paths_cleaned.push(target.label);
            }
        } else if path.exists() {
            let size = folder_size(&path);
            let count = count_files(&path);
            remove_dir_contents(&path)?;
            result.bytes_freed += size;
            result.files_removed += count;
            result.paths_cleaned.push(target.path);
        }
    }

    Ok(result)
}

fn dir_stats(path: &Path) -> (u64, u64) {
    let mut size = 0u64;
    let mut count = 0u64;
    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            count += 1;
            size += entry.metadata().map(|m| m.len()).unwrap_or(0);
        }
    }
    (size, count)
}

fn count_files(path: &Path) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .count() as u64
}

fn find_temp_files(user_folder: &Path) -> (u64, u64) {
    let mut size = 0u64;
    let mut count = 0u64;
    if let Ok(entries) = fs::read_dir(user_folder) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if name.ends_with(".tmp") || name.ends_with(".log") || name.starts_with("temp_") {
                        count += 1;
                        size += entry.metadata().map(|m| m.len()).unwrap_or(0);
                    }
                }
            }
        }
    }
    (size, count)
}

fn clean_loose_temp_files(user_folder: &Path) -> Result<(u64, u64)> {
    let (size, _) = find_temp_files(user_folder);
    let mut removed = 0u64;
    if let Ok(entries) = fs::read_dir(user_folder) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if name.ends_with(".tmp") || name.ends_with(".log") || name.starts_with("temp_") {
                        fs::remove_file(&path)?;
                        removed += 1;
                    }
                }
            }
        }
    }
    Ok((size, removed))
}

fn remove_dir_contents(path: &Path) -> Result<()> {
    if !path.exists() {
        return Ok(());
    }
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let p = entry.path();
        if p.is_dir() {
            fs::remove_dir_all(&p)?;
        } else {
            fs::remove_file(&p)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn previews_cleanup_targets() {
        let tmp = tempdir().unwrap();
        let user = tmp.path().join("current");
        let temp = user.join("temp");
        fs::create_dir_all(&temp).unwrap();
        fs::write(temp.join("cache.dat"), "data").unwrap();

        let paths = BeamNgPaths {
            user_folder: user.to_string_lossy().to_string(),
            mods_folder: tmp.path().join("mods").to_string_lossy().to_string(),
            db_path: tmp.path().join("db.json").to_string_lossy().to_string(),
            game_version: None,
            is_custom_path: false,
        };

        let preview = preview_cleanup(&paths).unwrap();
        assert!(!preview.paths.is_empty());
        assert!(preview.total_bytes > 0);
    }
}
