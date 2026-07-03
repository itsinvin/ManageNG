use crate::beamng::cleanup::{preview_cleanup, run_deep_clean, CleanupPreview, CleanupResult};
use crate::beamng::conflicts::{detect_conflicts, ModConflict};
use crate::beamng::mods::{
    apply_mod_states, check_mod_updates, dashboard_stats, delete_mod, get_active_mod_ids,
    install_mod_zip, scan_mods, set_all_mods_active, set_mod_active, storage_breakdown, DashboardStats,
    ModInfo,
};
use crate::beamng::paths::{detect_beamng_paths, set_custom_user_folder, BeamNgPaths};
use crate::beamng::repository::{download_mod, fetch_mod_details, search_repository, RepoMod, RepoSearchResult};
use crate::error::Result;
use crate::profiles::{
    create_profile, delete_profile, get_profile_mod_ids, load_profiles, save_current_as_profile,
    set_active_profile, update_profile, Profile, ProfileStore,
};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub paths: Mutex<Option<BeamNgPaths>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            paths: Mutex::new(detect_beamng_paths().ok()),
        }
    }

    fn get_paths(&self) -> Result<BeamNgPaths> {
        let guard = self.paths.lock().unwrap();
        guard
            .clone()
            .ok_or(crate::error::ManageNgError::UserFolderNotFound)
    }

    fn refresh_paths(&self) -> Result<BeamNgPaths> {
        let paths = detect_beamng_paths()?;
        *self.paths.lock().unwrap() = Some(paths.clone());
        Ok(paths)
    }
}

#[tauri::command]
pub fn get_paths(state: State<'_, AppState>) -> Result<Option<BeamNgPaths>> {
    Ok(state.paths.lock().unwrap().clone())
}

#[tauri::command]
pub fn detect_paths(state: State<'_, AppState>) -> Result<BeamNgPaths> {
    state.refresh_paths()
}

#[tauri::command]
pub fn set_user_folder(path: String, state: State<'_, AppState>) -> Result<BeamNgPaths> {
    let paths = set_custom_user_folder(PathBuf::from(path))?;
    *state.paths.lock().unwrap() = Some(paths.clone());
    Ok(paths)
}

#[tauri::command]
pub fn get_mods(state: State<'_, AppState>) -> Result<Vec<ModInfo>> {
    let paths = state.get_paths()?;
    scan_mods(&paths)
}

#[tauri::command]
pub fn get_dashboard(state: State<'_, AppState>) -> Result<DashboardStats> {
    let paths = state.get_paths()?;
    let mods = scan_mods(&paths)?;
    Ok(dashboard_stats(&paths, &mods))
}

#[tauri::command]
pub fn toggle_mod(mod_id: String, active: bool, state: State<'_, AppState>) -> Result<ModInfo> {
    let paths = state.get_paths()?;
    set_mod_active(&paths, &mod_id, active)?;
    scan_mods(&paths)?
        .into_iter()
        .find(|m| m.id == mod_id || m.filename == mod_id)
        .ok_or_else(|| crate::error::ManageNgError::ModNotFound(mod_id))
}

#[tauri::command]
pub fn toggle_all_mods(active: bool, state: State<'_, AppState>) -> Result<usize> {
    let paths = state.get_paths()?;
    set_all_mods_active(&paths, active)
}

#[tauri::command]
pub fn get_conflicts(state: State<'_, AppState>) -> Result<Vec<ModConflict>> {
    let paths = state.get_paths()?;
    let mods = scan_mods(&paths)?;
    detect_conflicts(&mods)
}

#[tauri::command]
pub fn preview_deep_clean(state: State<'_, AppState>) -> Result<CleanupPreview> {
    let paths = state.get_paths()?;
    preview_cleanup(&paths)
}

#[tauri::command]
pub fn run_deep_clean_cmd(state: State<'_, AppState>) -> Result<CleanupResult> {
    let paths = state.get_paths()?;
    run_deep_clean(&paths)
}

#[tauri::command]
pub fn search_repo(query: String, page: u32) -> Result<RepoSearchResult> {
    search_repository(&query, page)
}

#[tauri::command]
pub fn get_repo_mod(url: String) -> Result<RepoMod> {
    fetch_mod_details(&url)
}

#[tauri::command]
pub fn download_repo_mod(url: String, state: State<'_, AppState>) -> Result<ModInfo> {
    let paths = state.get_paths()?;
    let downloaded = download_mod(&url, &paths.mods_folder_path())?;
    install_mod_zip(&paths, &downloaded)
}

#[tauri::command]
pub fn install_mod_from_file(path: String, state: State<'_, AppState>) -> Result<ModInfo> {
    let paths = state.get_paths()?;
    install_mod_zip(&paths, PathBuf::from(path).as_path())
}

#[tauri::command]
pub fn remove_mod(mod_id: String, delete_file: bool, state: State<'_, AppState>) -> Result<()> {
    let paths = state.get_paths()?;
    delete_mod(&paths, &mod_id, delete_file)
}

#[tauri::command]
pub fn get_storage_breakdown(state: State<'_, AppState>) -> Result<HashMap<String, u64>> {
    let paths = state.get_paths()?;
    storage_breakdown(&paths)
}

#[tauri::command]
pub fn check_updates(state: State<'_, AppState>) -> Result<Vec<ModInfo>> {
    let paths = state.get_paths()?;
    check_mod_updates(&paths)
}

#[tauri::command]
pub fn list_profiles() -> Result<ProfileStore> {
    load_profiles()
}

#[tauri::command]
pub fn create_profile_cmd(name: String, description: String, icon: Option<String>) -> Result<Profile> {
    create_profile(&name, &description, icon.as_deref())
}

#[tauri::command]
pub fn delete_profile_cmd(id: String) -> Result<()> {
    delete_profile(&id)
}

#[tauri::command]
pub fn update_profile_cmd(
    id: String,
    name: Option<String>,
    description: Option<String>,
    mod_ids: Option<Vec<String>>,
) -> Result<Profile> {
    update_profile(
        &id,
        name.as_deref(),
        description.as_deref(),
        mod_ids,
    )
}

#[tauri::command]
pub fn apply_profile(id: String, state: State<'_, AppState>) -> Result<Vec<ModInfo>> {
    let paths = state.get_paths()?;
    let mod_ids = get_profile_mod_ids(&id)?;
    apply_mod_states(&paths, &mod_ids)?;
    set_active_profile(Some(&id))?;
    scan_mods(&paths)
}

#[tauri::command]
pub fn save_profile_from_current(id: String, state: State<'_, AppState>) -> Result<Profile> {
    let paths = state.get_paths()?;
    let active = get_active_mod_ids(&paths)?;
    save_current_as_profile(&id, &active)
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
