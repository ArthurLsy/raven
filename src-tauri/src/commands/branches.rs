use crate::errors::AppResult;
use crate::git::cli::GitCommand;
use crate::git::parsers::parse_branches;
use crate::git::types::GitBranch;

#[tauri::command]
pub async fn list_branches(repo_path: String) -> AppResult<Vec<GitBranch>> {
    let git = GitCommand::new(&repo_path)?;
    let out = git.run(&[
        "branch",
        "--format=%(refname:short)\x1f%(HEAD)\x1f%(upstream:short)",
    ])?;
    parse_branches(&out)
}

#[tauri::command]
pub async fn checkout_branch(repo_path: String, branch: String) -> AppResult<()> {
    let git = GitCommand::new(&repo_path)?;
    git.run(&["switch", &branch])?;
    Ok(())
}

#[tauri::command]
pub async fn create_branch(repo_path: String, branch: String) -> AppResult<()> {
    let git = GitCommand::new(&repo_path)?;
    git.run(&["switch", "-c", &branch])?;
    Ok(())
}
