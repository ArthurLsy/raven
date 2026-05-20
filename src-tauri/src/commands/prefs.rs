use tauri::State;

use crate::db::{preferences, repositories, DbState};
use crate::errors::{AppError, AppResult};

#[tauri::command]
pub async fn list_recent_repos(state: State<'_, DbState>) -> AppResult<Vec<repositories::RecentRepo>> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Db(e.to_string()))?;
    repositories::list(&conn)
}

#[tauri::command]
pub async fn add_recent_repo(
    state: State<'_, DbState>,
    path: String,
    name: String,
) -> AppResult<()> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Db(e.to_string()))?;
    repositories::upsert(&conn, &path, &name)
}

#[tauri::command]
pub async fn remove_recent_repo(state: State<'_, DbState>, path: String) -> AppResult<()> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Db(e.to_string()))?;
    repositories::remove(&conn, &path)
}

#[tauri::command]
pub async fn get_pref(state: State<'_, DbState>, key: String) -> AppResult<Option<String>> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Db(e.to_string()))?;
    preferences::get(&conn, &key)
}

#[tauri::command]
pub async fn set_pref(state: State<'_, DbState>, key: String, value: String) -> AppResult<()> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| AppError::Db(e.to_string()))?;
    preferences::set(&conn, &key, &value)
}
