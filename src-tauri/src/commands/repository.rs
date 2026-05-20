use std::path::Path;

use tauri_plugin_dialog::DialogExt;

use crate::errors::{AppError, AppResult};
use crate::git::cli::{check_is_repo, GitCommand};
use crate::git::types::RepositoryInfo;

#[tauri::command]
pub async fn validate_repository(path: String) -> AppResult<RepositoryInfo> {
    let toplevel = check_is_repo(&path)?;
    let git = GitCommand::new(&toplevel)?;
    let branch_raw = git.run(&["rev-parse", "--abbrev-ref", "HEAD"]).ok();
    let current_branch = branch_raw
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty() && s != "HEAD");

    let name = Path::new(&toplevel)
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| toplevel.display().to_string());

    Ok(RepositoryInfo {
        path: path.clone(),
        root_path: toplevel.display().to_string(),
        name,
        current_branch,
    })
}

#[tauri::command]
pub async fn pick_repository(app: tauri::AppHandle) -> AppResult<Option<String>> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog().file().pick_folder(move |path| {
        let _ = tx.send(path);
    });
    let selected = rx
        .recv()
        .map_err(|e| AppError::InvalidArgument(e.to_string()))?;
    Ok(selected.map(|p| p.to_string()))
}
