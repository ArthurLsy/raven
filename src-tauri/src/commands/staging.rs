use crate::errors::AppResult;
use crate::git::cli::GitCommand;

#[tauri::command]
pub async fn stage_file(repo_path: String, file_path: String) -> AppResult<()> {
    let git = GitCommand::new(&repo_path)?;
    git.run(&["add", "--", &file_path])?;
    Ok(())
}

#[tauri::command]
pub async fn unstage_file(repo_path: String, file_path: String) -> AppResult<()> {
    let git = GitCommand::new(&repo_path)?;
    git.run(&["restore", "--staged", "--", &file_path])?;
    Ok(())
}

#[tauri::command]
pub async fn stage_all(repo_path: String) -> AppResult<()> {
    let git = GitCommand::new(&repo_path)?;
    git.run(&["add", "--all"])?;
    Ok(())
}

#[tauri::command]
pub async fn unstage_all(repo_path: String) -> AppResult<()> {
    let git = GitCommand::new(&repo_path)?;
    git.run(&["reset", "HEAD"])?;
    Ok(())
}

/// Discard local changes for a file. Caller must confirm before invoking.
#[tauri::command]
pub async fn discard_file(repo_path: String, file_path: String) -> AppResult<()> {
    let git = GitCommand::new(&repo_path)?;
    // If file is tracked, restore from HEAD; otherwise delete it.
    let ls = git.run(&["ls-files", "--", &file_path]).unwrap_or_default();
    if ls.trim().is_empty() {
        // Untracked — remove from working tree.
        let full = std::path::Path::new(&repo_path).join(&file_path);
        if full.is_file() {
            std::fs::remove_file(&full)?;
        }
    } else {
        git.run(&["restore", "--worktree", "--", &file_path])?;
    }
    Ok(())
}
