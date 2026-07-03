mod beamng;
mod commands;
mod error;
mod profiles;

use commands::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::get_paths,
            commands::detect_paths,
            commands::set_user_folder,
            commands::get_mods,
            commands::get_dashboard,
            commands::toggle_mod,
            commands::toggle_all_mods,
            commands::get_conflicts,
            commands::preview_deep_clean,
            commands::run_deep_clean_cmd,
            commands::search_repo,
            commands::get_repo_mod,
            commands::download_repo_mod,
            commands::install_mod_from_file,
            commands::remove_mod,
            commands::get_storage_breakdown,
            commands::check_updates,
            commands::list_profiles,
            commands::create_profile_cmd,
            commands::delete_profile_cmd,
            commands::update_profile_cmd,
            commands::apply_profile,
            commands::save_profile_from_current,
            commands::get_app_version,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
