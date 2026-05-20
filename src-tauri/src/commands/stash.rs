use crate::errors::AppResult;
use crate::git::cli::GitCommand;
use crate::git::types::{Stash, StashFile};

#[tauri::command]
pub async fn list_stashes(repo_path: String) -> AppResult<Vec<Stash>> {
    let git = GitCommand::new(&repo_path)?;
    let out = git
        .run(&[
            "stash",
            "list",
            "--format=%gd\x1f%gs\x1f%cr\x1f%H",
        ])
        .unwrap_or_default();

    let mut stashes: Vec<Stash> = Vec::new();
    for line in out.lines() {
        if line.trim().is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('\x1f').collect();
        if parts.len() < 4 {
            continue;
        }
        let id = parts[0].to_string();
        let subject = parts[1].to_string();
        let time = parts[2].to_string();

        // Subject looks like: "WIP on <branch>: <hash> <msg>" or "On <branch>: <msg>"
        let (branch, msg) = parse_stash_subject(&subject);

        let files = list_stash_files(&git, &id).unwrap_or_default();
        stashes.push(Stash {
            id,
            msg,
            branch,
            time,
            files,
        });
    }
    Ok(stashes)
}

#[tauri::command]
pub async fn stash_create(repo_path: String, message: Option<String>) -> AppResult<String> {
    let git = GitCommand::new(&repo_path)?;
    if let Some(m) = message.filter(|s| !s.trim().is_empty()) {
        git.run(&["stash", "push", "-m", &m])
    } else {
        git.run(&["stash", "push"])
    }
}

#[tauri::command]
pub async fn stash_pop(repo_path: String, id: String) -> AppResult<String> {
    let git = GitCommand::new(&repo_path)?;
    git.run(&["stash", "pop", &id])
}

#[tauri::command]
pub async fn stash_apply(repo_path: String, id: String) -> AppResult<String> {
    let git = GitCommand::new(&repo_path)?;
    git.run(&["stash", "apply", &id])
}

#[tauri::command]
pub async fn stash_drop(repo_path: String, id: String) -> AppResult<String> {
    let git = GitCommand::new(&repo_path)?;
    git.run(&["stash", "drop", &id])
}

fn parse_stash_subject(raw: &str) -> (String, String) {
    // "WIP on main: hash subject"
    if let Some(rest) = raw.strip_prefix("WIP on ") {
        if let Some((branch, msg)) = rest.split_once(": ") {
            // msg currently includes the parent hash. Strip the first space-separated token if it looks like a hash.
            let msg = match msg.split_once(' ') {
                Some((maybe_hash, tail))
                    if maybe_hash.len() >= 7
                        && maybe_hash.chars().all(|c| c.is_ascii_hexdigit()) =>
                {
                    tail.to_string()
                }
                _ => msg.to_string(),
            };
            return (branch.to_string(), msg);
        }
    }
    if let Some(rest) = raw.strip_prefix("On ") {
        if let Some((branch, msg)) = rest.split_once(": ") {
            return (branch.to_string(), msg.to_string());
        }
    }
    ("".to_string(), raw.to_string())
}

fn list_stash_files(git: &GitCommand, id: &str) -> AppResult<Vec<StashFile>> {
    // Combine numstat + name-status from stash show
    let out = git
        .run(&[
            "stash",
            "show",
            "--no-color",
            "--name-status",
            "--numstat",
            id,
        ])
        .unwrap_or_default();

    let mut files: std::collections::HashMap<String, StashFile> =
        std::collections::HashMap::new();
    let mut order: Vec<String> = Vec::new();

    for line in out.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() < 2 {
            continue;
        }
        let is_numstat =
            parts[0].chars().all(|c| c.is_ascii_digit() || c == '-') && parts.len() >= 3;
        if is_numstat {
            let a: u32 = parts[0].parse().unwrap_or(0);
            let d: u32 = parts[1].parse().unwrap_or(0);
            let path = parts[parts.len() - 1].to_string();
            files
                .entry(path.clone())
                .and_modify(|f| {
                    f.a = a;
                    f.d = d;
                })
                .or_insert(StashFile {
                    path: path.clone(),
                    status: "M".into(),
                    a,
                    d,
                });
            if !order.contains(&path) {
                order.push(path);
            }
        } else {
            let status = parts[0].chars().next().unwrap_or('M').to_string();
            let path = parts[parts.len() - 1].to_string();
            files
                .entry(path.clone())
                .and_modify(|f| f.status = status.clone())
                .or_insert(StashFile {
                    path: path.clone(),
                    status,
                    a: 0,
                    d: 0,
                });
            if !order.contains(&path) {
                order.push(path);
            }
        }
    }
    Ok(order
        .into_iter()
        .filter_map(|p| files.remove(&p))
        .collect())
}
