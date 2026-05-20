use crate::errors::AppResult;
use crate::git::cli::GitCommand;

#[tauri::command]
pub async fn fetch(repo_path: String) -> AppResult<String> {
    let git = GitCommand::new(&repo_path)?;
    let out = git.run(&["fetch", "--prune"])?;
    Ok(out)
}

#[tauri::command]
pub async fn pull(repo_path: String) -> AppResult<String> {
    let git = GitCommand::new(&repo_path)?;
    let out = git.run(&["pull"])?;
    Ok(out)
}

#[tauri::command]
pub async fn push(repo_path: String) -> AppResult<String> {
    let git = GitCommand::new(&repo_path)?;
    let out = git.run(&["push"])?;
    Ok(out)
}
