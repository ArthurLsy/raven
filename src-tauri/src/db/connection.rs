use std::path::Path;

use rusqlite::Connection;

use crate::errors::AppResult;

const MIGRATIONS: &[&str] = &[
    "CREATE TABLE IF NOT EXISTS repositories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        last_opened_at TEXT NOT NULL
    );",
    "CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );",
];

pub fn open<P: AsRef<Path>>(path: P) -> AppResult<Connection> {
    let conn = Connection::open(path.as_ref())?;
    conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")?;
    for sql in MIGRATIONS {
        conn.execute_batch(sql)?;
    }
    Ok(conn)
}
