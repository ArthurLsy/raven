use serde::{Serialize, Serializer};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("git command failed (exit {exit_code}): {stderr}")]
    GitFailed { exit_code: i32, stderr: String },

    #[error("not a git repository: {0}")]
    NotARepo(String),

    #[error("invalid path: {0}")]
    InvalidPath(String),

    #[error("invalid argument: {0}")]
    InvalidArgument(String),

    #[error("database error: {0}")]
    Db(String),

    #[error("parse error: {0}")]
    Parse(String),
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::Db(err.to_string())
    }
}

impl From<tauri::Error> for AppError {
    fn from(err: tauri::Error) -> Self {
        AppError::InvalidArgument(err.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut state = s.serialize_struct("AppError", 3)?;
        let (kind, message, extra) = match self {
            AppError::Io(e) => ("io", e.to_string(), None),
            AppError::GitFailed { exit_code, stderr } => {
                ("git_failed", stderr.clone(), Some(*exit_code))
            }
            AppError::NotARepo(p) => ("not_a_repo", p.clone(), None),
            AppError::InvalidPath(p) => ("invalid_path", p.clone(), None),
            AppError::InvalidArgument(m) => ("invalid_argument", m.clone(), None),
            AppError::Db(m) => ("db", m.clone(), None),
            AppError::Parse(m) => ("parse", m.clone(), None),
        };
        state.serialize_field("kind", kind)?;
        state.serialize_field("message", &message)?;
        state.serialize_field("exitCode", &extra)?;
        state.end()
    }
}

pub type AppResult<T> = Result<T, AppError>;
