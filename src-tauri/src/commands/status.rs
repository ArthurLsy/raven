use crate::errors::AppResult;
use crate::git::cli::GitCommand;
use crate::git::parsers::parse_porcelain_v2;
use crate::git::types::GitStatus;

#[tauri::command]
pub async fn get_status(repo_path: String) -> AppResult<GitStatus> {
    let git = GitCommand::new(&repo_path)?;
    let out = git.run(&["status", "--porcelain=v2", "--branch"])?;
    parse_porcelain_v2(&out)
}
