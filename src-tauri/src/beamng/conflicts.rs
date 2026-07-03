use crate::beamng::mods::ModInfo;
use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::path::Path;
use zip::ZipArchive;

const CORE_PATH_PREFIXES: &[&str] = &[
    "scripts/",
    "vehicles/",
    "levels/",
    "art/",
    "lua/",
    "ui/",
    "settings/",
    "gameplay/",
    "flowgraph/",
    "main/",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModConflict {
    pub file_path: String,
    pub mods: Vec<String>,
    pub severity: ConflictSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ConflictSeverity {
    Low,
    Medium,
    High,
}

pub fn detect_conflicts(mods: &[ModInfo]) -> Result<Vec<ModConflict>> {
    let active_mods: Vec<_> = mods.iter().filter(|m| m.active && !m.is_broken).collect();
    let mut file_to_mods: HashMap<String, HashSet<String>> = HashMap::new();

    for m in &active_mods {
        if let Ok(paths) = list_zip_paths(Path::new(&m.path)) {
            for path in paths {
                file_to_mods
                    .entry(normalize_path(&path))
                    .or_default()
                    .insert(m.title.clone());
            }
        }
    }

    let mut conflicts = Vec::new();
    for (file_path, mod_set) in file_to_mods {
        if mod_set.len() > 1 {
            let severity = classify_severity(&file_path);
            conflicts.push(ModConflict {
                file_path,
                mods: mod_set.into_iter().collect(),
                severity,
            });
        }
    }

    conflicts.sort_by(|a, b| {
        severity_rank(&b.severity)
            .cmp(&severity_rank(&a.severity))
            .then_with(|| a.file_path.cmp(&b.file_path))
    });
    Ok(conflicts)
}

fn list_zip_paths(zip_path: &Path) -> Result<Vec<String>> {
    let file = File::open(zip_path)?;
    let mut archive = ZipArchive::new(file)?;
    let mut paths = Vec::new();
    for i in 0..archive.len() {
        if let Ok(entry) = archive.by_index(i) {
            if !entry.is_dir() {
                paths.push(entry.name().to_string());
            }
        }
    }
    Ok(paths)
}

fn normalize_path(path: &str) -> String {
    path.replace('\\', "/").trim_start_matches('/').to_lowercase()
}

fn classify_severity(path: &str) -> ConflictSeverity {
    let lower = path.to_lowercase();
    if CORE_PATH_PREFIXES.iter().any(|p| lower.starts_with(p)) {
        ConflictSeverity::High
    } else if lower.ends_with(".jbeam")
        || lower.ends_with(".dae")
        || lower.ends_with(".json")
        || lower.contains("/vehicles/")
    {
        ConflictSeverity::Medium
    } else {
        ConflictSeverity::Low
    }
}

fn severity_rank(severity: &ConflictSeverity) -> u8 {
    match severity {
        ConflictSeverity::High => 3,
        ConflictSeverity::Medium => 2,
        ConflictSeverity::Low => 1,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::beamng::mods::ModSource;
    use std::io::Write;
    use tempfile::tempdir;
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;

    fn make_test_zip(dir: &Path, name: &str, files: &[(&str, &str)]) -> String {
        let path = dir.join(name);
        let file = File::create(&path).unwrap();
        let mut zip = ZipWriter::new(file);
        let options = SimpleFileOptions::default();
        for (fname, content) in files {
            zip.start_file(*fname, options).unwrap();
            zip.write_all(content.as_bytes()).unwrap();
        }
        zip.finish().unwrap();
        path.to_string_lossy().to_string()
    }

    #[test]
    fn detects_overlapping_files() {
        let tmp = tempdir().unwrap();
        let zip1 = make_test_zip(tmp.path(), "a.zip", &[("vehicles/car/info.json", "{}")]);
        let zip2 = make_test_zip(tmp.path(), "b.zip", &[("vehicles/car/info.json", "{}")]);

        let mods = vec![
            ModInfo {
                id: "a".into(),
                filename: "a.zip".into(),
                title: "Mod A".into(),
                author: None,
                active: true,
                size_bytes: 100,
                source: ModSource::Manual,
                date_installed: None,
                is_broken: false,
                is_outdated: false,
                version: None,
                has_update: false,
                path: zip1,
            },
            ModInfo {
                id: "b".into(),
                filename: "b.zip".into(),
                title: "Mod B".into(),
                author: None,
                active: true,
                size_bytes: 100,
                source: ModSource::Manual,
                date_installed: None,
                is_broken: false,
                is_outdated: false,
                version: None,
                has_update: false,
                path: zip2,
            },
        ];

        let conflicts = detect_conflicts(&mods).unwrap();
        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].mods.len(), 2);
        assert_eq!(conflicts[0].severity, ConflictSeverity::High);
    }
}
