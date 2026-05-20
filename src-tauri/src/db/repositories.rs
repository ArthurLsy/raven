use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use crate::errors::AppResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentRepo {
    pub id: i64,
    pub path: String,
    pub name: String,
    pub last_opened_at: String,
}

pub fn list(conn: &Connection) -> AppResult<Vec<RecentRepo>> {
    let mut stmt = conn.prepare(
        "SELECT id, path, name, last_opened_at FROM repositories ORDER BY last_opened_at DESC LIMIT 50",
    )?;
    let rows = stmt
        .query_map([], |row| {
            Ok(RecentRepo {
                id: row.get(0)?,
                path: row.get(1)?,
                name: row.get(2)?,
                last_opened_at: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn upsert(conn: &Connection, path: &str, name: &str) -> AppResult<()> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO repositories (path, name, last_opened_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(path) DO UPDATE SET name = excluded.name, last_opened_at = excluded.last_opened_at",
        params![path, name, now],
    )?;
    Ok(())
}

pub fn remove(conn: &Connection, path: &str) -> AppResult<()> {
    conn.execute("DELETE FROM repositories WHERE path = ?1", params![path])?;
    Ok(())
}
