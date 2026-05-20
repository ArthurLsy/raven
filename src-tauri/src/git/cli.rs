use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use crate::errors::{AppError, AppResult};

pub struct GitCommand {
    pub repo_path: PathBuf,
}

impl GitCommand {
    pub fn new<P: AsRef<Path>>(repo_path: P) -> AppResult<Self> {
        let p = repo_path.as_ref();
        if !p.exists() {
            return Err(AppError::InvalidPath(p.display().to_string()));
        }
        Ok(Self {
            repo_path: p.to_path_buf(),
        })
    }

    /// Run a git command and return stdout as UTF-8 string.
    /// Arguments are passed as an array — never concatenated as a shell string.
    pub fn run(&self, args: &[&str]) -> AppResult<String> {
        let output = Command::new("git")
            .current_dir(&self.repo_path)
            .args(args)
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return Err(AppError::GitFailed {
                exit_code: output.status.code().unwrap_or(-1),
                stderr,
            });
        }
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    }

    /// Run with stdin (used for commit messages via `git commit -F -`).
    pub fn run_with_stdin(&self, args: &[&str], stdin_data: &str) -> AppResult<String> {
        let mut child = Command::new("git")
            .current_dir(&self.repo_path)
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(stdin_data.as_bytes())?;
        }

        let output = child.wait_with_output()?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return Err(AppError::GitFailed {
                exit_code: output.status.code().unwrap_or(-1),
                stderr,
            });
        }
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    }
}

/// Verify a path is a valid git working tree. Returns the toplevel path.
pub fn check_is_repo<P: AsRef<Path>>(path: P) -> AppResult<PathBuf> {
    let p = path.as_ref();
    if !p.exists() {
        return Err(AppError::InvalidPath(p.display().to_string()));
    }
    let git = GitCommand::new(p)?;
    match git.run(&["rev-parse", "--is-inside-work-tree"]) {
        Ok(s) if s.trim() == "true" => {}
        _ => return Err(AppError::NotARepo(p.display().to_string())),
    }
    let toplevel = git.run(&["rev-parse", "--show-toplevel"])?;
    Ok(PathBuf::from(toplevel.trim()))
}
