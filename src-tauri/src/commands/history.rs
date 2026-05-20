use crate::errors::AppResult;
use crate::git::cli::GitCommand;
use crate::git::parsers::{
    assign_branch_colors, parse_commit_log, parse_graph_log, parse_name_status_numstat,
    parse_shortstat,
};
use crate::git::types::{CommitFile, CommitStats, CommitSummary, GraphCommit};

const LOG_FORMAT: &str =
    "--pretty=format:%H%x1f%h%x1f%an%x1f%ae%x1f%ad%x1f%P%x1f%D%x1f%s%x1f%b%x1e";
const GRAPH_FORMAT: &str = "--pretty=format:%H%x1f%h%x1f%P%x1f%D%x1f%an%x1f%ad%x1f%s%x1e";

#[tauri::command]
pub async fn get_commit_history(
    repo_path: String,
    limit: Option<u32>,
) -> AppResult<Vec<CommitSummary>> {
    let git = GitCommand::new(&repo_path)?;
    let n = limit.unwrap_or(100).to_string();
    let out = git.run(&["log", "--date=iso", LOG_FORMAT, "-n", &n])?;
    let mut commits = parse_commit_log(&out)?;

    // Per-commit stats via --shortstat (single call per commit is wasteful; instead use
    // `git log --shortstat` once and parse alongside).
    let stats_out = git.run(&[
        "log",
        "--shortstat",
        "--pretty=format:__SOC__%H",
        "-n",
        &n,
    ])?;
    let stats_map = parse_shortstats(&stats_out);
    for c in commits.iter_mut() {
        if let Some(s) = stats_map.get(&c.hash) {
            c.stats = s.clone();
        }
    }

    assign_branch_colors(&mut commits);
    Ok(commits)
}

#[tauri::command]
pub async fn get_graph(repo_path: String, limit: Option<u32>) -> AppResult<Vec<GraphCommit>> {
    let git = GitCommand::new(&repo_path)?;
    let n = limit.unwrap_or(300).to_string();
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

#[tauri::command]
pub async fn get_commit_files(
    repo_path: String,
    hash: String,
) -> AppResult<Vec<CommitFile>> {
    let git = GitCommand::new(&repo_path)?;
    let out = git.run(&[
        "show",
        "--no-color",
        "--name-status",
        "--numstat",
        "--pretty=format:",
        &hash,
    ])?;
    Ok(parse_name_status_numstat(&out))
}

fn parse_shortstats(input: &str) -> std::collections::HashMap<String, CommitStats> {
    let mut out: std::collections::HashMap<String, CommitStats> =
        std::collections::HashMap::new();
    let mut current: Option<String> = None;
    for line in input.lines() {
        let trimmed = line.trim();
        if let Some(hash) = trimmed.strip_prefix("__SOC__") {
            current = Some(hash.to_string());
        } else if !trimmed.is_empty() && trimmed.starts_with(|c: char| c.is_ascii_digit()) {
            if let Some(h) = &current {
                out.insert(h.clone(), parse_shortstat(trimmed));
            }
        }
    }
    out
}
