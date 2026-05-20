use crate::errors::AppResult;
use crate::git::cli::GitCommand;
use crate::git::parsers::parse_unified_diff;
use crate::git::types::FileDiff;

#[tauri::command]
pub async fn get_file_diff(
    repo_path: String,
    file_path: String,
    staged: bool,
) -> AppResult<FileDiff> {
    let git = GitCommand::new(&repo_path)?;

    let args: Vec<&str> = if staged {
        vec![
            "diff",
            "--cached",
            "--no-color",
            "--no-ext-diff",
            "--unified=3",
            "--",
            &file_path,
        ]
    } else {
        vec![
            "diff",
            "--no-color",
            "--no-ext-diff",
            "--unified=3",
            "--",
            &file_path,
        ]
    };

    let diff_text = git.run(&args).unwrap_or_default();

    // If empty and unstaged, the file might be untracked — synthesize an "all added" diff.
    let (diff_text, is_binary) = if diff_text.trim().is_empty() && !staged {
        let ls = git.run(&["ls-files", "--", &file_path]).unwrap_or_default();
        if ls.trim().is_empty() {
            let bytes = std::fs::read(format!("{repo_path}/{file_path}")).unwrap_or_default();
            let is_binary = bytes.iter().take(8192).any(|b| *b == 0);
            if is_binary {
                ("<binary file>".to_string(), true)
            } else {
                let text = String::from_utf8_lossy(&bytes);
                let total_lines = text.lines().count().max(1);
                let mut synth = String::new();
                synth.push_str(&format!("diff --git a/{file_path} b/{file_path}\n"));
                synth.push_str("new file mode 100644\n");
                synth.push_str("--- /dev/null\n");
                synth.push_str(&format!("+++ b/{file_path}\n"));
                synth.push_str(&format!("@@ -0,0 +1,{total_lines} @@\n"));
                for line in text.lines() {
                    synth.push('+');
                    synth.push_str(line);
                    synth.push('\n');
                }
                (synth, false)
            }
        } else {
            (diff_text, false)
        }
    } else {
        (diff_text, false)
    };

    let hunks = if is_binary {
        Vec::new()
    } else {
        parse_unified_diff(&diff_text)
    };

    let mut additions: u32 = 0;
    let mut deletions: u32 = 0;
    for h in &hunks {
        for l in &h.lines {
            match l.t {
                crate::git::types::LineKind::Add => additions += 1,
                crate::git::types::LineKind::Del => deletions += 1,
                crate::git::types::LineKind::Ctx => {}
            }
        }
    }

    Ok(FileDiff {
        path: file_path,
        staged,
        additions,
        deletions,
        is_binary,
        hunks,
    })
}
