use crate::errors::{AppError, AppResult};
use crate::git::types::{
    CommitFile, CommitStats, CommitSummary, DiffLine, FileKind, GitBranch, GitFileStatus,
    GitStatus, GraphCommit, Hunk, LineKind,
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

/// Parse `git log --pretty=format:%H\x1f%h\x1f%an\x1f%ae\x1f%ad\x1f%P\x1f%D\x1f%s\x1f%b%x1e`.
///
/// The `%b` body field may contain newlines; the `%x1e` record separator handles that.
pub fn parse_commit_log(input: &str) -> AppResult<Vec<CommitSummary>> {
    let mut out = Vec::new();
    for record in input.split('\x1e') {
        let record = record.trim_matches(['\n', '\r']);
        if record.is_empty() {
            continue;
        }
        let parts: Vec<&str> = record.splitn(9, '\x1f').collect();
        if parts.len() < 9 {
            return Err(AppError::Parse(format!("bad log record: {record}")));
        }
        let parents: Vec<String> = if parts[5].trim().is_empty() {
            Vec::new()
        } else {
            parts[5].split_whitespace().map(|s| s.to_string()).collect()
        };
        let refs: Vec<String> = if parts[6].trim().is_empty() {
            Vec::new()
        } else {
            parts[6]
                .split(", ")
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        };
        out.push(CommitSummary {
            hash: parts[0].into(),
            short_hash: parts[1].into(),
            author_name: parts[2].into(),
            author_email: parts[3].into(),
            date: parts[4].into(),
            parents,
            refs,
            subject: parts[7].into(),
            body: parts[8].into(),
            stats: CommitStats { f: 0, a: 0, d: 0 },
            branch_color: 0,
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

/// Parse unified diff output (`git diff ...`) into structured hunks.
///
/// Captures each hunk's raw text so we can later re-emit a patch for `git apply --cached`.
pub fn parse_unified_diff(input: &str) -> Vec<Hunk> {
    let mut hunks: Vec<Hunk> = Vec::new();
    let mut iter = input.lines().peekable();

    // Skip preamble (diff --git, index, ---, +++) until first hunk header.
    while let Some(line) = iter.peek() {
        if line.starts_with("@@") {
            break;
        }
        iter.next();
    }

    while let Some(header) = iter.next() {
        if !header.starts_with("@@") {
            continue;
        }
        let (old_start, old_count, new_start, new_count) = parse_hunk_header(header);
        let mut lines: Vec<DiffLine> = Vec::new();
        let mut raw = String::with_capacity(256);
        raw.push_str(header);
        raw.push('\n');

        let mut o = old_start;
        let mut n = new_start;

        while let Some(line) = iter.peek() {
            if line.starts_with("@@") {
                break;
            }
            // Bail if we hit the next file header.
            if line.starts_with("diff --git") {
                break;
            }
            let line = iter.next().unwrap();
            raw.push_str(line);
            raw.push('\n');

            // git diff emits "\ No newline at end of file" — keep it in raw for round-trip.
            if line.starts_with('\\') {
                continue;
            }

            let first = line.chars().next().unwrap_or(' ');
            match first {
                '+' => {
                    lines.push(DiffLine {
                        t: LineKind::Add,
                        n1: None,
                        n2: Some(n),
                        s: line[1..].to_string(),
                    });
                    n += 1;
                }
                '-' => {
                    lines.push(DiffLine {
                        t: LineKind::Del,
                        n1: Some(o),
                        n2: None,
                        s: line[1..].to_string(),
                    });
                    o += 1;
                }
                ' ' | _ => {
                    lines.push(DiffLine {
                        t: LineKind::Ctx,
                        n1: Some(o),
                        n2: Some(n),
                        s: if line.is_empty() {
                            String::new()
                        } else {
                            line[1..].to_string()
                        },
                    });
                    o += 1;
                    n += 1;
                }
            }
        }

        hunks.push(Hunk {
            header: header.to_string(),
            old_start,
            old_count,
            new_start,
            new_count,
            raw_text: raw,
            lines,
        });
    }

    hunks
}

fn parse_hunk_header(h: &str) -> (u32, u32, u32, u32) {
    // "@@ -OLD_START[,OLD_COUNT] +NEW_START[,NEW_COUNT] @@ optional_section"
    let mut old_start = 0u32;
    let mut old_count = 1u32;
    let mut new_start = 0u32;
    let mut new_count = 1u32;

    if let Some(rest) = h.strip_prefix("@@") {
        let trimmed = rest.trim_start();
        let mut parts = trimmed.split_whitespace();
        if let Some(old) = parts.next() {
            if let Some(stripped) = old.strip_prefix('-') {
                let mut sp = stripped.split(',');
                if let Some(s) = sp.next() {
                    old_start = s.parse().unwrap_or(0);
                }
                if let Some(c) = sp.next() {
                    old_count = c.parse().unwrap_or(1);
                }
            }
        }
        if let Some(new) = parts.next() {
            if let Some(stripped) = new.strip_prefix('+') {
                let mut sp = stripped.split(',');
                if let Some(s) = sp.next() {
                    new_start = s.parse().unwrap_or(0);
                }
                if let Some(c) = sp.next() {
                    new_count = c.parse().unwrap_or(1);
                }
            }
        }
    }

    (old_start, old_count, new_start, new_count)
}

/// Parse the output of `git log --shortstat`.
/// Returns total (additions, deletions, files_changed) for the matched line.
pub fn parse_shortstat(line: &str) -> CommitStats {
    let mut s = CommitStats { f: 0, a: 0, d: 0 };
    for part in line.split(',') {
        let part = part.trim();
        let mut sp = part.splitn(2, ' ');
        let n: u32 = sp.next().unwrap_or("0").parse().unwrap_or(0);
        let label = sp.next().unwrap_or("");
        if label.starts_with("file") {
            s.f = n;
        } else if label.starts_with("insertion") {
            s.a = n;
        } else if label.starts_with("deletion") {
            s.d = n;
        }
    }
    s
}

/// Parse output of `git show --name-status --numstat` to get a list of files for a commit.
pub fn parse_name_status_numstat(input: &str) -> Vec<CommitFile> {
    // numstat lines: "<a>\t<d>\t<path>"
    // name-status: "<status>\t<path>"
    // git puts numstat first then name-status when both are requested.
    let mut a_d_by_path: std::collections::HashMap<String, (u32, u32)> =
        std::collections::HashMap::new();
    let mut status_by_path: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut order: Vec<String> = Vec::new();

    for line in input.lines() {
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() < 2 {
            continue;
        }
        // Detect numstat: first column numeric or "-"
        let is_numstat =
            parts[0].chars().all(|c| c.is_ascii_digit() || c == '-') && parts.len() >= 3;
        if is_numstat {
            let a: u32 = parts[0].parse().unwrap_or(0);
            let d: u32 = parts[1].parse().unwrap_or(0);
            let path = parts[parts.len() - 1].to_string();
            a_d_by_path.insert(path.clone(), (a, d));
            if !order.contains(&path) {
                order.push(path);
            }
        } else if parts[0].len() <= 4 {
            let status = parts[0].chars().next().unwrap_or('M').to_string();
            let path = parts[parts.len() - 1].to_string();
            status_by_path.insert(path.clone(), status);
            if !order.contains(&path) {
                order.push(path);
            }
        }
    }

    order
        .into_iter()
        .map(|path| {
            let (a, d) = a_d_by_path.get(&path).copied().unwrap_or((0, 0));
            let status = status_by_path
                .get(&path)
                .cloned()
                .unwrap_or_else(|| "M".to_string());
            CommitFile { path, status, a, d }
        })
        .collect()
}

/// Assign a "branch color" (lane index) to each commit via a greedy lane algorithm,
/// matching the frontend graph rendering. Mutates `commits` in place.
pub fn assign_branch_colors(commits: &mut [CommitSummary]) {
    // Each entry in `lanes` is "the hash this lane is waiting for".
    let mut lanes: Vec<Option<String>> = Vec::new();

    for c in commits.iter_mut() {
        // Find this commit's lane (existing reservation or first free slot).
        let mut lane = lanes.iter().position(|h| h.as_deref() == Some(&c.hash));
        if lane.is_none() {
            lane = lanes.iter().position(|h| h.is_none());
            if lane.is_none() {
                lanes.push(None);
                lane = Some(lanes.len() - 1);
            }
        }
        let lane_idx = lane.unwrap();
        c.branch_color = lane_idx as u32;

        // Clear this lane and place parents.
        lanes[lane_idx] = None;
        for (i, p) in c.parents.iter().enumerate() {
            if i == 0 {
                lanes[lane_idx] = Some(p.clone());
            } else {
                let mut plane = lanes.iter().position(|h| h.as_deref() == Some(p));
                if plane.is_none() {
                    plane = lanes.iter().position(|h| h.is_none());
                    if plane.is_none() {
                        lanes.push(None);
                        plane = Some(lanes.len() - 1);
                    }
                }
                let pi = plane.unwrap();
                lanes[pi] = Some(p.clone());
            }
        }

        // Trim trailing nulls so we don't bloat the lane count.
        while matches!(lanes.last(), Some(None)) {
            lanes.pop();
        }
    }
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
        let input = "h1\x1fh1s\x1fAlice\x1falice@x\x1f2026-01-01\x1fp1 p2\x1fHEAD -> main, origin/main\x1ffirst\x1fbody1\x1e\nh2\x1fh2s\x1fBob\x1fbob@x\x1f2026-01-02\x1f\x1f\x1fsecond\x1f\x1e\n";
        let commits = parse_commit_log(input).unwrap();
        assert_eq!(commits.len(), 2);
        assert_eq!(commits[0].author_name, "Alice");
        assert_eq!(commits[0].parents, vec!["p1".to_string(), "p2".to_string()]);
        assert_eq!(commits[0].refs.len(), 2);
        assert_eq!(commits[1].subject, "second");
        assert!(commits[1].parents.is_empty());
    }

    #[test]
    fn parses_hunk_header() {
        let (os, oc, ns, nc) = parse_hunk_header("@@ -1,8 +1,14 @@");
        assert_eq!((os, oc, ns, nc), (1, 8, 1, 14));
        let (os, oc, ns, nc) = parse_hunk_header("@@ -42 +42,3 @@");
        assert_eq!((os, oc, ns, nc), (42, 1, 42, 3));
    }

    #[test]
    fn parses_unified_diff() {
        let input = "diff --git a/foo b/foo\nindex 1..2 100644\n--- a/foo\n+++ b/foo\n@@ -1,3 +1,4 @@\n one\n-two\n+TWO\n+two-and-a-half\n three\n";
        let hunks = parse_unified_diff(input);
        assert_eq!(hunks.len(), 1);
        let h = &hunks[0];
        assert_eq!(h.old_start, 1);
        assert_eq!(h.new_count, 4);
        assert_eq!(h.lines.len(), 5);
        assert!(h.raw_text.starts_with("@@ -1,3 +1,4 @@"));
    }

    #[test]
    fn parses_shortstat_line() {
        let s = parse_shortstat(" 3 files changed, 47 insertions(+), 12 deletions(-)");
        assert_eq!(s.f, 3);
        assert_eq!(s.a, 47);
        assert_eq!(s.d, 12);
    }
}
