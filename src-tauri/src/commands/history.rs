use crate::errors::AppResult;
use crate::git::cli::GitCommand;
use crate::git::parsers::{parse_commit_log, parse_graph_log};
use crate::git::types::{CommitSummary, GraphCommit};

const LOG_FORMAT: &str = "--pretty=format:%H\x1f%h\x1f%an\x1f%ae\x1f%ad\x1f%s%x1e";
const GRAPH_FORMAT: &str = "--pretty=format:%H\x1f%h\x1f%P\x1f%D\x1f%an\x1f%ad\x1f%s%x1e";

#[tauri::command]
pub async fn get_commit_history(
    repo_path: String,
    limit: Option<u32>,
) -> AppResult<Vec<CommitSummary>> {
    let git = GitCommand::new(&repo_path)?;
    let n = limit.unwrap_or(100).to_string();
    let out = git.run(&["log", "--date=iso", LOG_FORMAT, "-n", &n])?;
    parse_commit_log(&out)
}

#[tauri::command]
pub async fn get_graph(repo_path: String, limit: Option<u32>) -> AppResult<Vec<GraphCommit>> {
    let git = GitCommand::new(&repo_path)?;
    let n = limit.unwrap_or(200).to_string();
    let out = git.run(&[
        "log",
        "--all",
        "--date=iso",
        "--decorate=short",
        GRAPH_FORMAT,
        "-n",
        &n,
    ])?;
    parse_graph_log(&out)
}
