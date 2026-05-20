mod commands;
mod db;
mod errors;
mod git;

use std::sync::Mutex;

use db::DbState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("app data dir is available");
            std::fs::create_dir_all(&app_data_dir).ok();
            let db_path = app_data_dir.join("app.db");
            let connection = db::open(&db_path).expect("open database");
            app.manage(DbState {
                conn: Mutex::new(connection),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::repository::validate_repository,
            commands::repository::pick_repository,
            commands::status::get_status,
            commands::diff::get_file_diff,
            commands::staging::stage_file,
            commands::staging::unstage_file,
            commands::staging::stage_all,
            commands::staging::unstage_all,
            commands::staging::discard_file,
            commands::commit::create_commit,
            commands::history::get_commit_history,
            commands::history::get_graph,
            commands::branches::list_branches,
            commands::branches::checkout_branch,
            commands::branches::create_branch,
            commands::remotes::fetch,
            commands::remotes::pull,
            commands::remotes::push,
            commands::prefs::list_recent_repos,
            commands::prefs::add_recent_repo,
            commands::prefs::remove_recent_repo,
            commands::prefs::get_pref,
            commands::prefs::set_pref,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
