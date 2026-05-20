use crate::errors::{AppError, AppResult};
use crate::git::types::{
    CommitSummary, FileKind, GitBranch, GitFileStatus, GitStatus, GraphCommit,
};

/// Parse the output of `git status --porcelain=v2 --branch`.
///
/// Format reference: https://git-scm.com/docs/git-status#_porcelain_format_version_2
pub fn parse_porcelain_v2(input: &str) -> AppResult<GitStatus> {
    let mut branch: Option<String> = None;
    let mut upstream: Option<String> = None;
    let mut ahead: u32 = 0;
    let mut behind: u32 = 0;
    let mut files: Vec<GitFileStatus> = Vec::new();

    for line in input.lines() {
        if line.is_empty() {
            continue;
        }

        if let Some(rest) = line.strip_prefix("# branch.") {
            // "head <name>", "upstream <ref>", "ab +N -M"
            if let Some(name) = rest.strip_prefix("head ") {
                if name != "(detached)" {
                    branch = Some(name.to_string());
                }
            } else if let Some(up) = rest.strip_prefix("upstream ") {
                upstream = Some(up.to_string());
            } else if let Some(ab) = rest.strip_prefix("ab ") {
                let mut parts = ab.split_whitespace();
                if let Some(a) = parts.next() {
                    ahead = a.trim_start_matches('+').parse().unwrap_or(0);
                }
                if let Some(b) = parts.next() {
                    behind = b.trim_start_matches('-').parse().unwrap_or(0);
                }
            }
            continue;
        }

        // Skip non-tracking header lines we don't use.
        if line.starts_with('#') {
            continue;
        }

        let first = line.chars().next().unwrap_or(' ');
        match first {
            // Ordinary changed entry: "1 XY sub mH mI mW hH hI path"
            '1' => {
                let parts: Vec<&str> = line.splitn(9, ' ').collect();
                if parts.len() < 9 {
                    continue;
                }
                let xy = parts[1];
                let path = parts[8].to_string();
                files.push(file_from_xy(&path, None, xy));
            }
            // Renamed or copied: "2 XY sub mH mI mW hH hI X<score> path\ttab orig"
            '2' => {
                let parts: Vec<&str> = line.splitn(10, ' ').collect();
                if parts.len() < 10 {
                    continue;
                }
                let xy = parts[1];
                let path_pair = parts[9];
                // "<new>\t<orig>"
                let mut split = path_pair.splitn(2, '\t');
                let new_path = split.next().unwrap_or("").to_string();
                let original = split.next().map(|s| s.to_string());
                files.push(file_from_xy(&new_path, original, xy));
            }
            // Unmerged: "u XY sub m1 m2 m3 mW h1 h2 h3 path"
            'u' => {
                let parts: Vec<&str> = line.splitn(11, ' ').collect();
                if parts.len() < 11 {
                    continue;
                }
                let xy = parts[1];
                let path = parts[10].to_string();
                let mut f = file_from_xy(&path, None, xy);
                f.kind = FileKind::Conflicted;
                f.conflicted = true;
                f.staged = false;
                files.push(f);
            }
            // Untracked: "? path"
            '?' => {
                let path = line[2..].to_string();
                files.push(GitFileStatus {
                    path,
                    original_path: None,
                    index_status: "?".into(),
                    worktree_status: "?".into(),
                    kind: FileKind::Untracked,
                    staged: false,
                    conflicted: false,
                });
            }
            // Ignored: "! path" — skipped.
            '!' => {}
            _ => {}
        }
    }

    Ok(GitStatus {
        branch,
        upstream,
        ahead,
        behind,
        files,
    })
}

fn file_from_xy(path: &str, original: Option<String>, xy: &str) -> GitFileStatus {
    let chars: Vec<char> = xy.chars().collect();
    let x = chars.first().copied().unwrap_or('.');
    let y = chars.get(1).copied().unwrap_or('.');

    let staged = x != '.' && x != '?' && x != ' ';
    let kind = if x == 'R' || y == 'R' {
        FileKind::Renamed
    } else if x == 'C' || y == 'C' {
        FileKind::Copied
    } else if x == 'A' || y == 'A' {
        FileKind::Added
    } else if x == 'D' || y == 'D' {
        FileKind::Deleted
    } else if x == 'T' || y == 'T' {
        FileKind::TypeChange
    } else {
        FileKind::Modified
    };

    GitFileStatus {
        path: path.to_string(),
        original_path: original,
        index_status: x.to_string(),
        worktree_status: y.to_string(),
        kind,
        staged,
        conflicted: false,
    }
}

