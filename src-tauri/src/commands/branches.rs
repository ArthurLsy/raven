use std::collections::HashSet;

use crate::errors::AppResult;
use crate::git::cli::GitCommand;
use crate::git::parsers::parse_branches;
use crate::git::types::{
    BranchesBundle, EnrichedBranch, GitBranch, LastCommitInfo, TagInfo,
};

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

#[tauri::command]
pub async fn merge_branch(repo_path: String, branch: String) -> AppResult<String> {
    let git = GitCommand::new(&repo_path)?;
    git.run(&["merge", "--no-edit", &branch])
}

#[tauri::command]
pub async fn list_branches_enriched(repo_path: String) -> AppResult<BranchesBundle> {
    let git = GitCommand::new(&repo_path)?;

    // Detect default/base branch for "merged" comparison.
    let base = detect_base_branch(&git);

    // Merged local branches relative to base.
    let merged_set: HashSet<String> = git
        .run(&["branch", "--merged", &base])
        .unwrap_or_default()
        .lines()
        .map(|l| l.trim_start_matches(['*', ' ']).trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();

    // ── Local branches ────────────────────────────────────────────
    let local_out = git.run(&[
        "for-each-ref",
        "--format=%(refname:short)\x1f%(HEAD)\x1f%(upstream:short)\x1f%(objectname)\x1f%(objectname:short)\x1f%(authorname)\x1f%(committerdate:relative)\x1f%(contents:subject)",
        "refs/heads",
    ])?;
    let mut locals: Vec<EnrichedBranch> = local_out
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| {
            let parts: Vec<&str> = l.split('\x1f').collect();
            let name = parts.first().copied().unwrap_or("").to_string();
            let head = parts.get(1).copied().unwrap_or("");
            let upstream = parts.get(2).copied().unwrap_or("");
            let hash = parts.get(3).copied().unwrap_or("").to_string();
            let short = parts.get(4).copied().unwrap_or("").to_string();
            let author = parts.get(5).copied().unwrap_or("").to_string();
            let time = parts.get(6).copied().unwrap_or("").to_string();
            let subject = parts.get(7).copied().unwrap_or("").to_string();

            let (ahead, behind) = if !upstream.is_empty() {
                ahead_behind(&git, &name, upstream)
            } else {
                (0, 0)
            };

            // Stale: last commit > 60 days. Heuristic via `committerdate:unix`.
            let stale = is_stale(&git, &name, 60);

            EnrichedBranch {
                name: name.clone(),
                current: head.trim() == "*",
                upstream: if upstream.is_empty() {
                    None
                } else {
                    Some(upstream.to_string())
                },
                ahead,
                behind,
                last_commit: Some(LastCommitInfo {
                    hash,
                    short,
                    msg: subject,
                    author,
                    time,
                }),
                lane: 0,
                merged: merged_set.contains(&name) && name != base,
                stale,
            }
        })
        .collect();

    // Assign lane indexes deterministically by insertion order.
    for (i, b) in locals.iter_mut().enumerate() {
        b.lane = i as u32;
    }

    // ── Remote branches ───────────────────────────────────────────
    let remote_out = git.run(&[
        "for-each-ref",
        "--format=%(refname:short)\x1f%(objectname)\x1f%(objectname:short)\x1f%(authorname)\x1f%(committerdate:relative)\x1f%(contents:subject)",
        "refs/remotes",
    ])?;
    let mut remotes: Vec<EnrichedBranch> = remote_out
        .lines()
        .filter(|l| !l.trim().is_empty() && !l.contains("HEAD"))
        .map(|l| {
            let parts: Vec<&str> = l.split('\x1f').collect();
            let name = parts.first().copied().unwrap_or("").to_string();
            let hash = parts.get(1).copied().unwrap_or("").to_string();
            let short = parts.get(2).copied().unwrap_or("").to_string();
            let author = parts.get(3).copied().unwrap_or("").to_string();
            let time = parts.get(4).copied().unwrap_or("").to_string();
            let subject = parts.get(5).copied().unwrap_or("").to_string();
            EnrichedBranch {
                name: name.clone(),
                current: false,
                upstream: None,
                ahead: 0,
                behind: 0,
                last_commit: Some(LastCommitInfo {
                    hash,
                    short,
                    msg: subject,
                    author,
                    time,
                }),
                lane: 0,
                merged: false,
                stale: is_stale(&git, &name, 90),
            }
        })
        .collect();
    for (i, b) in remotes.iter_mut().enumerate() {
        b.lane = i as u32;
    }

    // ── Tags ──────────────────────────────────────────────────────
    let tag_out = git
        .run(&[
            "for-each-ref",
            "--sort=-creatordate",
            "--format=%(refname:short)\x1f%(objectname)\x1f%(objectname:short)\x1f%(creatordate:relative)",
            "refs/tags",
        ])
        .unwrap_or_default();
    let tags: Vec<TagInfo> = tag_out
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| {
            let parts: Vec<&str> = l.split('\x1f').collect();
            TagInfo {
                name: parts.first().copied().unwrap_or("").to_string(),
                hash: parts.get(1).copied().unwrap_or("").to_string(),
                short: parts.get(2).copied().unwrap_or("").to_string(),
                time: parts.get(3).copied().unwrap_or("").to_string(),
            }
        })
        .collect();

    Ok(BranchesBundle {
        local: locals,
        remote: remotes,
        tags,
    })
}

fn detect_base_branch(git: &GitCommand) -> String {
    // Prefer "main", fall back to "master", or current HEAD.
    if git.run(&["rev-parse", "--verify", "main"]).is_ok() {
        return "main".to_string();
    }
    if git.run(&["rev-parse", "--verify", "master"]).is_ok() {
        return "master".to_string();
    }
    git.run(&["rev-parse", "--abbrev-ref", "HEAD"])
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "HEAD".to_string())
}

fn ahead_behind(git: &GitCommand, branch: &str, upstream: &str) -> (u32, u32) {
    let arg = format!("{upstream}...{branch}");
    let out = git
        .run(&["rev-list", "--left-right", "--count", &arg])
        .unwrap_or_default();
    let mut sp = out.trim().split_whitespace();
    let behind: u32 = sp.next().unwrap_or("0").parse().unwrap_or(0);
    let ahead: u32 = sp.next().unwrap_or("0").parse().unwrap_or(0);
    (ahead, behind)
}

fn is_stale(git: &GitCommand, refname: &str, days: i64) -> bool {
    let out = git
        .run(&["log", "-1", "--format=%ct", refname])
        .unwrap_or_default();
    let ts: i64 = out.trim().parse().unwrap_or(0);
    if ts == 0 {
        return false;
    }
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    (now - ts) > days * 86_400
}
