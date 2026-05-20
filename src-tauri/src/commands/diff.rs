use crate::errors::AppResult;
use crate::git::cli::GitCommand;
use crate::git::types::FileDiff;

#[tauri::command]
pub async fn get_file_diff(
    repo_path: String,
    file_path: String,
    staged: bool,
) -> AppResult<FileDiff> {
    let git = GitCommand::new(&repo_path)?;

    // Try the standard diff first.
    let args: Vec<&str> = if staged {
        vec!["diff", "--cached", "--no-color", "--", &file_path]
    } else {
        vec!["diff", "--no-color", "--", &file_path]
    };

    let diff_text = git.run(&args).unwrap_or_default();

    // If empty and unstaged, the file might be untracked; show its contents as a synthetic diff.
    let (diff_text, is_binary) = if diff_text.trim().is_empty() && !staged {
        let ls = git.run(&["ls-files", "--", &file_path]).unwrap_or_default();
        if ls.trim().is_empty() {
            let bytes = std::fs::read(format!("{repo_path}/{file_path}")).unwrap_or_default();
            let is_binary = bytes.iter().take(8192).any(|b| *b == 0);
            if is_binary {
                ("<binary file>".to_string(), true)
            } else {
                let text = String::from_utf8_lossy(&bytes);
                let rendered: String = text
                    .lines()
                    .map(|l| format!("+{l}\n"))
                    .collect::<String>();
                (rendered, false)
            }
        } else {
            (diff_text, false)
        }
    } else {
        (diff_text, false)
    };

    Ok(FileDiff {
        path: file_path,
        staged,
        diff: diff_text,
        is_binary,
    })
}