/// Parse `git log --pretty=format:%H\x1f%h\x1f%an\x1f%ae\x1f%ad\x1f%s%x1e`.
pub fn parse_commit_log(input: &str) -> AppResult<Vec<CommitSummary>> {
    let mut out = Vec::new();
    for record in input.split('\x1e') {
        let record = record.trim_matches(['\n', '\r']);
        if record.is_empty() {
            continue;
        }
        let parts: Vec<&str> = record.split('\x1f').collect();
        if parts.len() < 6 {
            return Err(AppError::Parse(format!("bad log record: {record}")));
        }
        out.push(CommitSummary {
            hash: parts[0].into(),
            short_hash: parts[1].into(),
            author_name: parts[2].into(),
            author_email: parts[3].into(),
            date: parts[4].into(),
            subject: parts[5].into(),
        });
    }
    Ok(out)
}

/// Parse `git log --pretty=format:%H\x1f%h\x1f%P\x1f%D\x1f%an\x1f%ad\x1f%s%x1e`.
pub fn parse_graph_log(input: &str) -> AppResult<Vec<GraphCommit>> {
    let mut out = Vec::new();
    for record in input.split('\x1e') {
        let record = record.trim_matches(['\n', '\r']);
        if record.is_empty() {
            continue;
        }
        let parts: Vec<&str> = record.split('\x1f').collect();
        if parts.len() < 7 {
            return Err(AppError::Parse(format!("bad graph record: {record}")));
        }
        let parents: Vec<String> = if parts[2].trim().is_empty() {
            Vec::new()
        } else {
            parts[2].split_whitespace().map(|s| s.to_string()).collect()
        };
        let refs: Vec<String> = if parts[3].trim().is_empty() {
            Vec::new()
        } else {
            parts[3]
                .split(", ")
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        };
        out.push(GraphCommit {
            hash: parts[0].into(),
            short_hash: parts[1].into(),
            parents,
            refs,
            author_name: parts[4].into(),
            date: parts[5].into(),
            subject: parts[6].into(),
        });
    }
    Ok(out)
}

/// Parse `git branch --format=%(refname:short)\x1f%(HEAD)\x1f%(upstream:short)`.
pub fn parse_branches(input: &str) -> AppResult<Vec<GitBranch>> {
    let mut out = Vec::new();
    for line in input.lines() {
        if line.trim().is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('\x1f').collect();
        if parts.len() < 3 {
            continue;
        }
        let name = parts[0].trim().to_string();
        let current = parts[1].trim() == "*";
        let upstream = if parts[2].trim().is_empty() {
            None
        } else {
            Some(parts[2].trim().to_string())
        };
        out.push(GitBranch {
            name,
            current,
            upstream,
        });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_porcelain_branch_header() {
        let input = "# branch.head main\n# branch.upstream origin/main\n# branch.ab +2 -1\n";
        let r = parse_porcelain_v2(input).unwrap();
        assert_eq!(r.branch.as_deref(), Some("main"));
        assert_eq!(r.upstream.as_deref(), Some("origin/main"));
        assert_eq!(r.ahead, 2);
        assert_eq!(r.behind, 1);
    }

    #[test]
    fn parses_modified_and_untracked() {
        let input = "1 .M N... 100644 100644 100644 abc abc src/foo.rs\n? src/new.rs\n";
        let r = parse_porcelain_v2(input).unwrap();
        assert_eq!(r.files.len(), 2);
        assert_eq!(r.files[0].path, "src/foo.rs");
        assert_eq!(r.files[0].kind, FileKind::Modified);
        assert_eq!(r.files[1].kind, FileKind::Untracked);
    }

    #[test]
    fn parses_log_records() {
        let input = "h1\x1fh1s\x1fAlice\x1falice@x\x1f2026-01-01\x1ffirst\x1e\nh2\x1fh2s\x1fBob\x1fbob@x\x1f2026-01-02\x1fsecond\x1e\n";
        let commits = parse_commit_log(input).unwrap();
        assert_eq!(commits.len(), 2);
        assert_eq!(commits[0].author_name, "Alice");
        assert_eq!(commits[1].subject, "second");
    }
}
