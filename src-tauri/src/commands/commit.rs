use crate::errors::{AppError, AppResult};
use crate::git::cli::GitCommand;
use crate::git::types::CommitResult;

#[tauri::command]
pub async fn create_commit(repo_path: String, message: String) -> AppResult<CommitResult> {
    let trimmed = message.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidArgument(
            "commit message cannot be empty".into(),
        ));
    }

    let git = GitCommand::new(&repo_path)?;
    // Use stdin to safely handle multi-line and special characters.
    let summary = git.run_with_stdin(&["commit", "-F", "-"], &message)?;
    let hash = git
        .run(&["rev-parse", "HEAD"])
        .ok()
        .map(|s| s.trim().to_string());

    Ok(CommitResult {
        commit_hash: hash,
        summary: summary.trim().to_string(),
    })
}
